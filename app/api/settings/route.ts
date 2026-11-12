export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDolarUSD } from '@/lib/dolar';

async function getOrCreateSettings(userId: string) {
  let s = await prisma.appSettings.findFirst({ where: { userId } });
  if (!s) {
    s = await prisma.appSettings.create({ data: { dolarUSD: 1400, userId } });
  }
  return s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const settings = await getOrCreateSettings(session.user.id);
  const dolarUSD = await resolveDolarUSD(settings);
  return NextResponse.json({ ...settings, dolarUSD });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const settings = await getOrCreateSettings(session.user.id);
    const updated = await prisma.appSettings.update({
      where: { id: settings.id },
      data: {
        dolarUSD: body.dolarUSD ?? settings.dolarUSD,
        dolarAuto: body.dolarAuto ?? settings.dolarAuto,
        primaryCurrency: body.primaryCurrency ?? settings.primaryCurrency,
        displayName: body.displayName ?? settings.displayName,
        monthlyIncome: body.monthlyIncome ?? settings.monthlyIncome,
        entities: Array.isArray(body.entities) ? body.entities : settings.entities,
        paymentMethods: Array.isArray(body.paymentMethods) ? body.paymentMethods : settings.paymentMethods,
        inventoryCategories: Array.isArray(body.inventoryCategories) ? body.inventoryCategories : settings.inventoryCategories,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error actualizando configuración' }, { status: 500 });
  }
}
