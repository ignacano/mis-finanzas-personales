'use client';
import { useState, useMemo, useEffect } from 'react';
import { useApi, formatARS, formatUSD, formatDate, statusColor } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { GastosEvolutionChart, type MonthPoint } from './gastos-chart';
import { Receipt, Plus, Pencil, Trash2, TrendingUp, CalendarDays, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'programado', label: 'Programado' },
];

const PERIOD_OPTIONS = [
  { value: 'unico', label: 'Único' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'cuotas', label: 'En cuotas' },
];
const PERIOD_LABEL: Record<string, string> = { unico: 'Único', mensual: 'Mensual', bimestral: 'Bimestral', trimestral: 'Trimestral', anual: 'Anual' };
const STEP_MONTHS: Record<string, number> = { mensual: 1, bimestral: 2, trimestral: 3, anual: 12 };
const isCuotas = (p: string) => p === 'cuotas';
const isRecurring = (p: string) => !!p && p !== 'unico' && p !== 'cuotas';

// Determina si un gasto "aplica" (está comprometido) en un mes/anio dado, respetando periodicidad y vencimiento.
function appliesToMonth(e: any, year: number, month: number): boolean {
  const d = new Date(e?.date);
  const ay = d.getUTCFullYear();
  const am = d.getUTCMonth();
  const anchorIdx = ay * 12 + am;
  const targetIdx = year * 12 + month;
  if (!isRecurring(e?.periodicity)) {
    return ay === year && am === month;
  }
  if (targetIdx < anchorIdx) return false;
  // Vencimiento opcional: si el mes objetivo lo supera, ya no aplica.
  if (e?.endDate) {
    const ed = new Date(e.endDate);
    const endIdx = ed.getUTCFullYear() * 12 + ed.getUTCMonth();
    if (targetIdx > endIdx) return false;
  }
  const step = STEP_MONTHS[e?.periodicity] ?? 1;
  return (targetIdx - anchorIdx) % step === 0;
}

// Monto que aporta un gasto a un mes/anio dado (respeta periodicidad).
function amountInMonth(e: any, year: number, month: number): number {
  const amt = e?.amountARS ?? 0;
  if (!amt) return 0;
  return appliesToMonth(e, year, month) ? amt : 0;
}

