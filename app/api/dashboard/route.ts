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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    // Próximo mes (para "Gastos pendientes" y "Próximas cuotas")
    const nextY = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextM = (now.getMonth() + 1) % 12; // 0-based

    const [monthExpenses, allExpenses, goals, investments, crypto, inventory, vehicles, settings] = await Promise.all([
      prisma.expense.findMany({ where: { userId, date: { gte: startOfMonth, lt: endOfMonth } }, include: { category: true } }),
      prisma.expense.findMany({ where: { userId }, include: { category: true }, orderBy: { date: 'desc' } }),
      prisma.savingGoal.findMany({ where: { userId } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.cryptoHolding.findMany({ where: { userId } }),
      prisma.inventoryItem.findMany({ where: { userId } }),
      prisma.vehicle.findMany({ where: { userId } }),
      prisma.appSettings.findFirst({ where: { userId } }),
    ]);

    const totalMonthARS = monthExpenses.reduce((s: number, e: any) => s + (e?.amountARS ?? 0), 0);
    const totalMonthUSD = monthExpenses.reduce((s: number, e: any) => s + (e?.amountUSD ?? 0), 0);

    // ¿El gasto recurrente/único aplica a un mes/año dado? (misma lógica que el gráfico de evolución)
    const STEP: Record<string, number> = { mensual: 1, bimestral: 2, trimestral: 3, anual: 12 };
    const appliesToMonth = (e: any, year: number, month: number): boolean => {
      const d = new Date(e?.date);
      const anchorIdx = d.getUTCFullYear() * 12 + d.getUTCMonth();
      const targetIdx = year * 12 + month;
      const p = e?.periodicity;
      const recurring = !!p && p !== 'unico' && p !== 'cuotas';
      if (recurring) {
        if (targetIdx < anchorIdx) return false;
        if (e?.endDate) {
          const ed = new Date(e.endDate);
          const endIdx = ed.getUTCFullYear() * 12 + ed.getUTCMonth();
          if (targetIdx > endIdx) return false;
        }
        const step = STEP[p] ?? 1;
        return (targetIdx - anchorIdx) % step === 0;
      }
      return d.getUTCFullYear() === year && d.getUTCMonth() === month;
    };

    // Gastos pendientes = todos los gastos (no cuotas) que caen en el próximo mes, con su fecha de pago
    const pendingExpenses = allExpenses
      .filter((e: any) => !e?.installmentTotal && e?.status !== 'cancelado' && appliesToMonth(e, nextY, nextM))
      .map((e: any) => {
        const recurring = !!e?.periodicity && e.periodicity !== 'unico' && e.periodicity !== 'cuotas';
        let payDate: Date;
        if (recurring) {
          const day = Math.min(Math.max(Number(e?.dayOfMonth) || new Date(e.date).getUTCDate() || 1, 1), 31);
          payDate = new Date(Date.UTC(nextY, nextM, day, 12));
        } else {
          payDate = new Date(e?.dueDate ?? e?.date);
        }
        return { id: e.id, name: e.name, amountARS: e.amountARS, dueDate: payDate.toISOString() };
      })
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Próximas cuotas = filas de cuotas con vencimiento en el próximo mes
    const pendingCuotas = allExpenses
      .filter((e: any) => {
        if (!e?.installmentTotal) return false;
        const d = new Date(e?.date);
        return d.getUTCFullYear() === nextY && d.getUTCMonth() === nextM;
      })
      .sort((a: any, b: any) => new Date(a?.date).getTime() - new Date(b?.date).getTime())
      .map((e: any) => ({ id: e.id, planName: e.name, number: e.installmentNumber, total: e.installmentTotal, amount: e.amountARS, dueDate: e.date }));
    const dolarUSD = (await resolveDolarUSD(settings)) || 1400;
    const totalInvestments = investments.reduce((s: number, i: any) => s + (i?.amountInvested ?? 0), 0);
    const totalInvestmentsARS = investments.reduce((s: number, i: any) => {
      const amt = i?.amountInvested ?? 0;
      return s + (i?.currency === 'USD' ? amt * dolarUSD : amt);
    }, 0);
    const totalInvestmentsUSD = investments.reduce((s: number, i: any) => {
      const amt = i?.amountInvested ?? 0;
      return s + (i?.currency === 'USD' ? amt : amt / dolarUSD);
    }, 0);
    const activeGoals = goals.filter((g: any) => g?.status === 'activo');
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

    // Valor cripto con cotización EN VIVO (con caché). Fallback al precio de compra si no hay cotización.
    const cryptoTickers = crypto.map((h: any) => h?.ticker).filter(Boolean);
    let cryptoPrices: Record<string, { price: number; change24h: number }> = {};
    if (cryptoTickers.length > 0) {
      try { cryptoPrices = await getCryptoPrices(cryptoTickers); } catch { /* usa fallback */ }
    }
    const cryptoValueUSD = crypto.reduce((s: number, h: any) => {
      const live = cryptoPrices?.[String(h?.ticker).toUpperCase()]?.price;
      const price = live && live > 0 ? live : (h?.avgBuyPrice ?? 0);
      return s + (h?.quantity ?? 0) * price;
    }, 0);
    const cryptoValueARS = cryptoValueUSD * dolarUSD;

    return NextResponse.json({
      totalMonthARS,
      totalMonthUSD,
      monthExpenses,
      pendingExpenses,
      pendingCuotas,
      totalInvestments,
      totalInvestmentsARS,
      totalInvestmentsUSD,
      activeGoals,
      cryptoHoldings: crypto,
      cryptoValueUSD,
      cryptoValueARS,
      inventoryCount: inventory?.length ?? 0,
      vehicleCount: vehicles?.length ?? 0,
      inventoryValueARS,
      inventoryValueUSD,
      vehiclesValueARS,
      vehiclesValueUSD,
      settings: { ...(settings ?? {}), dolarUSD },
      expensesByCategory: monthExpenses.reduce((acc: any, e: any) => {
        const cat = e?.category?.name ?? 'Sin categoría';
        acc[cat] = (acc[cat] ?? 0) + (e?.amountARS ?? 0);
        return acc;
      }, {}),
      expensesDetailByCategory: (() => {
        const map = new Map<string, { category: string; color: string; total: number; items: { id: string; name: string; amountARS: number }[] }>();
        for (const e of monthExpenses as any[]) {
          const cat = e?.category?.name ?? 'Sin categoría';
          const color = e?.category?.color ?? '#64748b';
          if (!map.has(cat)) map.set(cat, { category: cat, color, total: 0, items: [] });
          const g = map.get(cat)!;
          g.total += e?.amountARS ?? 0;
          g.items.push({ id: e?.id, name: e?.name ?? '-', amountARS: e?.amountARS ?? 0 });
        }
        return Array.from(map.values())
          .map((g) => ({ ...g, items: g.items.sort((a, b) => b.amountARS - a.amountARS) }))
          .sort((a, b) => b.total - a.total);
      })(),
    });
  } catch {
    return NextResponse.json({ error: 'Error cargando dashboard' }, { status: 500 });
  }
}
