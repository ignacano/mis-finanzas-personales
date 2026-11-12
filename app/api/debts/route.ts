export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const debts = await prisma.debt.findMany({ where: { userId: session.user.id }, orderBy: [{ status: 'asc' }, { expectedDate: 'asc' }] });
  return NextResponse.json(debts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body?.debtor) return NextResponse.json({ error: 'Falta el deudor' }, { status: 400 });
    const debt = await prisma.debt.create({
      data: {
        debtor: body.debtor,
        amount: Number(body.amount) || 0,
        currency: body.currency ?? 'ARS',
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes ?? null,
        status: body.status ?? 'pendiente',
        userId: session.user.id,
      },
    });
    return NextResponse.json(debt, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creando deuda por cobrar' }, { status: 500 });
  }
}
