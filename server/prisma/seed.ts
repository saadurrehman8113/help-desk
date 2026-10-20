import '../src/config.js';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { getDatabase, disconnectDatabase } from '../src/database.js';
import { Role } from '../src/generated/prisma/enums.js';

async function seed() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in server/.env');

  const passwordHash = await hashPassword(password);
  await getDatabase().$transaction(async tx => {
    const user = await tx.user.upsert({
      where: { email },
      create: { id: randomUUID(), email, name: 'Admin', role: Role.admin },
      update: { role: Role.admin },
    });
    const account = await tx.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });
    if (account) {
      await tx.account.update({ where: { id: account.id }, data: { password: passwordHash } });
    } else {
      await tx.account.create({ data: {
        id: randomUUID(), userId: user.id, accountId: user.id,
        providerId: 'credential', password: passwordHash,
      } });
    }
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  console.log('Admin user seeded successfully.');
}

try {
  await seed();
} catch {
  console.error('Admin seed failed. Check ADMIN_EMAIL, ADMIN_PASSWORD, and database configuration.');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
