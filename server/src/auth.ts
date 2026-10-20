import './config.js';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getDatabase } from './database.js';
import { Role } from './generated/prisma/enums.js';

export const auth = betterAuth({
  database: prismaAdapter(getDatabase(), { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: { type: [Role.admin, Role.agent], required: true, defaultValue: Role.agent, input: false },
    },
  },
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
});
