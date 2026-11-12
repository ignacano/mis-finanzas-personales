export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const vehicles = await prisma.vehicle.findMany({ where: { userId: session.user.id }, include: { expenses: { include: { category: true } } }, orderBy: { brand: 'asc' } });
  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const vehicle = await prisma.vehicle.create({
      data: {
        brand: body.brand,
        model: body.model,
        year: body.year,
        plate: body.plate ?? null,
        estimatedValue: body.estimatedValue ?? 0,
        estimatedValueUSD: body.estimatedValueUSD ?? 0,
        valueCurrency: body.valueCurrency ?? 'ARS',
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        mileage: body.mileage ?? 0,
        status: body.status ?? 'activo',
        notes: body.notes ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creando vehículo' }, { status: 500 });
  }
}
