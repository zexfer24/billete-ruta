import { prisma } from "@/lib/prisma";
import { getFakeProvider } from "@/modules/messaging";
import { resetAllLoginRates } from "@/modules/auth";

/** Vacía todas las tablas de negocio antes de cada test. */
export async function resetDatabase(): Promise<void> {
  const tablas = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
      AND tablename NOT LIKE 'pgboss%'
  `;
  if (tablas.length === 0) return;
  const lista = tablas.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
  getFakeProvider().reset();
  resetAllLoginRates();
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
