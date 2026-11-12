'use client';
import { useState } from 'react';
import { useApi, formatARS, formatUSD } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'targetAmount', label: 'Monto objetivo', type: 'number', step: '0.01', required: true },
  { name: 'currentAmount', label: 'Monto actual', type: 'number', step: '0.01' },
  { name: 'currency', label: 'Moneda', type: 'select', options: [{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }] },
  { name: 'deadline', label: 'Fecha límite', type: 'date' },
  { name: 'description', label: 'Descripción', type: 'textarea' },
  { name: 'status', label: 'Estado', type: 'select', options: [{ value: 'activo', label: 'Activo' }, { value: 'cumplido', label: 'Cumplido' }, { value: 'cancelado', label: 'Cancelado' }] },
];

export function ObjetivosClient() {
  const { data: goals, loading, refetch } = useApi<any[]>('/api/goals');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = async (data: Record<string, any>) => {
    try {
      const url = editing ? `/api/goals/${editing.id}` : '/api/goals';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Objetivo actualizado' : 'Objetivo creado');
      setModalOpen(false); setEditing(null); refetch();
    } catch { toast.error('Error guardando objetivo'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await fetch(`/api/goals/${deleting}`, { method: 'DELETE' }); toast.success('Eliminado'); setDeleting(null); refetch(); } catch { toast.error('Error'); }
  };

  const fmt = (g: any) => g?.currency === 'USD' ? formatUSD : formatARS;

  return (
    <div>
      <PageHeader title="Objetivos de ahorro" subtitle="Administra tus metas financieras" icon={Target}
        action={<button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2"><Plus size={16} /> Nuevo objetivo</button>}
      />
      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(goals ?? []).length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No hay objetivos creados</p>}
          {(goals ?? []).map((g: any) => {
            const pct = (g?.targetAmount ?? 0) > 0 ? Math.min(((g?.currentAmount ?? 0) / (g?.targetAmount ?? 1)) * 100, 100) : 0;
            const format = fmt(g);
            return (
              <div key={g?.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{g?.name ?? '-'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${g?.status === 'activo' ? 'text-emerald-400 bg-emerald-400/10' : g?.status === 'cumplido' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 bg-gray-400/10'}`}>{g?.status}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(g); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil size={14} /></button>
                    <button onClick={() => setDeleting(g?.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{format(g?.currentAmount)}</span>
                    <span className="font-mono font-bold">{format(g?.targetAmount)}</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">{pct.toFixed(0)}%</p>
                </div>
                {g?.description && <p className="text-xs text-muted-foreground mt-2">{g.description}</p>}
              </div>
            );
          })}
        </div>
      )}
      <EditModal title={editing ? 'Editar objetivo' : 'Nuevo objetivo'} fields={fields} initialData={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null); }} open={modalOpen} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
