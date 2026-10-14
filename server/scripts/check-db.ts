import { disconnectDatabase, getDatabase } from '../src/database.js';

try {
  const result = await getDatabase().$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  if (result[0]?.database !== 'help-desk') throw new Error('The configured connection does not target the help-desk database.');
  console.log('Connected to PostgreSQL database: help-desk');
} catch {
  console.error('Database connection failed. Verify DATABASE_URL, credentials, and PostgreSQL availability.');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
