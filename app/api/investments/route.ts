export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const investments = await prisma.investment.findMany({ where: { userId: session.user.id }, orderBy: { startDate: 'desc' } });
  return NextResponse.json(investments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const inv = await prisma.investment.create({
      data: {
        name: body.name,
        type: body.type,
        amountInvested: body.amountInvested,
        currency: body.currency ?? 'ARS',
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        estimatedReturn: body.estimatedReturn ?? 0,
        actualReturn: body.actualReturn ?? 0,
        status: body.status ?? 'activo',
        entity: body.entity ?? null,
        notes: body.notes ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json(inv, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creando inversión' }, { status: 500 });
  }
}
