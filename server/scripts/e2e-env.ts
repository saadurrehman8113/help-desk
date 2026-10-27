import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../.env.e2e', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

// Never fall back to the application's DATABASE_URL.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('Set TEST_DATABASE_URL in .env.e2e (see .env.e2e.example).');
}
const database = new URL(connectionString);
const databaseName = decodeURIComponent(database.pathname.slice(1));
if (!['postgres:', 'postgresql:'].includes(database.protocol) || databaseName !== 'help-desk-test') {
  throw new Error('TEST_DATABASE_URL must target the PostgreSQL database help-desk-test.');
}

export const e2eEnv = {
  DATABASE_URL: connectionString,
  NODE_ENV: 'test',
  PORT: '3100',
  BETTER_AUTH_URL: 'http://localhost:3100',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:5174',
  BETTER_AUTH_SECRET: 'help-desk-e2e-only-secret-at-least-32-characters',
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD: 'HelpDesk-e2e-password-123!',
};

Object.assign(process.env, e2eEnv);
