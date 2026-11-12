export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const cats = await prisma.category.findMany({ where: { userId: session.user.id }, orderBy: { name: 'asc' } });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body?.name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    // Unicidad del nombre por usuario (garantizada en código).
    const existing = await prisma.category.findFirst({ where: { userId: session.user.id, name: body.name } });
    if (existing) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    const cat = await prisma.category.create({ data: { name: body.name, color: body.color ?? '#10b981', icon: body.icon ?? 'receipt', userId: session.user.id } });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creando categoría' }, { status: 500 });
  }
}
