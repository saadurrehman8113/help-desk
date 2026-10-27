import type { Page, Route } from '@playwright/test';
import { admin, expect, signIn, test, type Credentials } from './fixtures';

async function fillLogin(page: Page, credentials: Credentials = admin) {
  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
}

async function pauseNextRequest(page: Page, pattern: string): Promise<{ received: Promise<Route> }> {
  let receive!: (route: Route) => void;
  const received = new Promise<Route>(resolve => { receive = resolve; });
  await page.route(pattern, route => { receive(route); }, { times: 1 });
  return { received };
}

test('validation focuses the first invalid field and clears when corrected', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Email address')).toBeFocused();
  await page.getByLabel('Email address').fill(admin.email);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByText('Email address is required.', { exact: true })).toBeHidden();
  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('whitespace-only email is required and cannot reach sign-in', async ({ page }) => {
  let submissions = 0;
  page.on('request', request => { if (request.url().includes('/api/auth/sign-in/email')) submissions++; });
  await page.goto('/login');
  await fillLogin(page, { email: '   ', password: admin.password });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Email address is required.', { exact: true })).toBeVisible();
  expect(submissions).toBe(0);
});

test('email whitespace and case normalize successfully through keyboard submission', async ({ page, testUser }) => {
  await page.goto('/login');
  await fillLogin(page, { email: `  ${testUser.email.toUpperCase()}  `, password: testUser.password });
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/');
  await expect(page.getByText(`Signed in as ${testUser.email}`, { exact: true })).toBeVisible();
});

test('password whitespace is preserved instead of silently accepting a different password', async ({ page, testUser }) => {
  await page.goto('/login');
  await fillLogin(page, { email: testUser.email, password: ` ${testUser.password} ` });
  const request = page.waitForRequest('**/api/auth/sign-in/email');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const submitted = (await request).postDataJSON();
  expect(submitted.password === ` ${testUser.password} `, 'Password whitespace must be preserved').toBe(true);
  await expect(page.getByRole('alert')).toContainText('The email or password is incorrect. Please try again.');
  expect(await testUser.sessionCount()).toBe(0);
});

test('pending sign-in disables editable controls and prevents duplicate keyboard submissions', async ({ page, testUser }) => {
  await page.goto('/login');
  await fillLogin(page, testUser);
  let submissions = 0;
  page.on('request', request => { if (request.url().includes('/api/auth/sign-in/email')) submissions++; });
  const { received } = await pauseNextRequest(page, '**/api/auth/sign-in/email');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const route = await received;
  try {
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    await expect(page.getByLabel('Email address')).toBeDisabled();
    await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
    await expect(page.getByRole('checkbox', { name: 'Keep me signed in' })).toBeDisabled();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    expect(submissions).toBe(1);
  } finally {
    await route.continue();
  }
  await expect(page).toHaveURL('/');
  expect(await testUser.sessionCount()).toBe(1);
});

// These intercept responses to exercise UI mapping; the production limiter is not running in NODE_ENV=test.
for (const [status, message] of [
  [400, 'The email or password is incorrect. Please try again.'],
  [429, 'Too many attempts. Please wait before trying again.'],
  [500, 'Unable to sign in. Please try again in a moment.'],
] as const) {
  test(`HTTP ${status} sign-in errors recover on retry without exposing server details`, async ({ page, testUser }) => {
    await page.goto('/login');
    await fillLogin(page, testUser);
    await page.route('**/api/auth/sign-in/email', route => route.fulfill({
      status, contentType: 'application/json',
      body: JSON.stringify({ code: 'TEST_FAILURE', message: 'internal diagnostic that must not be shown' }),
    }));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByText('internal diagnostic that must not be shown')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await expect(page.getByLabel('Email address')).toBeEnabled();
    await expect(page.getByLabel('Password', { exact: true })).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: 'Keep me signed in' })).toBeEnabled();
    expect(await testUser.sessionCount()).toBe(0);
    await page.unroute('**/api/auth/sign-in/email');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL('/');
  });
}

