export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const holdings = await prisma.cryptoHolding.findMany({ where: { userId: session.user.id }, orderBy: { name: 'asc' } });
  return NextResponse.json(holdings);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const holding = await prisma.cryptoHolding.create({
      data: {
        name: body.name,
        ticker: body.ticker?.toUpperCase() ?? '',
        quantity: body.quantity ?? 0,
        avgBuyPrice: body.avgBuyPrice ?? 0,
        notes: body.notes ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json(holding, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creando holding' }, { status: 500 });
  }
}
