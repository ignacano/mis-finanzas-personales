export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.category.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    const body = await req.json();
    delete body.id; delete body.userId;
    // Si cambia el nombre, evitar duplicados del mismo usuario.
    if (body.name && body.name !== owned.name) {
      const dup = await prisma.category.findFirst({ where: { userId: session.user.id, name: body.name, NOT: { id } } });
      if (dup) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    const cat = await prisma.category.update({ where: { id }, data: body });
    return NextResponse.json(cat);
  } catch {
    return NextResponse.json({ error: 'Error actualizando categoría' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    const owned = await prisma.category.findFirst({ where: { id, userId: session.user.id } });
    if (!owned) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando categoría' }, { status: 500 });
  }
}
