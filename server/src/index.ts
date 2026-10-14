import { app } from './app.js';
import { disconnectDatabase, getDatabase } from './database.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');

try {
  await getDatabase().$connect();
} catch {
  console.error('Cannot connect to PostgreSQL. Check DATABASE_URL in server/.env and database availability.');
  await disconnectDatabase();
  process.exit(1);
}

const server = app.listen(port, () => console.log(`Help Desk API listening on http://localhost:${port}`));
server.on('error', error => { console.error(error); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => { void disconnectDatabase().then(() => process.exit(0), () => process.exit(1)); });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
