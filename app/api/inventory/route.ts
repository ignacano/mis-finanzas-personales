export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const items = await prisma.inventoryItem.findMany({ where: { userId: session.user.id }, orderBy: { name: 'asc' } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const item = await prisma.inventoryItem.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        category: body.category ?? null,
        valueARS: body.valueARS ?? 0,
        valueUSD: body.valueUSD ?? 0,
        acquiredDate: body.acquiredDate ? new Date(body.acquiredDate) : null,
        condition: body.condition ?? 'bueno',
        notes: body.notes ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creando ítem' }, { status: 500 });
  }
}
