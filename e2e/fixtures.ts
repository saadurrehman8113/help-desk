import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import pg from 'pg';

type Credentials = { email: string; password: string };

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

export const test = base.extend<{ agent: Credentials }>({
  agent: async ({}, use) => {
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
    try {
      await client.connect();
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
      await use({ email, password: admin.password });
    } finally {
      // Cascades remove this fixture's accounts and sessions as well.
      try {
        await client.query('DELETE FROM "user" WHERE id = $1', [id]);
      } finally {
        await client.end();
      }
    }
  },
});

export { expect };
