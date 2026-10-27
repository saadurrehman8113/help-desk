import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import pg from 'pg';

export type Credentials = { email: string; password: string };
type TestUser = Credentials & {
  id: string;
  setRole(role: 'admin' | 'agent'): Promise<void>;
  expireSessions(): Promise<void>;
  revokeSessions(): Promise<void>;
  deleteUser(): Promise<void>;
  removeCredential(): Promise<void>;
  clearPassword(): Promise<void>;
  credentialIsHashed(): Promise<boolean>;
  sessionCount(): Promise<number>;
  userExists(): Promise<boolean>;
};

// The Playwright config loads these test-only values before starting workers.
export const admin: Credentials = {
  email: process.env.ADMIN_EMAIL!,
  password: process.env.ADMIN_PASSWORD!,
};

export async function signIn(page: Page, credentials: Credentials = admin) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeVisible();
}

export const test = base.extend<{ agent: Credentials; testUser: TestUser }>({
  agent: async ({ testUser }, use) => {
    await use(testUser);
  },
  testUser: async ({}, use) => {
    // Guard this fixture independently: never use the development DATABASE_URL.
    const connectionString = process.env.TEST_DATABASE_URL;
    if (!connectionString) throw new Error('TEST_DATABASE_URL is required.');
    const database = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(database.protocol)
      || decodeURIComponent(database.pathname.slice(1)) !== 'help-desk-test') {
      throw new Error('Agent fixtures must use the help-desk-test database.');
    }

    const id = randomUUID();
    const email = `agent-${id}@example.test`;
    const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
    let connected = false;
    try {
      await client.connect();
      connected = true;
      // Reuse the seeded test password hash without changing any existing users.
      // The CTE creates both records atomically, only if the seed account exists.
      const result = await client.query(`
        WITH seed_account AS (
          SELECT a.password FROM account a JOIN "user" u ON u.id = a."userId"
          WHERE u.email = $1 AND a."providerId" = 'credential' LIMIT 1
        ), new_user AS (
          INSERT INTO "user" (id, name, email, role, "createdAt", "updatedAt")
          SELECT $2, 'E2E Agent', $3, 'agent', NOW(), NOW() FROM seed_account
          RETURNING id
        )
        INSERT INTO account
          (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        SELECT $4, new_user.id, 'credential', new_user.id, seed_account.password, NOW(), NOW()
        FROM new_user CROSS JOIN seed_account
      `, [admin.email, id, email, randomUUID()]);
      expect(result.rowCount, 'The seeded admin must have a credential account').toBe(1);
      const execute = async (query: string) => { await client.query(query, [id]); };
      await use({
        id,
        email,
        password: admin.password,
        async setRole(role) {
          await client.query('UPDATE "user" SET role = $2, "updatedAt" = NOW() WHERE id = $1', [id, role]);
        },
        async expireSessions() {
          // Prisma reads TIMESTAMP WITHOUT TIME ZONE as UTC. NOW() uses the
          // PostgreSQL session timezone, so casting it here can leave a fixture
          // several hours in the future. Use a deterministic UTC past instant.
          const result = await client.query(
            'UPDATE session SET "expiresAt" = $2::timestamp WHERE "userId" = $1',
            [id, new Date(0).toISOString()],
          );
          expect(result.rowCount, 'An existing fixture session must be expired').toBeGreaterThan(0);
        },
        revokeSessions: () => execute('DELETE FROM session WHERE "userId" = $1'),
        deleteUser: () => execute('DELETE FROM "user" WHERE id = $1'),
        removeCredential: () => execute('DELETE FROM account WHERE "userId" = $1'),
        clearPassword: () => execute('UPDATE account SET password = NULL WHERE "userId" = $1'),
        async credentialIsHashed() {
          const stored = await client.query('SELECT password FROM account WHERE "userId" = $1', [id]);
          const hash = stored.rows[0]?.password;
          return typeof hash === 'string' && hash.length > 0 && hash !== admin.password;
        },
        async sessionCount() {
          const result = await client.query('SELECT COUNT(*)::int AS count FROM session WHERE "userId" = $1', [id]);
          return result.rows[0].count;
        },
        async userExists() {
          const result = await client.query('SELECT 1 FROM "user" WHERE email = $1', [email]);
          return result.rowCount === 1;
        },
      });
    } finally {
      // Cascades remove this fixture's accounts and sessions as well.
      try {
        if (connected) await client.query('DELETE FROM "user" WHERE id = $1 OR email = $2', [id, email]);
      } finally {
        await client.end();
      }
    }
  },
});

export { expect };
