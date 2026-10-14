import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { getDatabase, disconnectDatabase } from '../src/database.js';

const db = getDatabase();
const email = `auth-smoke-${randomUUID()}@example.com`;
const password = randomUUID();
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}/api/auth`;
const post = (path: string, body: object, cookie = '') => fetch(`${base}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'http://localhost:5173', cookie },
  body: JSON.stringify(body),
});
const cookieFrom = (response: Response) => {
  const cookies = response.headers.getSetCookie();
  assert(cookies.length > 0, 'Expected auth cookie');
  return cookies.map(cookie => cookie.split(';')[0]).join('; ');
};

try {
  const signup = await post('/sign-up/email', { name: 'Auth smoke test', email, password });
  assert.equal(signup.status, 200, await signup.clone().text());
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const account = await db.account.findFirstOrThrow({ where: { userId: user.id } });
  assert(account.password && account.password !== password, 'Password must be hashed');
  const signupCookie = cookieFrom(signup);
  assert.equal((await post('/sign-out', {}, signupCookie)).status, 200);
  const badLogin = await post('/sign-in/email', { email, password: randomUUID() });
  assert.equal(badLogin.status, 401);
  const signin = await post('/sign-in/email', { email, password });
  assert.equal(signin.status, 200, await signin.clone().text());
  const cookie = cookieFrom(signin);
  assert.equal(await db.session.count({ where: { userId: user.id } }), 1);
  const session = await fetch(`${base}/get-session`, { headers: { cookie } });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.id, user.id);
  assert.equal((await post('/sign-out', {}, cookie)).status, 200);
  assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
  const revoked = await fetch(`${base}/get-session`, { headers: { cookie } });
  assert.equal(await revoked.json(), null);
  console.log('Auth smoke passed: sign-up, password hashing, invalid password, sign-in, DB session, session retrieval, sign-out, revoked cookie.');
} finally {
  await db.user.deleteMany({ where: { email } });
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await disconnectDatabase();
}
