import type { APIRequestContext } from '@playwright/test';
import { admin, expect, test, type Credentials } from './fixtures';

const headers = { Origin: 'http://localhost:5174' };
const login = (request: APIRequestContext, credentials: Credentials, extra = {}) =>
  request.post('/api/auth/sign-in/email', { headers, data: { ...credentials, ...extra } });

async function expectSignedOut(request: APIRequestContext) {
  const response = await request.get('/api/auth/get-session');
  expect(response.status()).toBe(200);
  expect(await response.json()).toBeNull();
}

function containsCredentialFields(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    /password|passwordHash|accessToken|refreshToken|idToken/i.test(key)
    || containsCredentialFields(child));
}

test('anonymous session requests return null and user updates require authentication', async ({ request }) => {
  await expectSignedOut(request);
  const update = await request.post('/api/auth/update-user', { headers, data: { name: 'Unauthorized' } });
  expect(update.status()).toBe(401);
  await expectSignedOut(request);
});

for (const [label, data] of [
  ['missing email', { password: admin.password }],
  ['missing password', { email: admin.email }],
  ['null email', { email: null, password: admin.password }],
  ['non-string password', { email: admin.email, password: 123 }],
  ['invalid rememberMe type', { ...admin, rememberMe: 'false' }],
  ['malformed email', { email: 'invalid-email', password: admin.password }],
  ['empty email', { email: '', password: admin.password }],
  ['array body', []],
] as const) {
  test(`sign-in rejects ${label} without issuing a session`, async ({ request }) => {
    const response = await request.post('/api/auth/sign-in/email', { headers, data });
    expect(response.status()).toBe(400);
    await expectSignedOut(request);
  });
}

test('sign-in rejects malformed JSON without issuing a session', async ({ request }) => {
  const response = await request.post('/api/auth/sign-in/email', {
    headers: { ...headers, 'Content-Type': 'application/json' }, data: '{"email":',
  });
  expect(response.status()).toBe(400);
  await expectSignedOut(request);
});

