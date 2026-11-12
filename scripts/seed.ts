import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_CATEGORIES } from '../lib/default-categories';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Test account: las credenciales vienen del entorno, nunca del código.
  const testEmail = process.env.SEED_TEST_EMAIL;
  const testPassword = process.env.SEED_TEST_PASSWORD;
  if (!testEmail || !testPassword) {
    console.log('SEED_TEST_EMAIL / SEED_TEST_PASSWORD no definidos: no se crea cuenta de prueba.');
    return;
  }
  const testPw = await bcrypt.hash(testPassword, 12);
  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: {},
    create: { email: testEmail, password: testPw, name: 'Admin' },
  });

  // 2. App settings for the test account only (each user gets their own on demand)
  const existingSettings = await prisma.appSettings.findFirst({ where: { userId: testUser.id } });
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: { dolarUSD: 1510, dolarAuto: true, userId: testUser.id },
    });
  }

  // 3. Default editable categories for the TEST account (scoped by user).
  //    Real users get their own copy of these on signup (see /api/signup).
  for (const c of DEFAULT_CATEGORIES) {
    const exists = await prisma.category.findFirst({ where: { userId: testUser.id, name: c.name } });
    if (!exists) {
      await prisma.category.create({ data: { name: c.name, color: c.color, icon: c.icon, userId: testUser.id } });
    }
  }

  console.log('Seed complete! (sin datos personales pre-cargados)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
