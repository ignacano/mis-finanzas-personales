'use client';
import { useState } from 'react';
import { useApi, formatARS, formatDate, statusColor } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { Car, Plus, Pencil, Trash2, Fuel } from 'lucide-react';
import { toast } from 'sonner';

export function VehiculosClient() {
  const { data: vehicles, loading, refetch } = useApi<any[]>('/api/vehicles');
  const { data: settingsData } = useApi<any>('/api/settings');
  const dolarUSD = settingsData?.dolarUSD ?? 1400;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fields: FieldConfig[] = [
    { name: 'brand', label: 'Marca', type: 'text', required: true },
    { name: 'model', label: 'Modelo', type: 'text', required: true },
    { name: 'year', label: 'Año', type: 'number', required: true },
    { name: 'plate', label: 'Patente', type: 'text' },
    { name: 'valueCurrency', label: 'Moneda del valor', type: 'select', options: [{ value: 'ARS', label: 'ARS (pesos)' }, { value: 'USD', label: 'USD (dólares)' }] },
    { name: 'estimatedValueInput', label: 'Valor estimado', type: 'number', step: '0.01', helpText: 'Ingresá el valor en la moneda elegida arriba' },
    { name: 'equivalent', label: 'Equivalente', type: 'number', readOnly: true, helpText: `Calculado con Dólar USD (${dolarUSD}). Si elegís ARS muestra el USD; si elegís USD muestra el ARS.` },
    { name: 'purchaseDate', label: 'Fecha compra', type: 'date' },
    { name: 'mileage', label: 'Kilometraje', type: 'number' },
    { name: 'status', label: 'Estado', type: 'select', options: [{ value: 'activo', label: 'Activo' }, { value: 'vendido', label: 'Vendido' }, { value: 'baja', label: 'Baja' }] },
    { name: 'notes', label: 'Notas', type: 'textarea' },
  ];

  const computeVehicle = (f: Record<string, any>) => {
    const cur = f?.valueCurrency || 'ARS';
    const input = Number(f?.estimatedValueInput) || 0;
    const equivalent = cur === 'USD'
      ? Math.round(input * dolarUSD * 100) / 100
      : (dolarUSD > 0 ? Math.round((input / dolarUSD) * 100) / 100 : 0);
    return { equivalent };
  };

  const editingData = editing ? {
    ...editing,
    valueCurrency: editing?.valueCurrency || 'ARS',
    estimatedValueInput: (editing?.valueCurrency === 'USD')
      ? (editing?.estimatedValueUSD || 0)
      : (editing?.estimatedValue || 0),
  } : null;

  const handleSave = async (data: Record<string, any>) => {
    try {
      const cur = data?.valueCurrency || 'ARS';
      const input = Number(data?.estimatedValueInput) || 0;
      const estimatedValue = cur === 'USD' ? Math.round(input * dolarUSD * 100) / 100 : input;
      const estimatedValueUSD = cur === 'USD' ? input : (dolarUSD > 0 ? Math.round((input / dolarUSD) * 100) / 100 : 0);
      const payload: Record<string, any> = { ...data, valueCurrency: cur, estimatedValue, estimatedValueUSD };
      delete payload.estimatedValueInput;
      delete payload.equivalent;
      const url = editing ? `/api/vehicles/${editing.id}` : '/api/vehicles';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Vehículo actualizado' : 'Vehículo creado');
      setModalOpen(false); setEditing(null); refetch();
    } catch { toast.error('Error guardando'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await fetch(`/api/vehicles/${deleting}`, { method: 'DELETE' }); toast.success('Eliminado'); setDeleting(null); refetch(); } catch { toast.error('Error'); }
  };

  return (
    <div>
      <PageHeader title="Vehículos" subtitle="Registro de vehículos y gastos asociados" icon={Car}
        action={<button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2"><Plus size={16} /> Nuevo vehículo</button>}
      />
      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
        <div className="space-y-4">
          {(vehicles ?? []).length === 0 && <p className="text-muted-foreground text-center py-8">No hay vehículos</p>}
          {(vehicles ?? []).map((v: any) => (
            <div key={v?.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Car className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <h3 className="font-semibold">{v?.brand} {v?.model} ({v?.year})</h3>
                    <p className="text-sm text-muted-foreground">{v?.plate ?? 'Sin patente'} • {(v?.mileage ?? 0).toLocaleString('es-AR')} km</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(v); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil size={14} /></button>
                  <button onClick={() => setDeleting(v?.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-mono font-bold">{formatARS(v?.estimatedValue)}</span></div>
                <div><span className="text-muted-foreground">Compra:</span> {formatDate(v?.purchaseDate)}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(v?.status)}`}>{v?.status}</span>
              </div>
              {(v?.expenses ?? []).length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Fuel size={12} /> Gastos asociados</p>
                  <div className="space-y-1">
                    {(v.expenses ?? []).slice(0, 5).map((e: any) => (
                      <div key={e?.id} className="flex justify-between text-xs py-1">
                        <span>{e?.name} - {e?.category?.name ?? ''}</span>
                        <span className="font-mono">{formatARS(e?.amountARS)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <EditModal title={editing ? 'Editar vehículo' : 'Nuevo vehículo'} fields={fields} initialData={editingData} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null); }} open={modalOpen} compute={computeVehicle} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
