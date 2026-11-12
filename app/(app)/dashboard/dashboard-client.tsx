'use client';
import { useApi, formatARS, formatUSD, formatDate } from '@/lib/hooks';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { LayoutDashboard, Receipt, CreditCard, Target, TrendingUp, Bitcoin, Package, Car, DollarSign } from 'lucide-react';
import { IncomeBreakdownChart } from './income-breakdown-chart';

interface DashboardData {
  totalMonthARS: number;
  totalMonthUSD: number;
  pendingExpenses: any[];
  pendingCuotas: any[];
  totalInvestments: number;
  activeGoals: any[];
  cryptoHoldings: any[];
  cryptoValueUSD: number;
  cryptoValueARS: number;
  inventoryCount: number;
  vehicleCount: number;
  totalInvestmentsARS: number;
  totalInvestmentsUSD: number;
  inventoryValueARS: number;
  inventoryValueUSD: number;
  vehiclesValueARS: number;
  vehiclesValueUSD: number;
  settings: { dolarUSD: number; dolarAuto?: boolean; primaryCurrency?: string; displayName?: string; monthlyIncome?: number };
  expensesByCategory: Record<string, number>;
  expensesDetailByCategory: { category: string; color: string; total: number; items: { id: string; name: string; amountARS: number }[] }[];
  monthExpenses: any[];
}

export function DashboardClient() {
  const { data, loading } = useApi<DashboardData>('/api/dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const d = data ?? {} as DashboardData;
  const dolarUSD = d?.settings?.dolarUSD ?? 1400;
  const primaryCurrency = (d?.settings?.primaryCurrency ?? 'ARS') === 'USD' ? 'USD' : 'ARS';
  const cryptoValueUSD = d?.cryptoValueUSD ?? 0;
  const cryptoValueARS = d?.cryptoValueARS ?? (cryptoValueUSD * dolarUSD);
  const investmentsARS = d?.totalInvestmentsARS ?? 0;
  const investmentsUSD = d?.totalInvestmentsUSD ?? 0;
  const inventoryValueARS = d?.inventoryValueARS ?? 0;
  const inventoryValueUSD = d?.inventoryValueUSD ?? 0;
  const vehiclesValueARS = d?.vehiclesValueARS ?? 0;
  const vehiclesValueUSD = d?.vehiclesValueUSD ?? 0;
  const totalPatrimonioARS = investmentsARS + cryptoValueARS + inventoryValueARS + vehiclesValueARS;
  const totalPatrimonioUSD = investmentsUSD + cryptoValueUSD + inventoryValueUSD + vehiclesValueUSD;

  // Devuelve { value, subtitle } con la moneda primaria como número grande.
  const money = (ars: number, usd: number) =>
    primaryCurrency === 'USD'
      ? { value: formatUSD(usd), subtitle: formatARS(ars) }
      : { value: formatARS(ars), subtitle: formatUSD(usd) };

  return (
    <div>
      <PageHeader title={d?.settings?.displayName ? `Dashboard de ${d.settings.displayName}` : 'Dashboard'} subtitle="Resumen de tus finanzas personales" icon={LayoutDashboard} />

      <div className="bg-card border border-border rounded-xl p-3 mb-6 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-primary" />
          <span className="text-muted-foreground">Dólar USD:</span>
          <span className="font-mono font-bold">{formatARS(dolarUSD)}</span>
          <span className="text-xs text-muted-foreground">{d?.settings?.dolarAuto === false ? '(manual)' : '(BCRA en tiempo real)'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Gastos del mes" {...money(d?.totalMonthARS ?? 0, d?.totalMonthUSD ?? 0)} icon={Receipt} href="/gastos" />
        <StatCard title="Cuotas pendientes" value={String((d?.pendingCuotas ?? []).length)} subtitle="próximas a vencer" icon={CreditCard} color="text-yellow-400" href="/gastos" />
        <StatCard title="Objetivos activos" value={String((d?.activeGoals ?? []).length)} icon={Target} color="text-blue-400" href="/objetivos" />
        <StatCard title="Inversiones" {...money(investmentsARS, investmentsUSD)} icon={TrendingUp} color="text-purple-400" href="/inversiones" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Portfolio Cripto" {...money(cryptoValueARS, cryptoValueUSD)} icon={Bitcoin} color="text-orange-400" href="/cripto" />
        <StatCard title="Patrimonio est." {...money(totalPatrimonioARS, totalPatrimonioUSD)} icon={DollarSign} color="text-emerald-400" href="/patrimonio" />
        <StatCard title="Bienes inventariados" value={String(d?.inventoryCount ?? 0)} icon={Package} href="/inventario" />
        <StatCard title="Vehículos" value={String(d?.vehicleCount ?? 0)} icon={Car} href="/vehiculos" />
      </div>

      <IncomeBreakdownChart monthlyIncome={d?.settings?.monthlyIncome ?? 0} data={d?.expensesDetailByCategory ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-semibold mb-1">Gastos pendientes</h3>
          <p className="text-xs text-muted-foreground mb-3">Gastos a pagar el próximo mes</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(d?.pendingExpenses ?? []).length === 0 && <p className="text-sm text-muted-foreground">No hay gastos el próximo mes</p>}
            {(d?.pendingExpenses ?? []).map((e: any) => (
              <div key={e?.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex flex-col">
                  <span>{e?.name ?? '-'}</span>
                  <span className="text-xs text-muted-foreground">Vence {formatDate(e?.dueDate)}</span>
                </div>
                <span className="font-mono font-bold">{formatARS(e?.amountARS)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-semibold mb-1">Próximas cuotas</h3>
          <p className="text-xs text-muted-foreground mb-3">Cuotas con vencimiento el próximo mes</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(d?.pendingCuotas ?? []).length === 0 && <p className="text-sm text-muted-foreground">No hay cuotas el próximo mes</p>}
            {(d?.pendingCuotas ?? []).map((c: any) => (
              <div key={c?.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex flex-col">
                  <span>{c?.planName ?? '-'} - Cuota {c?.number ?? 0}{c?.total ? `/${c.total}` : ''}</span>
                  <span className="text-xs text-muted-foreground">Vence {formatDate(c?.dueDate)}</span>
                </div>
                <span className="font-mono font-bold">{formatARS(c?.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
