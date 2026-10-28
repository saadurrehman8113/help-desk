import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import { auth } from '../src/auth.js';

let server: Server;
let baseUrl: string;
before(async () => {
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('users endpoint enforces authorization before listing', async () => {
  const session = mock.method(auth.api, 'getSession', async () => null);
  try {
    assert.equal((await fetch(`${baseUrl}/api/users`)).status, 401);
    session.mock.mockImplementation(async () => ({ user: { role: 'agent' } }) as never);
    assert.equal((await fetch(`${baseUrl}/api/users`)).status, 403);
  } finally { mock.restoreAll(); }
});

test('users endpoint validates pages and returns safe database failures', async () => {
  mock.method(auth.api, 'getSession', async () => ({ user: { role: 'admin' } }) as never);
  const originalUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const logger = mock.method(console, 'error', () => {});
  try {
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=', 'page=1&page=2', 'page=9999999999999999999999']) {
      assert.equal((await fetch(`${baseUrl}/api/users?${query}`)).status, 400, query);
    }
    assert.equal(logger.mock.callCount(), 0);
    const response = await fetch(`${baseUrl}/api/users`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Internal server error' });
    assert.equal(logger.mock.callCount(), 1);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    mock.restoreAll();
  }
});
