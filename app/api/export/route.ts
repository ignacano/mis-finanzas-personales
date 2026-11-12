export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;
  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'json';
  try {
    const [expenses, goals, investments, crypto, inventory, vehicles, settings] = await Promise.all([
      prisma.expense.findMany({ where: { userId }, include: { category: true } }),
      prisma.savingGoal.findMany({ where: { userId } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.cryptoHolding.findMany({ where: { userId } }),
      prisma.inventoryItem.findMany({ where: { userId } }),
      prisma.vehicle.findMany({ where: { userId } }),
      prisma.appSettings.findFirst({ where: { userId } }),
    ]);
    const data = { expenses, goals, investments, crypto, inventory, vehicles, settings };
    if (format === 'csv') {
      const rows = expenses.map((e: any) => [
        e.name, e.category?.name ?? '', e.amountARS, e.amountUSD, e.date, e.status, e.periodicity, e.paymentMethod ?? '', e.entity ?? '', e.notes ?? '',
      ].join(','));
      const csv = 'Nombre,Categoría,MontoARS,MontoUSD,Fecha,Estado,Periodicidad,MétodoPago,Entidad,Notas\n' + rows.join('\n');
      return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=finanzas.csv' } });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error exportando datos' }, { status: 500 });
  }
}