export function GastosClient() {
  const { data: expenses, loading, refetch } = useApi<any[]>('/api/expenses');
  const { data: categories } = useApi<any[]>('/api/categories');
  const { data: settingsData } = useApi<any>('/api/settings');
  const dolarUSD = settingsData?.dolarUSD ?? 1400;
  const entities: string[] = settingsData?.entities ?? [];
  const paymentMethods: string[] = settingsData?.paymentMethods ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [groupBy, setGroupBy] = useState<'entity' | 'paymentMethod' | 'category'>('entity');
  // Indice de mes actual, calculado sólo en el cliente para evitar mismatch de hidratación.
  const [nowIdx, setNowIdx] = useState<number | null>(null);
  useEffect(() => {
    const n = new Date();
    setNowIdx(n.getFullYear() * 12 + n.getMonth());
    setFilterMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const filtered = useMemo(() => {
    let list = expenses ?? [];
    if (filterMonth) {
      const [fy, fm] = filterMonth.split('-').map(Number);
      list = list.filter((e: any) => appliesToMonth(e, fy, fm - 1));
    }
    if (filterCat) list = list.filter((e: any) => e?.categoryId === filterCat);
    if (filterStatus) list = list.filter((e: any) => e?.status === filterStatus);
    return list;
  }, [expenses, filterMonth, filterCat, filterStatus]);

  // Evolucion mes a mes + proyeccion: arranca en el mes en curso y proyecta 9 meses adelante
  const evolution = useMemo<MonthPoint[]>(() => {
    if (nowIdx === null) return [];
    const cIdx = nowIdx;
    const points: MonthPoint[] = [];
    const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    for (let off = 0; off <= 9; off++) {
      const idx = cIdx + off;
      const y = Math.floor(idx / 12);
      const m = ((idx % 12) + 12) % 12;
      const total = (expenses ?? []).reduce((s: number, e: any) => s + amountInMonth(e, y, m), 0);
      points.push({
        label: `${MONTHS[m]} ${String(y).slice(2)}`,
        ym: `${y}-${String(m + 1).padStart(2, '0')}`,
        total: Math.round(total),
        future: off > 0,
        current: off === 0,
      });
    }
    return points;
  }, [expenses, nowIdx]);

  const thisMonthTotal = evolution.find((p) => p.current)?.total ?? 0;
  const nextMonthTotal = evolution.find((p) => p.future)?.total ?? 0;

  // Agrupacion (por entidad, metodo de pago o categoria) sobre la lista filtrada
  const catNameById = useMemo(() => {
    const m: Record<string, string> = {};
    (categories ?? []).forEach((c: any) => { if (c?.id) m[c.id] = c?.name ?? 'Sin categoría'; });
    return m;
  }, [categories]);
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    (filtered ?? []).forEach((e: any) => {
      const key = (groupBy === 'entity' ? e?.entity : groupBy === 'paymentMethod' ? e?.paymentMethod : (e?.categoryId ? catNameById[e.categoryId] : null)) || 'Sin asignar';
      map[key] = (map[key] ?? 0) + (e?.amountARS ?? 0);
    });
    const arr = Object.entries(map).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    const max = arr.reduce((mx, x) => Math.max(mx, x.value), 0);
    return { arr, max };
  }, [filtered, groupBy, catNameById]);

  const catOptions = (categories ?? []).map((c: any) => ({ value: c?.id, label: c?.name }));
  const entityOptions = entities.map((e) => ({ value: e, label: e }));
  const payOptions = paymentMethods.map((p) => ({ value: p, label: p }));

  const fields: FieldConfig[] = [
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'categoryId', label: 'Categoría', type: 'select', options: catOptions },
    { name: 'periodicity', label: 'Periodicidad', type: 'select', options: PERIOD_OPTIONS, helpText: editing ? undefined : 'Elegí "En cuotas" para generar automáticamente los vencimientos mensuales' },
    // Monto (gasto único o recurrente)
    { name: 'amountARS', label: 'Monto ARS', type: 'number', step: '0.01', visible: (f) => !isCuotas(f?.periodicity), helpText: `Ingresá ARS o USD; el otro se calcula solo (Dólar USD ${dolarUSD})` },
    { name: 'amountUSD', label: 'Monto USD', type: 'number', step: '0.01', visible: (f) => !isCuotas(f?.periodicity), helpText: 'Ingresá el importe en dólares y se convierte a pesos automáticamente' },
    // Gasto en cuotas: monto total + cantidad → genera N gastos mensuales
    { name: 'totalAmount', label: 'Monto total', type: 'number', step: '0.01', visible: (f) => isCuotas(f?.periodicity), helpText: 'Monto total de la compra financiada' },
    { name: 'totalCuotas', label: 'Cantidad de cuotas', type: 'number', min: 1, visible: (f) => isCuotas(f?.periodicity) },
    { name: 'amountPerCuota', label: 'Monto por cuota', type: 'number', step: '0.01', readOnly: true, visible: (f) => isCuotas(f?.periodicity), helpText: 'Se calcula automáticamente: monto total ÷ cantidad de cuotas' },
    { name: 'startDate', label: 'Fecha de la primera cuota', type: 'date', visible: (f) => isCuotas(f?.periodicity), helpText: 'Las cuotas siguientes se generan una por mes' },
    // Gasto único: fecha puntual + vencimiento
    { name: 'date', label: 'Fecha', type: 'date', required: true, visible: (f) => !isRecurring(f?.periodicity) && !isCuotas(f?.periodicity), helpText: 'Fecha del gasto único' },
    { name: 'dueDate', label: 'Vencimiento', type: 'date', visible: (f) => !isRecurring(f?.periodicity) && !isCuotas(f?.periodicity) },
    // Gasto recurrente: sólo día del mes de pago
    { name: 'dayOfMonth', label: 'Día de pago (del mes)', type: 'number', min: 1, max: 31, visible: (f) => isRecurring(f?.periodicity), helpText: 'Qué día de cada período debe abonarse (1 a 31)' },
    { name: 'endDate', label: 'Vencimiento (opcional)', type: 'date', visible: (f) => isRecurring(f?.periodicity), helpText: 'Hasta qué fecha se repite. Vacío = se repite indefinidamente' },
    { name: 'paymentMethod', label: 'Método de pago', type: 'select', options: payOptions, helpText: 'Editá las opciones desde Configuración' },
    { name: 'entity', label: 'Entidad', type: 'select', options: entityOptions, helpText: 'Editá las opciones desde Configuración' },
    { name: 'status', label: 'Estado', type: 'select', options: STATUS_OPTIONS, visible: (f) => !isCuotas(f?.periodicity) },
    { name: 'notes', label: 'Notas', type: 'textarea' },
  ];

  const computeExpense = (f: Record<string, any>) => {
    const dolar = dolarUSD || 1400;
    // Cuotas: monto por cuota
    const total = Number(f?.totalAmount) || 0;
    const n = Number(f?.totalCuotas) || 0;
    const perCuota = n > 0 ? Math.round((total / n) * 100) / 100 : 0;
    // Conversión bidireccional ARS <-> USD. Marcadores internos distinguen
    // el valor tipeado por el usuario del derivado, para no pisar lo que escribe.
    const arsRaw = f?.amountARS;
    const usdRaw = f?.amountUSD;
    const hasArs = arsRaw !== '' && arsRaw !== undefined && arsRaw !== null;
    const hasUsd = usdRaw !== '' && usdRaw !== undefined && usdRaw !== null;
    const arsAuto = !!f?._arsAuto;
    const usdAuto = !!f?._usdAuto;
    const arsUser = hasArs && !arsAuto;
    const usdUser = hasUsd && !usdAuto;
    if (arsUser && (!hasUsd || usdAuto)) {
      const v = Number(arsRaw);
      return { amountPerCuota: perCuota, amountUSD: isFinite(v) ? +(v / dolar).toFixed(2) : '', _usdAuto: true, _arsAuto: false };
    }
    if (usdUser && (!hasArs || arsAuto)) {
      const v = Number(usdRaw);
      return { amountPerCuota: perCuota, amountARS: isFinite(v) ? Math.round(v * dolar) : '', _arsAuto: true, _usdAuto: false };
    }
    if (!hasArs && !hasUsd) {
      return { amountPerCuota: perCuota, _arsAuto: false, _usdAuto: false };
    }
    return { amountPerCuota: perCuota };
  };

  const handleSave = async (data: Record<string, any>) => {
    try {
      const payload: Record<string, any> = { ...data };
      delete payload._arsAuto;
      delete payload._usdAuto;
      // Gasto en cuotas: genera N gastos mensuales en el servidor
      if (payload.periodicity === 'cuotas') {
        if (editing) { toast.error('Para crear cuotas, usá "Nuevo gasto"'); return; }
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            installments: true,
            name: payload.name,
            categoryId: payload.categoryId,
            totalAmount: Number(payload.totalAmount) || 0,
            totalCuotas: Number(payload.totalCuotas) || 1,
            startDate: payload.startDate,
            paymentMethod: payload.paymentMethod,
            entity: payload.entity,
            notes: payload.notes,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success('Cuotas creadas');
        setModalOpen(false);
        setEditing(null);
        refetch();
        return;
      }
      const recurring = isRecurring(payload.periodicity);
      if (recurring) {
        // El día de pago define la fecha ancla (mes actual). La proyección se calcula desde ahí.
        const day = Math.min(Math.max(Number(payload.dayOfMonth) || 1, 1), 31);
        const now = new Date();
        payload.dayOfMonth = day;
        payload.date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), day, 12)).toISOString();
        payload.dueDate = null;
        payload.endDate = payload.endDate ? payload.endDate : null;
      } else {
        payload.dayOfMonth = null;
        payload.endDate = null;
        if (!payload.dueDate) payload.dueDate = null;
      }
      const url = editing ? `/api/expenses/${editing.id}` : '/api/expenses';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Gasto actualizado' : 'Gasto creado');
      setModalOpen(false);
      setEditing(null);
      refetch();
    } catch {
      toast.error('Error guardando gasto');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const q = deleting?.installmentGroup ? '?group=1' : '';
      await fetch(`/api/expenses/${deleting.id}${q}`, { method: 'DELETE' });
      toast.success(deleting?.installmentGroup ? 'Cuotas eliminadas' : 'Gasto eliminado');
      setDeleting(null);
      refetch();
    } catch {
      toast.error('Error eliminando');
    }
  };

  return (
    <div>
      <PageHeader
        title="Gastos e Impuestos"
        subtitle="Gestiona todos tus gastos y servicios"
        icon={Receipt}
        action={
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2">
            <Plus size={16} /> Nuevo gasto
          </button>
        }
      />

      {/* Totales este / proximo mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><CalendarDays size={16} className="text-emerald-400" /> A pagar este mes</div>
          <div className="text-2xl font-bold font-mono">{formatARS(thisMonthTotal)}</div>
          <div className="text-xs text-muted-foreground">{formatUSD(dolarUSD > 0 ? thisMonthTotal / dolarUSD : 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><CalendarClock size={16} className="text-sky-400" /> A pagar el próximo mes</div>
          <div className="text-2xl font-bold font-mono">{formatARS(nextMonthTotal)}</div>
          <div className="text-xs text-muted-foreground">{formatUSD(dolarUSD > 0 ? nextMonthTotal / dolarUSD : 0)}</div>
        </div>
      </div>

      {/* Grafico evolucion + proyeccion */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold flex items-center gap-2"><TrendingUp size={18} className="text-primary" /> Evolución mensual y proyección</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#10b981' }} /> Actual</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#334155' }} /> Proyectado</span>
          </div>
        </div>
        <div className="h-64"><GastosEvolutionChart data={evolution} onSelectMonth={setFilterMonth} /></div>
        <p className="text-xs text-muted-foreground mt-2">Hacé clic en un mes del gráfico para filtrarlo en la tabla. La proyección repite los gastos recurrentes según su periodicidad (hasta su vencimiento, si tiene). Los gastos únicos sólo cuentan en su mes.</p>
      </div>

      {/* Agrupacion por entidad / metodo de pago */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Agrupar gastos</h3>
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
            <button onClick={() => setGroupBy('entity')} className={`px-4 py-1.5 font-medium transition ${groupBy === 'entity' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Por entidad</button>
            <button onClick={() => setGroupBy('paymentMethod')} className={`px-4 py-1.5 font-medium transition ${groupBy === 'paymentMethod' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Por método de pago</button>
            <button onClick={() => setGroupBy('category')} className={`px-4 py-1.5 font-medium transition ${groupBy === 'category' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Por categoría</button>
          </div>
        </div>
        {grouped.arr.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay gastos para agrupar con los filtros actuales</p>
        ) : (
          <div className="space-y-2">
            {grouped.arr.map((g) => (
              <div key={g.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{g.name}</span>
                  <span className="font-mono font-semibold">{formatARS(g.value)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${grouped.max > 0 ? (g.value / grouped.max) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="month" value={filterMonth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterMonth(e.target.value)} className="px-3 py-2 bg-muted rounded-lg border border-input text-foreground text-sm" />
        <select value={filterCat} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCat(e.target.value)} className="px-3 py-2 bg-muted rounded-lg border border-input text-foreground text-sm">
          <option value="">Todas las categorías</option>
          {catOptions.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-muted rounded-lg border border-input text-foreground text-sm">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-3 mb-4 flex flex-wrap gap-6 text-sm">
        <div><span className="text-muted-foreground">Total ARS:</span> <span className="font-mono font-bold">{formatARS(filtered.reduce((s: number, e: any) => s + (e?.amountARS ?? 0), 0))}</span></div>
        <div><span className="text-muted-foreground">Total USD:</span> <span className="font-mono font-bold">{formatUSD(filtered.reduce((s: number, e: any) => s + (e?.amountUSD ?? 0), 0))}</span></div>
        <div><span className="text-muted-foreground">Registros:</span> <span className="font-mono font-bold">{filtered.length}</span></div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Categoría</th>
                <th className="text-right p-3">ARS</th>
                <th className="text-right p-3">USD</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Periodicidad</th>
                <th className="text-left p-3">Método</th>
                <th className="text-left p-3">Entidad</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">No hay gastos registrados</td></tr>
              )}
              {filtered.map((e: any) => (
                <tr key={e?.id} className="border-b border-border/50 hover:bg-muted/30 transition">
                  <td className="p-3 font-medium">{e?.name ?? '-'}{e?.installmentTotal ? <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary align-middle">Cuota {e?.installmentNumber}/{e?.installmentTotal}</span> : null}</td>
                  <td className="p-3 text-muted-foreground">{e?.category?.name ?? '-'}</td>
                  <td className="p-3 text-right font-mono">{formatARS(e?.amountARS)}</td>
                  <td className="p-3 text-right font-mono">{formatUSD(e?.amountUSD)}</td>
                  <td className="p-3">{isRecurring(e?.periodicity) && e?.dayOfMonth && filterMonth ? formatDate(new Date(Date.UTC(Number(filterMonth.split('-')[0]), Number(filterMonth.split('-')[1]) - 1, Math.min(e.dayOfMonth, new Date(Number(filterMonth.split('-')[0]), Number(filterMonth.split('-')[1]), 0).getDate()), 12))) : formatDate(e?.date)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(e?.status)}`}>{e?.status ?? '-'}</span></td>
                  <td className="p-3 text-muted-foreground">{PERIOD_LABEL[e?.periodicity] ?? e?.periodicity ?? '-'}</td>
                  <td className="p-3 text-muted-foreground">{e?.paymentMethod ?? '-'}</td>
                  <td className="p-3 text-muted-foreground">{e?.entity ?? '-'}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditing(e); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition"><Pencil size={14} /></button>
                      <button onClick={() => setDeleting(e)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditModal
        title={editing ? 'Editar gasto' : 'Nuevo gasto'}
        fields={fields}
        initialData={editing}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        open={modalOpen}
        compute={computeExpense}
      />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
