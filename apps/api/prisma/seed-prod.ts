/*
 * Production seed — safe to run repeatedly, never deletes anything.
 * Creates/updates the admin and the teacher accounts from env vars and the achievement/quest catalogue.
 *
 *   ADMIN_EMAIL, ADMIN_PASSWORD            (required)
 *   TEACHER_EMAIL, TEACHER_PASSWORD        (optional — Sədaqət Ağayeva's account)
 *   TEACHER_NAME                           (optional, default "Sədaqət Ağayeva")
 *
 *   npm run seed:prod
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ACHIEVEMENTS, QUESTS } from './catalog';

const prisma = new PrismaClient();

function strong(pw: string | undefined, name: string): string {
  if (!pw || pw.length < 10) throw new Error(`${name} must be set and at least 10 characters long`);
  return pw;
}

async function upsertUser(email: string, password: string, name: string, role: 'ADMIN' | 'TEACHER') {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role, passwordHash, tokenVersion: { increment: 1 } },
    create: { email: email.toLowerCase(), name, role, passwordHash },
  });
  console.log(`✓ ${role.toLowerCase()} ${user.email}`);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error('ADMIN_EMAIL must be set');
  await upsertUser(adminEmail, strong(process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD'), 'Admin', 'ADMIN');

  if (process.env.TEACHER_EMAIL) {
    await upsertUser(
      process.env.TEACHER_EMAIL,
      strong(process.env.TEACHER_PASSWORD, 'TEACHER_PASSWORD'),
      process.env.TEACHER_NAME || 'Sədaqət Ağayeva',
      'TEACHER',
    );
  }

  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({ where: { code: a.code }, update: {}, create: a });
  }
  for (const q of QUESTS) {
    const exists = await prisma.quest.findFirst({ where: { title: q.title } });
    if (!exists) await prisma.quest.create({ data: q });
  }
  console.log(`✓ ${ACHIEVEMENTS.length} achievements, ${QUESTS.length} quests`);
}

main()
  .catch((e) => {
    console.error('✗', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
