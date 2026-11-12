export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.debt.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    const body = await req.json();
    delete body.id; delete body.userId;
    if (body.expectedDate !== undefined) body.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    if (body.amount !== undefined) body.amount = Number(body.amount) || 0;
    const debt = await prisma.debt.update({ where: { id }, data: body });
    return NextResponse.json(debt);
  } catch {
    return NextResponse.json({ error: 'Error actualizando deuda por cobrar' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.debt.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    await prisma.debt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando deuda por cobrar' }, { status: 500 });
  }
}
