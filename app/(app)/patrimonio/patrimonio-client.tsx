'use client';
import { useState } from 'react';
import { useApi, formatARS, formatUSD, formatDate } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { Wallet, Plus, Pencil, Trash2, HandCoins } from 'lucide-react';
import { toast } from 'sonner';

interface Component { key: string; label: string; valueARS: number; valueUSD: number; color: string; }
interface PatrimonioData {
  dolarUSD: number;
  primaryCurrency: string;
  totalARS: number;
  totalUSD: number;
  components: Component[];
  debts: any[];
}

const debtFields: FieldConfig[] = [
  { name: 'debtor', label: 'Deudor (quién te debe)', type: 'text', required: true },
  { name: 'amount', label: 'Monto', type: 'number', step: '0.01', required: true },
  { name: 'currency', label: 'Moneda', type: 'select', options: [{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }] },
  { name: 'expectedDate', label: 'Fecha de cobro estimada', type: 'date' },
  { name: 'status', label: 'Estado', type: 'select', options: [{ value: 'pendiente', label: 'Pendiente' }, { value: 'cobrado', label: 'Cobrado' }] },
  { name: 'notes', label: 'Notas', type: 'textarea' },
];

export function PatrimonioClient() {
  const { data, loading, refetch } = useApi<PatrimonioData>('/api/patrimonio');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const d = data ?? ({} as PatrimonioData);
  const primaryUSD = (d?.primaryCurrency ?? 'ARS') === 'USD';
  const components = d?.components ?? [];
  const totalARS = d?.totalARS ?? 0;
  const totalUSD = d?.totalUSD ?? 0;

  const mainVal = (ars: number, usd: number) => (primaryUSD ? formatUSD(usd) : formatARS(ars));
  const subVal = (ars: number, usd: number) => (primaryUSD ? formatARS(ars) : formatUSD(usd));

  const handleSave = async (form: Record<string, any>) => {
    try {
      const payload = { ...form };
      payload.expectedDate = payload.expectedDate ? payload.expectedDate : null;
      const url = editing ? `/api/debts/${editing.id}` : '/api/debts';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Deuda por cobrar actualizada' : 'Deuda por cobrar registrada');
      setModalOpen(false); setEditing(null); refetch();
    } catch { toast.error('Error guardando la deuda por cobrar'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await fetch(`/api/debts/${deleting}`, { method: 'DELETE' }); toast.success('Eliminada'); setDeleting(null); refetch(); } catch { toast.error('Error'); }
  };

  const debts = d?.debts ?? [];

  return (
    <div>
      <PageHeader title="Patrimonio" subtitle="Composición de tu patrimonio estimado" icon={Wallet} />

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* Total + composición */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
              <div>
                <p className="text-sm text-muted-foreground">Patrimonio estimado total</p>
                <p className="font-display text-3xl font-bold tracking-tight text-emerald-400">{mainVal(totalARS, totalUSD)}</p>
                <p className="text-xs text-muted-foreground mt-1">{subVal(totalARS, totalUSD)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Dólar USD de referencia: <span className="font-mono font-semibold text-foreground">{formatARS(d?.dolarUSD ?? 0)}</span></p>
            </div>

            {totalARS <= 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Todavía no hay componentes con valor. Cargá inversiones, cripto, bienes, vehículos o deudas por cobrar para ver la composición.</p>
            ) : (
              <>
                {/* Barra apilada */}
                <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted mb-4">
                  {components.filter((c) => c.valueARS > 0).map((c) => (
                    <div key={c.key} style={{ width: `${(c.valueARS / totalARS) * 100}%`, backgroundColor: c.color }} title={`${c.label}: ${formatARS(c.valueARS)}`} />
                  ))}
                </div>
                {/* Detalle por componente */}
                <div className="space-y-2">
                  {components.map((c) => {
                    const pct = totalARS > 0 ? (c.valueARS / totalARS) * 100 : 0;
                    return (
                      <div key={c.key} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/40">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-sm flex-1">{c.label}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                        <div className="flex flex-col items-end min-w-[110px]">
                          <span className="font-mono font-semibold text-sm">{mainVal(c.valueARS, c.valueUSD)}</span>
                          <span className="text-[11px] text-muted-foreground">{subVal(c.valueARS, c.valueUSD)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Deudas por cobrar */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HandCoins size={18} className="text-pink-400" />
                <h3 className="font-display font-semibold">Deudas por cobrar</h3>
              </div>
              <button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2"><Plus size={15} /> Nueva</button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Dinero que te deben, con su fecha de cobro estimada. Las pendientes suman al patrimonio.</p>

            {debts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay deudas por cobrar registradas</p>
            ) : (
              <div className="space-y-2">
                {debts.map((dbt: any) => {
                  const fmt = dbt?.currency === 'USD' ? formatUSD : formatARS;
                  const cobrado = dbt?.status === 'cobrado';
                  return (
                    <div key={dbt?.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{dbt?.debtor ?? '-'}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${cobrado ? 'text-emerald-400 bg-emerald-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>{cobrado ? 'Cobrado' : 'Pendiente'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Cobro estimado: {formatDate(dbt?.expectedDate)}{dbt?.notes ? ` · ${dbt.notes}` : ''}</p>
                      </div>
                      <span className={`font-mono font-bold text-sm ${cobrado ? 'text-muted-foreground line-through' : ''}`}>{fmt(dbt?.amount)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(dbt); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil size={14} /></button>
                        <button onClick={() => setDeleting(dbt?.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <EditModal title={editing ? 'Editar deuda por cobrar' : 'Nueva deuda por cobrar'} fields={debtFields} initialData={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null); }} open={modalOpen} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
