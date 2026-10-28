import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Route } from '@playwright/test';
import pg from 'pg';
import { admin, expect, signIn, test, type Credentials } from './fixtures';

const login = async (request: APIRequestContext, credentials: Credentials = admin) => {
  const response = await request.post('/api/auth/sign-in/email', {
    headers: { Origin: 'http://localhost:5174' }, data: credentials,
  });
  expect(response.status()).toBe(200);
};

type ListedUser = { id: string; name: string; email: string; role: 'admin' | 'agent'; createdAt: string };
const sampleUser: ListedUser = {
  id: 'sample-user', name: 'Alex Agent', email: 'alex@example.test', role: 'agent',
  createdAt: '2026-10-20T12:00:00.000Z',
};
const result = (users: ListedUser[], page = 1, total = users.length) => ({ users, page, pageSize: 20, total });

test('users API rejects anonymous and agent requests', async ({ request, testUser }) => {
  expect((await request.get('/api/users')).status()).toBe(401);
  await login(request, testUser);
  expect((await request.get('/api/users')).status()).toBe(403);
});

test('users API rechecks role and session on every request', async ({ request, testUser }) => {
  await testUser.setRole('admin');
  await login(request, testUser);
  expect((await request.get('/api/users')).status()).toBe(200);
  await testUser.setRole('agent');
  expect((await request.get('/api/users')).status()).toBe(403);
  await testUser.expireSessions();
  expect((await request.get('/api/users')).status()).toBe(401);
});

test('users API validates page values', async ({ request }) => {
  await login(request);
  for (const page of ['0', '-1', '1.5', 'abc', '', '1e2', '9007199254740992', '1&page=2']) {
    const response = await request.get(`/api/users?page=${page}`);
    expect(response.status(), `page=${page}`).toBe(400);
  }
});

test('users API paginates in deterministic order and exposes only list fields', async ({ request }) => {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString || decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== 'help-desk-test') {
    throw new Error('User list fixtures require the help-desk-test database.');
  }
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  const ids = Array.from({ length: 22 }, () => randomUUID());
  await client.connect();
  try {
    await client.query(`INSERT INTO "user" (id, name, email, role, "createdAt", "updatedAt")
      SELECT id, 'List fixture', id || '@example.test', 'agent', '2050-01-01'::timestamp, '2050-01-01'::timestamp
      FROM unnest($1::text[]) AS id`, [ids]);
    const expected = await client.query('SELECT id FROM "user" ORDER BY "createdAt" DESC, id ASC');
    await login(request);
    const firstResponse = await request.get('/api/users');
    expect(firstResponse.status()).toBe(200);
    const first = await firstResponse.json();
    expect(first.page).toBe(1);
    expect(first.pageSize).toBe(20);
    expect(first.total).toBe(expected.rowCount);
    expect(first.users.map((user: ListedUser) => user.id)).toEqual(expected.rows.slice(0, 20).map(user => user.id));
    for (const user of first.users) {
      expect(Object.keys(user).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'role']);
      expect(Number.isNaN(Date.parse(user.createdAt))).toBe(false);
    }
    const second = await (await request.get('/api/users?page=2')).json();
    expect(second.page).toBe(2);
    expect(second.users.map((user: ListedUser) => user.id)).toEqual(expected.rows.slice(20, 40).map(user => user.id));
    const beyondPage = Math.ceil(first.total / 20) + 1;
    const beyond = await request.get(`/api/users?page=${beyondPage}`);
    expect(beyond.status()).toBe(200);
    expect(await beyond.json()).toEqual(result([], beyondPage, first.total));
  } finally {
    await client.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [ids]);
    await client.end();
  }
});

test('admin sees the real users table with their own account', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  for (const name of ['Name', 'Email', 'Role', 'Created']) {
    await expect(table.getByRole('columnheader', { name, exact: true })).toBeVisible();
  }
  await expect(table.getByText(admin.email, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
});

test('users pagination disables controls while loading and shows the next page', async ({ page }) => {
  await signIn(page);
  let receive!: (route: Route) => void;
  const pending = new Promise<Route>(resolve => { receive = resolve; });
  await page.route('**/api/users?*', async route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'));
    if (pageNumber === 2) receive(route);
    else await route.fulfill({ json: result([sampleUser], 1, 21) });
  });
  await page.goto('/users');
  await expect(page.getByRole('cell', { name: sampleUser.email, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const route = await pending;
  try {
    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  } finally {
    await route.fulfill({ json: result([{ ...sampleUser, id: 'second', name: 'Second User', email: 'second@example.test' }], 2, 21) });
  }
  await expect(page.getByRole('cell', { name: 'second@example.test', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.getByRole('cell', { name: sampleUser.email, exact: true })).toBeVisible();
});

test('users list reports empty results', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/users?*', route => route.fulfill({ json: result([]) }));
  await page.goto('/users');
  await expect(page.getByText(/No users/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
});

test('users list retries a failed request', async ({ page }) => {
  await signIn(page);
  let recovered = false;
  await page.route('**/api/users?*', route => {
    return !recovered
      ? route.fulfill({ status: 500, json: { error: 'Internal server error' } })
      : route.fulfill({ json: result([sampleUser]) });
  });
  await page.goto('/users');
  await expect(page.getByRole('alert')).toBeVisible();
  recovered = true;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('cell', { name: sampleUser.email, exact: true })).toBeVisible();
});

for (const status of [401, 403]) {
  test(`users list clears data and redirects on ${status}`, async ({ page }) => {
    await signIn(page);
    await page.route('**/api/users?*', async route => {
      if (new URL(route.request().url()).searchParams.get('page') === '1') {
        await route.fulfill({ json: result([sampleUser], 1, 21) });
        return;
      }
      if (status === 401) {
        await page.route('**/api/auth/get-session*', sessionRoute => sessionRoute.fulfill({ json: null }));
      }
      await route.fulfill({ status, json: { error: 'Unauthorized' } });
    });
    await page.goto('/users');
    await expect(page.getByRole('cell', { name: sampleUser.email, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(status === 401 ? '/login' : '/');
    await expect(page.getByRole('table')).toBeHidden();
  });
}
