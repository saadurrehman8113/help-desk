import './e2e-env.js';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const require = createRequire(import.meta.url);
const serverDirectory = fileURLToPath(new URL('../', import.meta.url));
const maintenanceUrl = new URL(process.env.DATABASE_URL!);
maintenanceUrl.pathname = '/postgres';
maintenanceUrl.searchParams.delete('schema');
const client = new pg.Client({ connectionString: maintenanceUrl.href, connectionTimeoutMillis: 5000 });

try {
  await client.connect();
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', ['help-desk-test']);
  if (!result.rowCount) {
    await client.query('CREATE DATABASE "help-desk-test"');
    console.log('Created help-desk-test database.');
  }
} finally {
  await client.end();
}

// Use Node directly so this also works on Windows without shell quoting.
for (const args of [['generate'], ['migrate', 'deploy'], ['db', 'seed']]) {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
    cwd: serverDirectory,
    env: process.env,
    stdio: 'inherit',
  });
}
