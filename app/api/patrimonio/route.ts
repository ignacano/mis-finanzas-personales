export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDolarUSD } from '@/lib/dolar';
import { getCryptoPrices } from '@/lib/crypto-prices';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const userId = session.user.id;
  try {
    const [investments, crypto, inventory, vehicles, debts, settings] = await Promise.all([
      prisma.investment.findMany({ where: { userId } }),
      prisma.cryptoHolding.findMany({ where: { userId } }),
      prisma.inventoryItem.findMany({ where: { userId } }),
      prisma.vehicle.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { userId }, orderBy: [{ status: 'asc' }, { expectedDate: 'asc' }] }),
      prisma.appSettings.findFirst({ where: { userId } }),
    ]);

    const dolarUSD = (await resolveDolarUSD(settings)) || 1400;
    const toARS = (amt: number, cur: string) => (cur === 'USD' ? amt * dolarUSD : amt);
    const toUSD = (amt: number, cur: string) => (cur === 'USD' ? amt : amt / dolarUSD);

    const investmentsARS = investments.reduce((s: number, i: any) => s + toARS(i?.amountInvested ?? 0, i?.currency), 0);
    const investmentsUSD = investments.reduce((s: number, i: any) => s + toUSD(i?.amountInvested ?? 0, i?.currency), 0);

    const inventoryValueARS = inventory.reduce((s: number, it: any) => {
      const ars = it?.valueARS ?? 0;
      return s + (ars > 0 ? ars : (it?.valueUSD ?? 0) * dolarUSD);
    }, 0);
    const inventoryValueUSD = inventory.reduce((s: number, it: any) => {
      const usd = it?.valueUSD ?? 0;
      return s + (usd > 0 ? usd : (it?.valueARS ?? 0) / dolarUSD);
    }, 0);

    const vehiclesValueARS = vehicles.reduce((s: number, v: any) => {
      const ars = v?.estimatedValue ?? 0;
      return s + (ars > 0 ? ars : (v?.estimatedValueUSD ?? 0) * dolarUSD);
    }, 0);
    const vehiclesValueUSD = vehicles.reduce((s: number, v: any) => {
      const usd = v?.estimatedValueUSD ?? 0;
      return s + (usd > 0 ? usd : (v?.estimatedValue ?? 0) / dolarUSD);
    }, 0);

    // Cripto con cotización en vivo (fallback al precio de compra).
    const cryptoTickers = crypto.map((h: any) => h?.ticker).filter(Boolean);
    let cryptoPrices: Record<string, { price: number; change24h: number }> = {};
    if (cryptoTickers.length > 0) {
      try { cryptoPrices = await getCryptoPrices(cryptoTickers); } catch { /* fallback */ }
    }
    const cryptoValueUSD = crypto.reduce((s: number, h: any) => {
      const live = cryptoPrices?.[String(h?.ticker).toUpperCase()]?.price;
      const price = live && live > 0 ? live : (h?.avgBuyPrice ?? 0);
      return s + (h?.quantity ?? 0) * price;
    }, 0);
    const cryptoValueARS = cryptoValueUSD * dolarUSD;

    // Deudas por cobrar pendientes (dinero que a uno le deben) = activo.
    const pendingDebts = debts.filter((d: any) => d?.status !== 'cobrado');
    const debtsARS = pendingDebts.reduce((s: number, d: any) => s + toARS(d?.amount ?? 0, d?.currency), 0);
    const debtsUSD = pendingDebts.reduce((s: number, d: any) => s + toUSD(d?.amount ?? 0, d?.currency), 0);

    const components = [
      { key: 'inversiones', label: 'Inversiones', valueARS: investmentsARS, valueUSD: investmentsUSD, color: '#a78bfa' },
      { key: 'cripto', label: 'Portfolio Cripto', valueARS: cryptoValueARS, valueUSD: cryptoValueUSD, color: '#fb923c' },
      { key: 'inventario', label: 'Bienes inventariados', valueARS: inventoryValueARS, valueUSD: inventoryValueUSD, color: '#34d399' },
      { key: 'vehiculos', label: 'Vehículos', valueARS: vehiclesValueARS, valueUSD: vehiclesValueUSD, color: '#60a5fa' },
      { key: 'deudas', label: 'Deudas por cobrar', valueARS: debtsARS, valueUSD: debtsUSD, color: '#f472b6' },
    ];

    const totalARS = components.reduce((s, c) => s + c.valueARS, 0);
    const totalUSD = components.reduce((s, c) => s + c.valueUSD, 0);

    return NextResponse.json({
      dolarUSD,
      primaryCurrency: (settings as any)?.primaryCurrency ?? 'ARS',
      totalARS,
      totalUSD,
      components,
      debts,
    });
  } catch {
    return NextResponse.json({ error: 'Error cargando patrimonio' }, { status: 500 });
  }
}
