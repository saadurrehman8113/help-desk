import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';

let server: Server;
let baseUrl: string;
before(async () => {
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('health endpoint confirms API availability', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'help-desk-api' });
  assert.equal(response.headers.get('x-powered-by'), null);
});
test('unknown API routes return JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'API route not found' });
});
test('malformed JSON returns a safe 400 response', async () => {
  const response = await fetch(`${baseUrl}/api/health`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON body' });
});
