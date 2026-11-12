'use client';
import { useState, useMemo } from 'react';
import { useApi, formatARS, formatUSD, formatDate, statusColor } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { TrendingUp, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'plazo_fijo', label: 'Plazo fijo' },
  { value: 'fci', label: 'FCI' },
  { value: 'acciones', label: 'Acciones' },
  { value: 'bonos', label: 'Bonos' },
  { value: 'otro', label: 'Otro' },
];

export function InversionesClient() {
  const { data: investments, loading, refetch } = useApi<any[]>('/api/investments');
  const { data: settings } = useApi<any>('/api/settings');
  const fields: FieldConfig[] = useMemo(() => {
    const entityOptions = (Array.isArray(settings?.entities) ? settings.entities : []).map((e: string) => ({ value: e, label: e }));
    return [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: TYPE_OPTIONS, required: true },
      { name: 'amountInvested', label: 'Monto invertido', type: 'number', step: '0.01', required: true },
      { name: 'currency', label: 'Moneda', type: 'select', options: [{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }] },
      { name: 'entity', label: 'Entidad', type: 'select', options: entityOptions },
      { name: 'startDate', label: 'Fecha inicio', type: 'date', required: true },
      { name: 'endDate', label: 'Fecha vencimiento', type: 'date' },
      { name: 'estimatedReturn', label: 'Rendimiento estimado', type: 'number', step: '0.01' },
      { name: 'actualReturn', label: 'Rendimiento real', type: 'number', step: '0.01' },
      { name: 'status', label: 'Estado', type: 'select', options: [{ value: 'activo', label: 'Activo' }, { value: 'vencido', label: 'Vencido' }, { value: 'cancelado', label: 'Cancelado' }] },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ];
  }, [settings]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const dolarUSD = settings?.dolarUSD ?? 1400;
  const totalUSD = (investments ?? []).reduce((s: number, i: any) => {
    const amt = i?.amountInvested ?? 0;
    return s + (i?.currency === 'USD' ? amt : amt / dolarUSD);
  }, 0);
  const totalARS = (investments ?? []).reduce((s: number, i: any) => {
    const amt = i?.amountInvested ?? 0;
    return s + (i?.currency === 'USD' ? amt * dolarUSD : amt);
  }, 0);

  const handleSave = async (data: Record<string, any>) => {
    try {
      const url = editing ? `/api/investments/${editing.id}` : '/api/investments';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Inversión actualizada' : 'Inversión creada');
      setModalOpen(false); setEditing(null); refetch();
    } catch { toast.error('Error guardando inversión'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await fetch(`/api/investments/${deleting}`, { method: 'DELETE' }); toast.success('Eliminada'); setDeleting(null); refetch(); } catch { toast.error('Error'); }
  };

  return (
    <div>
      <PageHeader title="Inversiones" subtitle="Plazo fijo, FCI, acciones, bonos" icon={TrendingUp}
        action={<button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2"><Plus size={16} /> Nueva inversión</button>}
      />

      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-6">
        <div><p className="text-sm text-muted-foreground">Valor total USD</p><p className="font-display text-2xl font-bold">{formatUSD(totalUSD)}</p></div>
        <div><p className="text-sm text-muted-foreground">Valor total ARS</p><p className="font-display text-2xl font-bold">{formatARS(totalARS)}</p></div>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="p-3 text-left">Nombre</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Monto</th><th className="p-3">Moneda</th><th className="p-3">Inicio</th><th className="p-3">Venc.</th><th className="p-3 text-right">Rend. est.</th><th className="p-3 text-right">Rend. real</th><th className="p-3">Estado</th><th className="p-3"></th></tr></thead>
            <tbody>
              {(investments ?? []).length === 0 && <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">No hay inversiones</td></tr>}
              {(investments ?? []).map((i: any) => {
                const fmt = i?.currency === 'USD' ? formatUSD : formatARS;
                return (
                  <tr key={i?.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{i?.name}</td>
                    <td className="p-3 text-muted-foreground">{TYPE_OPTIONS.find((t: any) => t.value === i?.type)?.label ?? i?.type}</td>
                    <td className="p-3 text-right font-mono">{fmt(i?.amountInvested)}</td>
                    <td className="p-3 text-center">{i?.currency}</td>
                    <td className="p-3">{formatDate(i?.startDate)}</td>
                    <td className="p-3">{formatDate(i?.endDate)}</td>
                    <td className="p-3 text-right font-mono">{fmt(i?.estimatedReturn)}</td>
                    <td className="p-3 text-right font-mono">{fmt(i?.actualReturn)}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(i?.status)}`}>{i?.status}</span></td>
                    <td className="p-3"><div className="flex gap-1"><button onClick={() => { setEditing(i); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil size={14} /></button><button onClick={() => setDeleting(i?.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <EditModal title={editing ? 'Editar inversión' : 'Nueva inversión'} fields={fields} initialData={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null); }} open={modalOpen} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