test('unknown users and wrong passwords return the same generic authentication error', async ({ request, testUser }) => {
  const unknown = await login(request, { email: `missing-${testUser.email}`, password: testUser.password });
  const wrong = await login(request, { email: testUser.email, password: 'incorrect-password' });
  expect(unknown.status()).toBe(401);
  expect(wrong.status()).toBe(401);
  const unknownBody = await unknown.json();
  const wrongBody = await wrong.json();
  expect(unknownBody.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  expect(wrongBody.code).toBe(unknownBody.code);
  expect(wrongBody.message).toBe(unknownBody.message);
  expect(await testUser.sessionCount()).toBe(0);
  await expectSignedOut(request);
});

for (const passwordCase of ['empty', 'short', 'whitespace', 'case changed', 'too long'] as const) {
  test(`sign-in rejects ${passwordCase} passwords without persisting a session`, async ({ request, testUser }) => {
    const passwords = {
      empty: '', short: 'x', whitespace: ` ${testUser.password} `,
      'case changed': testUser.password.toUpperCase(), 'too long': 'x'.repeat(129),
    };
    const response = await login(request, { email: testUser.email, password: passwords[passwordCase] });
    expect(response.status()).toBe(passwordCase === 'too long' ? 400 : 401);
    if (passwordCase === 'too long') expect((await response.json()).code).toBe('PASSWORD_TOO_LONG');
    expect(await testUser.sessionCount()).toBe(0);
    await expectSignedOut(request);
  });
}

for (const credentialState of ['missing account', 'missing password'] as const) {
  test(`a user with ${credentialState} receives a generic credential error`, async ({ request, testUser }) => {
    if (credentialState === 'missing account') await testUser.removeCredential();
    else await testUser.clearPassword();
    const response = await login(request, testUser);
    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(await testUser.sessionCount()).toBe(0);
    await expectSignedOut(request);
  });
}

test('public signup stays disabled and cannot create or promote a user', async ({ request, testUser }) => {
  await testUser.deleteUser();
  const response = await request.post('/api/auth/sign-up/email', {
    headers, data: { name: 'Uninvited user', email: testUser.email, password: testUser.password, role: 'admin' },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
  expect(await testUser.userExists()).toBe(false);
  await expectSignedOut(request);
});

test('real sign-in persists a hashed credential and session without returning credential secrets', async ({ request, testUser }) => {
  expect(await testUser.credentialIsHashed(), 'The fixture credential must store a hash').toBe(true);
  const response = await login(request, { email: testUser.email.toUpperCase(), password: testUser.password });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.user.id).toBe(testUser.id);
  expect(body.user.email).toBe(testUser.email);
  expect(body.user.role).toBe('agent');
  expect(containsCredentialFields(body), 'Sign-in must not expose password/account secrets').toBe(false);
  expect(await testUser.sessionCount()).toBe(1);
  const session = await request.get('/api/auth/get-session');
  expect(session.status()).toBe(200);
  const sessionBody = await session.json();
  expect(sessionBody.user.id).toBe(testUser.id);
  expect(sessionBody.session.userId).toBe(testUser.id);
  expect(Date.parse(sessionBody.session.expiresAt)).toBeGreaterThan(Date.now());
  expect(containsCredentialFields(sessionBody), 'Session must not expose password/account secrets').toBe(false);
});

test('role supplied during sign-in cannot promote an agent', async ({ request, testUser }) => {
  const response = await login(request, testUser, { role: 'admin', user: { role: 'admin' } });
  expect(response.status()).toBe(200);
  expect((await response.json()).user.role).toBe('agent');
  expect((await (await request.get('/api/auth/get-session')).json()).user.role).toBe('agent');
});

test('authenticated user input cannot change the server-owned role', async ({ request, testUser }) => {
  expect((await login(request, testUser)).status()).toBe(200);
  const update = await request.post('/api/auth/update-user', { headers, data: { role: 'admin' } });
  expect(update.status()).toBe(400);
  expect((await (await request.get('/api/auth/get-session')).json()).user.role).toBe('agent');
});

test('logout revokes its database session and replayed cookie while preserving another session', async ({ request, playwright, baseURL, testUser }) => {
  const other = await playwright.request.newContext({ baseURL });
  const replay = await playwright.request.newContext({ baseURL });
  try {
    expect((await login(request, testUser)).status()).toBe(200);
    expect((await login(other, testUser)).status()).toBe(200);
    expect(await testUser.sessionCount()).toBe(2);
    const original = (await request.storageState()).cookies.find(cookie => cookie.name.endsWith('session_token'));
    expect(Boolean(original), 'A signed session cookie must be issued').toBe(true);
    const logout = await request.post('/api/auth/sign-out', { headers, data: {} });
    expect(logout.status()).toBe(200);
    expect((await logout.json()).success).toBe(true);
    expect(await testUser.sessionCount()).toBe(1);
    await expectSignedOut(request);
    const replayed = await replay.get('/api/auth/get-session', { headers: { Cookie: `${original!.name}=${original!.value}` } });
    expect(await replayed.json(), 'A revoked cookie must not restore authentication').toBeNull();
    const otherSession = await other.get('/api/auth/get-session');
    expect((await otherSession.json()).user.id).toBe(testUser.id);
  } finally {
    await other.dispose();
    await replay.dispose();
  }
});

test('logout is safe to repeat when already signed out', async ({ request }) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request.post('/api/auth/sign-out', { headers, data: {} });
    expect(response.status()).toBe(200);
    expect((await response.json()).success).toBe(true);
    await expectSignedOut(request);
  }
});

test('GET cannot perform logout or revoke an existing session', async ({ request, testUser }) => {
  expect((await login(request, testUser)).status()).toBe(200);
  const response = await request.get('/api/auth/sign-out');
  expect(response.ok()).toBe(false);
  expect(await testUser.sessionCount()).toBe(1);
  expect((await (await request.get('/api/auth/get-session')).json()).user.id).toBe(testUser.id);
});
