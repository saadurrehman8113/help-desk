import './config.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

let client: PrismaClient | undefined;

export function getDatabase(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required. Configure server/.env.');
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
  });
  return client;
}

export async function disconnectDatabase(): Promise<void> {
  await client?.$disconnect();
}
