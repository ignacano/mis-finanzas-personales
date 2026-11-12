export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.vehicle.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const body = await req.json();
    delete body.id; delete body.userId; delete body.expenses;
    if (body.purchaseDate) body.purchaseDate = new Date(body.purchaseDate);
    const vehicle = await prisma.vehicle.update({ where: { id }, data: body });
    return NextResponse.json(vehicle);
  } catch {
    return NextResponse.json({ error: 'Error actualizando vehículo' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.vehicle.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando vehículo' }, { status: 500 });
  }
}
