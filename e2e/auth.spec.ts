import { admin, expect, signIn, test } from './fixtures';

for (const path of ['/', '/users']) {
  test(`signed-out visitors to ${path} are sent to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  });
}

test('login validates required fields and malformed email before submitting', async ({ page }) => {
  const submissions: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/auth/sign-in/email')) submissions.push(request.url());
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Email address is required.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password is required.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Email address').fill('invalid-email');
  await page.getByLabel('Password', { exact: true }).fill('a-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  expect(submissions).toEqual([]);
});

test('password visibility can be toggled without submitting the form', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('sample-password');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('sample-password');
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(page).toHaveURL('/login');
});

test('incorrect credentials show an error and allow a successful retry', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The email or password is incorrect. Please try again.');
  await expect(page).toHaveURL('/login');

  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(`Signed in as ${admin.email}`, { exact: true })).toBeVisible();
});

test('remember-me can be disabled and creates a browser-session cookie', async ({ page, context }) => {
  await page.goto('/login');
  const rememberMe = page.getByRole('checkbox', { name: 'Keep me signed in' });
  await expect(rememberMe).toBeChecked();
  await rememberMe.uncheck();
  await expect(rememberMe).not.toBeChecked();
  await page.getByLabel('Email address').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
  const sessionCookie = (await context.cookies()).find(cookie => cookie.name.endsWith('session_token'));
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie!.expires).toBe(-1);
});

test('admin session survives reload, redirects away from login, and accesses Users directly', async ({ page, context }) => {
  await signIn(page);
  const sessionCookie = (await context.cookies()).find(cookie => cookie.name.endsWith('session_token'));
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie!.expires).toBeGreaterThan(Date.now() / 1000);
  await page.reload();
  await expect(page.getByText(`Signed in as ${admin.email}`, { exact: true })).toBeVisible();
  await page.goto('/login');
  await expect(page).toHaveURL('/');
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});

test('shared navigation works between Home and Users, and logout ends the session', async ({ page }) => {
  await signIn(page);
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page).toHaveURL('/users');
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await navigation.getByRole('link', { name: 'HD Help Desk', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeVisible();
  await navigation.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page).toHaveURL('/users');
  await navigation.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL('/login');
  const session = await page.request.get('/api/auth/get-session');
  await expect(session).toBeOK();
  expect(await session.json()).toBeNull();
  await page.goto('/users');
  await expect(page).toHaveURL('/login');
});

test('agent can sign in but cannot see or directly access Users', async ({ page, agent }) => {
  await signIn(page, agent);
  await expect(page.getByText(`Signed in as ${agent.email}`, { exact: true })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link', { name: 'Users', exact: true })).toBeHidden();
  await page.goto('/users');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /^Welcome back,/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
});

test('failed logout keeps Users available and offers a working retry', async ({ page }) => {
  await signIn(page);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await page.route('**/api/auth/sign-out', route => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Temporary test failure' }),
  }));
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to log out. Please try again.');
  await expect(page).toHaveURL('/users');
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await page.unroute('**/api/auth/sign-out');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL('/login');
});

test('session errors block protected content and retry recovers the real session', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/auth/get-session**', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Temporary test failure' }),
  }));
  await page.goto('/users');
  await expect(page.getByText('Unable to load your session. Please check your connection.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await page.unroute('**/api/auth/get-session**');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
});
