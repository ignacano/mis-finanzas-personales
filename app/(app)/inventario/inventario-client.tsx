'use client';
import { useState, useMemo } from 'react';
import { useApi, formatARS, formatUSD, formatDate } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function InventarioClient() {
  const { data: items, loading, refetch } = useApi<any[]>('/api/inventory');
  const { data: settings } = useApi<any>('/api/settings');
  const fields: FieldConfig[] = useMemo(() => {
    const catOptions = (Array.isArray(settings?.inventoryCategories) ? settings.inventoryCategories : []).map((c: string) => ({ value: c, label: c }));
    return [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'category', label: 'Categoría', type: 'select', options: catOptions, helpText: 'Editá las opciones desde Configuración' },
      { name: 'valueARS', label: 'Valor ARS', type: 'number', step: '0.01', helpText: 'Se completa solo desde el valor USD (dejalo vacío para ingresar USD).' },
      { name: 'valueUSD', label: 'Valor USD', type: 'number', step: '0.01', helpText: 'Se completa solo desde el valor ARS (dejalo vacío para ingresar ARS).' },
      { name: 'acquiredDate', label: 'Fecha adquisición', type: 'date' },
      { name: 'condition', label: 'Estado', type: 'select', options: [{ value: 'bueno', label: 'Bueno' }, { value: 'regular', label: 'Regular' }, { value: 'malo', label: 'Malo' }] },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ];
  }, [settings]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const dolarUSD = settings?.dolarUSD ?? 1400;
  const totalARS = (items ?? []).reduce((s: number, it: any) => {
    const ars = it?.valueARS ?? 0;
    return s + (ars > 0 ? ars : (it?.valueUSD ?? 0) * dolarUSD);
  }, 0);
  const totalUSD = (items ?? []).reduce((s: number, it: any) => {
    const usd = it?.valueUSD ?? 0;
    return s + (usd > 0 ? usd : (it?.valueARS ?? 0) / dolarUSD);
  }, 0);

  const computeItem = (f: Record<string, any>) => {
    const dolar = dolarUSD || 1400;
    const arsRaw = f?.valueARS;
    const usdRaw = f?.valueUSD;
    const hasArs = arsRaw !== '' && arsRaw !== undefined && arsRaw !== null;
    const hasUsd = usdRaw !== '' && usdRaw !== undefined && usdRaw !== null;
    const arsAuto = !!f?._arsAuto;
    const usdAuto = !!f?._usdAuto;
    const arsUser = hasArs && !arsAuto;
    const usdUser = hasUsd && !usdAuto;
    if (arsUser && (!hasUsd || usdAuto)) {
      const v = Number(arsRaw);
      return { valueUSD: isFinite(v) ? +(v / dolar).toFixed(2) : '', _usdAuto: true, _arsAuto: false };
    }
    if (usdUser && (!hasArs || arsAuto)) {
      const v = Number(usdRaw);
      return { valueARS: isFinite(v) ? Math.round(v * dolar) : '', _arsAuto: true, _usdAuto: false };
    }
    if (!hasArs && !hasUsd) {
      return { _arsAuto: false, _usdAuto: false };
    }
    return {};
  };

  const handleSave = async (data: Record<string, any>) => {
    try {
      const payload = { ...data };
      delete payload._arsAuto;
      delete payload._usdAuto;
      const url = editing ? `/api/inventory/${editing.id}` : '/api/inventory';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Ítem actualizado' : 'Ítem creado');
      setModalOpen(false); setEditing(null); refetch();
    } catch { toast.error('Error guardando'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await fetch(`/api/inventory/${deleting}`, { method: 'DELETE' }); toast.success('Eliminado'); setDeleting(null); refetch(); } catch { toast.error('Error'); }
  };

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Bienes del hogar y personales" icon={Package}
        action={<button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2"><Plus size={16} /> Nuevo ítem</button>}
      />

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-3 mb-4 flex flex-wrap gap-6 text-sm">
        <div><span className="text-muted-foreground">Total ARS:</span> <span className="font-mono font-bold">{formatARS(totalARS)}</span></div>
        <div><span className="text-muted-foreground">Total USD:</span> <span className="font-mono font-bold">{formatUSD(totalUSD)}</span></div>
        <div><span className="text-muted-foreground">Registros:</span> <span className="font-mono font-bold">{(items ?? []).length}</span></div>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="p-3 text-left">Nombre</th><th className="p-3 text-left">Categoría</th><th className="p-3 text-right">Valor ARS</th><th className="p-3 text-right">Valor USD</th><th className="p-3">Adquirido</th><th className="p-3">Condición</th><th className="p-3"></th></tr></thead>
            <tbody>
              {(items ?? []).length === 0 && <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No hay ítems</td></tr>}
              {(items ?? []).map((i: any) => (
                <tr key={i?.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-medium">{i?.name}</td>
                  <td className="p-3 text-muted-foreground">{i?.category ?? '-'}</td>
                  <td className="p-3 text-right font-mono">{formatARS(i?.valueARS)}</td>
                  <td className="p-3 text-right font-mono">{formatUSD(i?.valueUSD)}</td>
                  <td className="p-3">{formatDate(i?.acquiredDate)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${i?.condition === 'bueno' ? 'text-emerald-400 bg-emerald-400/10' : i?.condition === 'regular' ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10'}`}>{i?.condition}</span></td>
                  <td className="p-3"><div className="flex gap-1"><button onClick={() => { setEditing(i); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil size={14} /></button><button onClick={() => setDeleting(i?.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <EditModal title={editing ? 'Editar ítem' : 'Nuevo ítem'} fields={fields} initialData={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null); }} open={modalOpen} compute={computeItem} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
