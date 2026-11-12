export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  try {
    const owned = await prisma.expense.findFirst({ where: { id, userId } });
    if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.amountARS !== undefined) data.amountARS = Number(body.amountARS) || 0;
    if (body.amountUSD !== undefined) data.amountUSD = Number(body.amountUSD) || 0;
    if (body.exchangeRate !== undefined) data.exchangeRate = Number(body.exchangeRate) || 0;
    if (body.date) data.date = new Date(body.date);
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.periodicity !== undefined) data.periodicity = body.periodicity;
    data.paymentMethod = body.paymentMethod || null;
    data.entity = body.entity || null;
    data.dayOfMonth = body.dayOfMonth != null && body.dayOfMonth !== '' ? Number(body.dayOfMonth) : null;
    data.endDate = body.endDate ? new Date(body.endDate) : null;
    data.notes = body.notes || null;
    if (body.vehicleId !== undefined) data.vehicleId = body.vehicleId || null;
    const expense = await prisma.expense.update({ where: { id }, data });
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: 'Error actualizando gasto' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  try {
    const owned = await prisma.expense.findFirst({ where: { id, userId } });
    if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const url = new URL(req.url);
    // Eliminar todas las cuotas del mismo grupo
    if (url.searchParams.get('group') === '1') {
      if (owned.installmentGroup) {
        await prisma.expense.deleteMany({ where: { installmentGroup: owned.installmentGroup, userId } });
        return NextResponse.json({ ok: true });
      }
    }
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando gasto' }, { status: 500 });
  }
}
