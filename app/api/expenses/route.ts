export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDolarUSD } from '@/lib/dolar';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;
  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  const categoryId = url.searchParams.get('categoryId');
  const status = url.searchParams.get('status');
  const where: any = { userId };
  if (month) {
    const [y, m] = month.split('-').map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  const expenses = await prisma.expense.findMany({ where, include: { category: true, vehicle: true }, orderBy: { date: 'desc' } });
  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;
  try {
    const body = await req.json();

    // Gasto en cuotas: genera N filas mensuales agrupadas.
    if (body.periodicity === 'cuotas' || body.installments) {
      const n = Math.max(1, Math.floor(Number(body.totalCuotas) || 1));
      const total = Number(body.totalAmount) || 0;
      const perARS = Math.round((total / n) * 100) / 100;
      const settings = await prisma.appSettings.findFirst({ where: { userId } });
      const dolar = (await resolveDolarUSD(settings)) || 1400;
      const perUSD = dolar > 0 ? Math.round((perARS / dolar) * 100) / 100 : 0;
      const start = new Date(body.startDate || body.date || Date.now());
      const group = randomUUID();
      const rows = Array.from({ length: n }, (_, i) => {
        const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, start.getUTCDate(), 12));
        return {
          name: body.name,
          categoryId: body.categoryId || null,
          amountARS: perARS,
          amountUSD: perUSD,
          exchangeRate: 0,
          date: d,
          dueDate: d,
          status: 'pendiente',
          periodicity: 'unico',
          paymentMethod: body.paymentMethod || null,
          entity: body.entity || null,
          dayOfMonth: null,
          notes: body.notes || null,
          installmentGroup: group,
          installmentNumber: i + 1,
          installmentTotal: n,
          userId,
        };
      });
      await prisma.expense.createMany({ data: rows });
      return NextResponse.json({ ok: true, count: rows.length }, { status: 201 });
    }

    const expense = await prisma.expense.create({
      data: {
        name: body.name,
        categoryId: body.categoryId || null,
        amountARS: body.amountARS ?? 0,
        amountUSD: body.amountUSD ?? 0,
        exchangeRate: body.exchangeRate ?? 0,
        date: new Date(body.date),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status ?? 'pendiente',
        periodicity: body.periodicity ?? 'unico',
        paymentMethod: body.paymentMethod || null,
        entity: body.entity || null,
        dayOfMonth: body.dayOfMonth != null && body.dayOfMonth !== '' ? Number(body.dayOfMonth) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: body.notes || null,
        vehicleId: body.vehicleId || null,
        userId,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error creando gasto' }, { status: 500 });
  }
}
