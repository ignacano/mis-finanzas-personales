'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApi, formatUSD, formatARS } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { Bitcoin, Plus, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre (ej: Bitcoin)', type: 'text', required: true },
  { name: 'ticker', label: 'Ticker (ej: BTC)', type: 'text', required: true },
  { name: 'quantity', label: 'Cantidad', type: 'number', step: '0.000001', required: true },
  { name: 'avgBuyPrice', label: 'Precio compra promedio (USD)', type: 'number', step: '0.01' },
  { name: 'notes', label: 'Notas', type: 'textarea' },
];

export function CriptoClient() {
  const { data: holdings, loading, refetch } = useApi<any[]>('/api/crypto');
  const { data: settingsData } = useApi<any>('/api/settings');
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const dolarUSD = settingsData?.dolarUSD ?? 1400;

  const fetchPrices = useCallback(async (force = false) => {
    const tickers = (holdings ?? []).map((h: any) => h?.ticker).filter(Boolean);
    if (tickers.length === 0) return;
    setPricesLoading(true);
    try {
      const res = await fetch(`/api/crypto/prices?symbols=${tickers.join(',')}${force ? '&force=1' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data ?? {});
      }
    } catch { /* silent */ }
    setPricesLoading(false);
  }, [holdings]);

  useEffect(() => {
    if ((holdings ?? []).length > 0) fetchPrices();
  }, [holdings, fetchPrices]);

  // Auto-refresh every 5 min
  useEffect(() => {
    const interval = setInterval(() => { if ((holdings ?? []).length > 0) fetchPrices(); }, 300000);
    return () => clearInterval(interval);
  }, [holdings, fetchPrices]);

  const handleSave = async (data: Record<string, any>) => {
    try {
      const url = editing ? `/api/crypto/${editing.id}` : '/api/crypto';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Holding actualizado' : 'Holding agregado');
      setModalOpen(false); setEditing(null); refetch();
    } catch { toast.error('Error guardando'); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await fetch(`/api/crypto/${deleting}`, { method: 'DELETE' }); toast.success('Eliminado'); setDeleting(null); refetch(); } catch { toast.error('Error'); }
  };

  const totalUSD = (holdings ?? []).reduce((s: number, h: any) => {
    const p = prices?.[h?.ticker]?.price ?? h?.avgBuyPrice ?? 0;
    return s + (h?.quantity ?? 0) * p;
  }, 0);

  return (
    <div>
      <PageHeader title="Portfolio Cripto" subtitle="Holdings y cotizaciones en tiempo real" icon={Bitcoin}
        action={
          <div className="flex gap-2">
            <button onClick={() => fetchPrices(true)} disabled={pricesLoading} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50">
              <RefreshCw size={16} className={pricesLoading ? 'animate-spin' : ''} /> Actualizar
            </button>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2">
              <Plus size={16} /> Agregar
            </button>
          </div>
        }
      />

      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-6">
        <div><p className="text-sm text-muted-foreground">Valor total USD</p><p className="font-display text-2xl font-bold">{formatUSD(totalUSD)}</p></div>
        <div><p className="text-sm text-muted-foreground">Valor total ARS</p><p className="font-display text-2xl font-bold">{formatARS(totalUSD * dolarUSD)}</p></div>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="p-3 text-left">Moneda</th><th className="p-3 text-left">Ticker</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Precio compra</th><th className="p-3 text-right">Precio actual</th><th className="p-3 text-right">Valor USD</th><th className="p-3 text-right">Valor ARS</th><th className="p-3 text-right">24h</th><th className="p-3 text-right">P&L</th><th className="p-3"></th></tr></thead>
            <tbody>
              {(holdings ?? []).length === 0 && <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">No hay holdings</td></tr>}
              {(holdings ?? []).map((h: any) => {
                const currentPrice = prices?.[h?.ticker]?.price ?? 0;
                const change24 = prices?.[h?.ticker]?.change24h ?? 0;
                const holdingValueUSD = (h?.quantity ?? 0) * currentPrice;
                const costBasis = (h?.quantity ?? 0) * (h?.avgBuyPrice ?? 0);
                const pnl = currentPrice > 0 ? holdingValueUSD - costBasis : 0;
                const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                return (
                  <tr key={h?.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{h?.name}</td>
                    <td className="p-3 font-mono text-primary">{h?.ticker}</td>
                    <td className="p-3 text-right font-mono">{h?.quantity?.toFixed?.(6) ?? '0'}</td>
                    <td className="p-3 text-right font-mono">{formatUSD(h?.avgBuyPrice)}</td>
                    <td className="p-3 text-right font-mono">{currentPrice > 0 ? formatUSD(currentPrice) : '-'}</td>
                    <td className="p-3 text-right font-mono font-bold">{currentPrice > 0 ? formatUSD(holdingValueUSD) : '-'}</td>
                    <td className="p-3 text-right font-mono">{currentPrice > 0 ? formatARS(holdingValueUSD * dolarUSD) : '-'}</td>
                    <td className="p-3 text-right">
                      {currentPrice > 0 ? (
                        <span className={`flex items-center justify-end gap-1 ${change24 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {change24 >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(change24).toFixed(2)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-right">
                      {currentPrice > 0 ? (
                        <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatUSD(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3"><div className="flex gap-1"><button onClick={() => { setEditing(h); setModalOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil size={14} /></button><button onClick={() => setDeleting(h?.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={14} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <EditModal title={editing ? 'Editar holding' : 'Agregar holding'} fields={fields} initialData={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null); }} open={modalOpen} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
