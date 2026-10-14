import './config.js';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getDatabase } from './database.js';

export const auth = betterAuth({
  database: prismaAdapter(getDatabase(), { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ['http://localhost:5173'],
});