test('a network failure leaves login usable and a later real request succeeds', async ({ page, testUser }) => {
  await page.goto('/login');
  await fillLogin(page, testUser);
  await page.route('**/api/auth/sign-in/email', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  expect(await testUser.sessionCount()).toBe(0);
  await page.unroute('**/api/auth/sign-in/email');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
});

for (const path of ['/login', '/', '/users']) {
  test(`pending session checks block ${path} content until the real response arrives`, async ({ page, testUser }) => {
    if (path !== '/login') {
      await testUser.setRole('admin');
      const response = await page.request.post('/api/auth/sign-in/email', {
        data: { email: testUser.email, password: testUser.password },
      });
      expect(response.status()).toBe(200);
    }
    const { received } = await pauseNextRequest(page, '**/api/auth/get-session**');
    await page.goto(path);
    const route = await received;
    try {
      await expect(page.getByText('Loading your workspace...', { exact: true })).toBeVisible();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
      await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeHidden();
    } finally {
      await route.continue();
    }
    const heading = path === '/login' ? 'Sign in to your workspace' : path === '/users' ? 'Users' : /^Welcome back,/;
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  });
}

test('a failed guest session check hides login and retry returns to the signed-out form', async ({ page }) => {
  await page.route('**/api/auth/get-session**', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Test outage' }),
  }));
  await page.goto('/login');
  await expect(page.getByText('Unable to load your session. Please check your connection.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeHidden();
  await expect(page).toHaveURL('/login');
  await page.unroute('**/api/auth/get-session**');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
});

test('a failed session check on login does not expose a form for an authenticated user', async ({ page, testUser }) => {
  await signIn(page, testUser);
  await page.route('**/api/auth/get-session**', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Test outage' }),
  }));
  await page.goto('/login');
  await expect(page.getByText('Unable to load your session. Please check your connection.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await page.unroute('**/api/auth/get-session**');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeVisible();
});

for (const sessionState of ['expired', 'revoked', 'deleted user'] as const) {
  test(`a ${sessionState} session cannot restore protected content`, async ({ page, testUser }) => {
    await testUser.setRole('admin');
    await signIn(page, testUser);
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
    if (sessionState === 'expired') await testUser.expireSessions();
    else if (sessionState === 'revoked') await testUser.revokeSessions();
    else await testUser.deleteUser();
    await page.reload();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
    const response = await page.request.get('/api/auth/get-session');
    expect(await response.json()).toBeNull();
    expect(await testUser.sessionCount()).toBe(0);
  });
}

test('server-side role changes affect an existing session without another login', async ({ page, testUser }) => {
  await signIn(page, testUser);
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeHidden();
  await testUser.setRole('admin');
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await testUser.setRole('agent');
  await page.reload();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
});

for (const roleState of ['missing', 'unknown'] as const) {
  test(`a ${roleState} session role fails closed for the admin route`, async ({ page, testUser }) => {
    await signIn(page, testUser);
    const response = await page.request.get('/api/auth/get-session');
    const session = await response.json();
    // PostgreSQL's enum cannot store these values; only the defensive client guard is mocked.
    if (roleState === 'missing') delete session.user.role;
    else session.user.role = 'superadmin';
    await page.route('**/api/auth/get-session**', route => route.fulfill({ json: session }));
    await page.goto('/users');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
  });
}

test('tampering with a signed session cookie cannot authenticate the browser', async ({ page, context, testUser }) => {
  await signIn(page, testUser);
  const cookie = (await context.cookies()).find(value => value.name.endsWith('session_token'));
  expect(Boolean(cookie), 'A signed session cookie must be issued').toBe(true);
  const tampered = `${cookie!.value[0] === 'a' ? 'b' : 'a'}${cookie!.value.slice(1)}`;
  await context.addCookies([{ ...cookie!, value: tampered }]);
  await page.goto('/');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  expect(await (await page.request.get('/api/auth/get-session')).json()).toBeNull();
});

test('session cookies are HttpOnly, SameSite Lax, and absent from rendered page content', async ({ page, context, testUser }) => {
  await signIn(page, testUser);
  const cookie = (await context.cookies()).find(value => value.name.endsWith('session_token'));
  expect(Boolean(cookie), 'A session cookie must be issued').toBe(true);
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.sameSite).toBe('Lax');
  expect(cookie!.path).toBe('/');
  expect((await page.evaluate(() => document.cookie)).includes(cookie!.name), 'Script must not read the session cookie').toBe(false);
  expect((await page.locator('body').innerText()).includes(cookie!.value), 'Rendered content must not expose the cookie').toBe(false);
});

test('pending logout prevents duplicate requests then removes protected content', async ({ page, testUser }) => {
  await signIn(page, testUser);
  let submissions = 0;
  page.on('request', request => { if (request.url().includes('/api/auth/sign-out')) submissions++; });
  const { received } = await pauseNextRequest(page, '**/api/auth/sign-out');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  const route = await received;
  try {
    await expect(page.getByRole('button', { name: 'Logging out...' })).toBeDisabled();
    await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    expect(submissions).toBe(1);
  } finally {
    await route.continue();
  }
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  expect(await testUser.sessionCount()).toBe(0);
});

test('back and forward navigation after logout cannot restore authenticated screens', async ({ page, testUser }) => {
  await testUser.setRole('admin');
  await signIn(page, testUser);
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page).toHaveURL('/users');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await page.goBack();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await page.goForward();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
});
