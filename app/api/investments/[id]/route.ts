export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.investment.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const body = await req.json();
    delete body.id; delete body.userId;
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    const inv = await prisma.investment.update({ where: { id }, data: body });
    return NextResponse.json(inv);
  } catch {
    return NextResponse.json({ error: 'Error actualizando inversión' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.investment.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    await prisma.investment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando inversión' }, { status: 500 });
  }
}
