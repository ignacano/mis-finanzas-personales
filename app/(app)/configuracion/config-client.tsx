'use client';
import { useState, useEffect } from 'react';
import { useApi } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { EditModal, type FieldConfig } from '@/components/edit-modal';
import { DeleteConfirm } from '@/components/delete-confirm';
import { Settings, DollarSign, Tag, Download, Key, Plus, Pencil, Trash2, Building2, Wallet, Package } from 'lucide-react';
import { toast } from 'sonner';

const catFields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true },
  { name: 'color', label: 'Color (hex)', type: 'text' },
];

export function ConfigClient() {
  const { data: settings, refetch: refetchSettings } = useApi<any>('/api/settings');
  const { data: categories, refetch: refetchCats } = useApi<any[]>('/api/categories');
  const [dolarUSD, setDolarUSD] = useState('');
  const [dolarAuto, setDolarAuto] = useState(true);
  const [bcraLoading, setBcraLoading] = useState(false);
  const [bcraFecha, setBcraFecha] = useState('');
  const [primaryCurrency, setPrimaryCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [deleteCat, setDeleteCat] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [entities, setEntities] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [newEntity, setNewEntity] = useState('');
  const [newPayment, setNewPayment] = useState('');
  const [invCategories, setInvCategories] = useState<string[]>([]);
  const [newInvCat, setNewInvCat] = useState('');

  useEffect(() => {
    if (settings) {
      setDolarUSD(String(settings?.dolarUSD ?? ''));
      setDolarAuto(settings?.dolarAuto !== false);
      setPrimaryCurrency((settings?.primaryCurrency ?? 'ARS') === 'USD' ? 'USD' : 'ARS');
      setDisplayName(settings?.displayName ?? '');
      setMonthlyIncome(settings?.monthlyIncome ? String(settings.monthlyIncome) : '');
      setEntities(Array.isArray(settings?.entities) ? settings.entities : []);
      setPaymentMethods(Array.isArray(settings?.paymentMethods) ? settings.paymentMethods : []);
      setInvCategories(Array.isArray(settings?.inventoryCategories) ? settings.inventoryCategories : []);
    }
  }, [settings]);

  const saveList = async (key: 'entities' | 'paymentMethods' | 'inventoryCategories', list: string[]) => {
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: list }) });
      if (!res.ok) throw new Error();
      toast.success('Guardado');
      refetchSettings();
    } catch { toast.error('Error'); }
  };

  const addEntity = () => {
    const v = newEntity.trim();
    if (!v || entities.includes(v)) { setNewEntity(''); return; }
    const next = [...entities, v];
    setEntities(next); setNewEntity(''); saveList('entities', next);
  };
  const removeEntity = (v: string) => {
    const next = entities.filter((e) => e !== v);
    setEntities(next); saveList('entities', next);
  };
  const addPayment = () => {
    const v = newPayment.trim();
    if (!v || paymentMethods.includes(v)) { setNewPayment(''); return; }
    const next = [...paymentMethods, v];
    setPaymentMethods(next); setNewPayment(''); saveList('paymentMethods', next);
  };
  const removePayment = (v: string) => {
    const next = paymentMethods.filter((e) => e !== v);
    setPaymentMethods(next); saveList('paymentMethods', next);
  };
  const addInvCat = () => {
    const v = newInvCat.trim();
    if (!v || invCategories.includes(v)) { setNewInvCat(''); return; }
    const next = [...invCategories, v];
    setInvCategories(next); setNewInvCat(''); saveList('inventoryCategories', next);
  };
  const removeInvCat = (v: string) => {
    const next = invCategories.filter((e) => e !== v);
    setInvCategories(next); saveList('inventoryCategories', next);
  };

  const saveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName }) });
      if (!res.ok) throw new Error();
      toast.success('Nombre actualizado');
      refetchSettings();
    } catch { toast.error('Error'); }
    setSavingName(false);
  };

  const saveIncome = async () => {
    setSavingIncome(true);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyIncome: Number(monthlyIncome) || 0 }) });
      if (!res.ok) throw new Error();
      toast.success('Ingreso fijo mensual actualizado');
      refetchSettings();
    } catch { toast.error('Error'); }
    setSavingIncome(false);
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dolarUSD: Number(dolarUSD), dolarAuto }) });
      if (!res.ok) throw new Error();
      toast.success('Dólar USD actualizado');
      refetchSettings();
    } catch { toast.error('Error'); }
    setSavingRates(false);
  };

  const fetchBcra = async () => {
    setBcraLoading(true);
    try {
      const res = await fetch('/api/dolar');
      const data = await res.json();
      if (!res.ok || !data?.rate) throw new Error(data?.error);
      setDolarUSD(String(data.rate));
      setBcraFecha(data?.fecha ?? '');
      // Persistimos la cotización obtenida
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dolarUSD: Number(data.rate) }) });
      toast.success(`Cotización BCRA: $${data.rate}${data?.fecha ? ` (${data.fecha})` : ''}`);
      refetchSettings();
    } catch (e: any) { toast.error(e?.message ?? 'No se pudo obtener la cotización del BCRA'); }
    setBcraLoading(false);
  };

  const toggleAuto = async (value: boolean) => {
    setDolarAuto(value);
    try {
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dolarAuto: value }) });
      toast.success(value ? 'Cotización automática (BCRA) activada' : 'Cotización manual activada');
      refetchSettings();
    } catch { toast.error('Error'); }
  };

  const saveCurrency = async (value: 'ARS' | 'USD') => {
    setPrimaryCurrency(value);
    setSavingCurrency(true);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ primaryCurrency: value }) });
      if (!res.ok) throw new Error();
      toast.success('Moneda principal actualizada');
      refetchSettings();
    } catch { toast.error('Error'); }
    setSavingCurrency(false);
  };

  const handleCatSave = async (data: Record<string, any>) => {
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories';
      const res = await fetch(url, { method: editCat ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error();
      toast.success(editCat ? 'Categoría actualizada' : 'Categoría creada');
      setCatModal(false); setEditCat(null); refetchCats();
    } catch { toast.error('Error'); }
  };

  const handleCatDelete = async () => {
    if (!deleteCat) return;
    try { await fetch(`/api/categories/${deleteCat}`, { method: 'DELETE' }); toast.success('Eliminada'); setDeleteCat(null); refetchCats(); } catch { toast.error('Error'); }
  };

  const changePw = async () => {
    setPwLoading(true);
    try {
      const res = await fetch('/api/user/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      toast.success('Contraseña actualizada');
      setCurrentPw(''); setNewPw('');
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
    setPwLoading(false);
  };

  const exportData = async (format: string) => {
    try {
      const res = await fetch(`/api/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finanzas.${format === 'csv' ? 'csv' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Error exportando'); }
  };

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Ajustes generales de la app" icon={Settings} />

      {/* Exchange rate (Dólar USD) */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><DollarSign size={18} className="text-primary" /> Dólar USD</h3>
        <p className="text-sm text-muted-foreground mb-4">Es la única referencia para todas las conversiones de la app. Con la cotización automática se toma en tiempo real del BCRA; también podés fijar un valor manual.</p>

        <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
          <input type="checkbox" checked={dolarAuto} onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleAuto(e.target.checked)} className="w-4 h-4 accent-primary" />
          <span className="text-sm">Cotización automática en tiempo real (BCRA)</span>
        </label>

        <div className="flex flex-wrap gap-3 items-end mb-2">
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-muted-foreground block mb-1">Valor del Dólar USD (ARS)</label>
            <input type="number" value={dolarUSD} disabled={dolarAuto} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDolarUSD(e.target.value)} className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground font-mono disabled:opacity-60" step="0.01" />
          </div>
          <button onClick={fetchBcra} disabled={bcraLoading} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {bcraLoading ? 'Consultando...' : 'Actualizar desde BCRA'}
          </button>
          {!dolarAuto && (
            <button onClick={saveRates} disabled={savingRates} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {savingRates ? 'Guardando...' : 'Guardar valor manual'}
            </button>
          )}
        </div>
        {bcraFecha && <p className="text-xs text-muted-foreground">Última cotización BCRA: {bcraFecha}</p>}
      </div>

      {/* Display name */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><Settings size={18} className="text-primary" /> Nombre del panel</h3>
        <p className="text-sm text-muted-foreground mb-4">Personalizá el nombre que aparece en el título del dashboard (por ejemplo, “Dashboard de Ignacio”).</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted-foreground block mb-1">Nombre</label>
            <input type="text" value={displayName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)} placeholder="Tu nombre" className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground" />
          </div>
          <button onClick={saveName} disabled={savingName} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {savingName ? 'Guardando...' : 'Guardar nombre'}
          </button>
        </div>
      </div>

      {/* Monthly income */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><Wallet size={18} className="text-primary" /> Ingreso fijo mensual (salario)</h3>
        <p className="text-sm text-muted-foreground mb-4">Tu salario o ingreso fijo mensual en pesos (ARS). Se usa en el dashboard para calcular qué porcentaje de tu ingreso representa cada categoría de gasto.</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-muted-foreground block mb-1">Ingreso mensual (ARS)</label>
            <input type="number" value={monthlyIncome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyIncome(e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground font-mono" step="0.01" />
          </div>
          <button onClick={saveIncome} disabled={savingIncome} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {savingIncome ? 'Guardando...' : 'Guardar ingreso'}
          </button>
        </div>
      </div>

      {/* Primary currency */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><DollarSign size={18} className="text-primary" /> Moneda del dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4">Elegí qué moneda se muestra como número grande en las tarjetas del dashboard. La otra aparece debajo en tamaño pequeño.</p>
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => saveCurrency('ARS')}
            disabled={savingCurrency}
            className={`px-5 py-2 text-sm font-medium transition ${primaryCurrency === 'ARS' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            Pesos (ARS)
          </button>
          <button
            onClick={() => saveCurrency('USD')}
            disabled={savingCurrency}
            className={`px-5 py-2 text-sm font-medium transition ${primaryCurrency === 'USD' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            Dólares (USD)
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Tag size={18} className="text-primary" /> Categorías de gastos</h3>
          <button onClick={() => { setEditCat(null); setCatModal(true); }} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Plus size={14} /> Nueva</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(categories ?? []).map((c: any) => (
            <div key={c?.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c?.color ?? '#10b981' }} />
              {c?.name}
              <button onClick={() => { setEditCat(c); setCatModal(true); }} className="text-primary hover:opacity-70"><Pencil size={12} /></button>
              <button onClick={() => setDeleteCat(c?.id)} className="text-destructive hover:opacity-70"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Entities */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><Building2 size={18} className="text-primary" /> Entidades</h3>
        <p className="text-sm text-muted-foreground mb-4">Bancos y entidades disponibles en los desplegables de Gastos e Inversiones.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {entities.length === 0 && <span className="text-sm text-muted-foreground">No hay entidades cargadas</span>}
          {entities.map((e) => (
            <div key={e} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              {e}
              <button onClick={() => removeEntity(e)} className="text-destructive hover:opacity-70"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input type="text" value={newEntity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntity(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') addEntity(); }} placeholder="Nueva entidad (ej. Banco Galicia)" className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground" />
          </div>
          <button onClick={addEntity} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-1"><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {/* Inventory categories */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><Package size={18} className="text-primary" /> Categorías de inventario</h3>
        <p className="text-sm text-muted-foreground mb-4">Categorías disponibles en el desplegable “Categoría” al crear un ítem de inventario.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {invCategories.length === 0 && <span className="text-sm text-muted-foreground">No hay categorías cargadas</span>}
          {invCategories.map((e) => (
            <div key={e} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              {e}
              <button onClick={() => removeInvCat(e)} className="text-destructive hover:opacity-70"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input type="text" value={newInvCat} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvCat(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') addInvCat(); }} placeholder="Nueva categoría (ej. Herramientas)" className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground" />
          </div>
          <button onClick={addInvCat} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-1"><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-2"><Wallet size={18} className="text-primary" /> Métodos de pago</h3>
        <p className="text-sm text-muted-foreground mb-4">Opciones disponibles en el desplegable “Método de pago” de los gastos.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {paymentMethods.length === 0 && <span className="text-sm text-muted-foreground">No hay métodos cargados</span>}
          {paymentMethods.map((e) => (
            <div key={e} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              {e}
              <button onClick={() => removePayment(e)} className="text-destructive hover:opacity-70"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input type="text" value={newPayment} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') addPayment(); }} placeholder="Nuevo método (ej. Transferencia)" className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground" />
          </div>
          <button onClick={addPayment} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-1"><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {/* Export */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><Download size={18} className="text-primary" /> Exportar datos</h3>
        <div className="flex gap-3">
          <button onClick={() => exportData('json')} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition">Exportar JSON</button>
          <button onClick={() => exportData('csv')} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition">Exportar CSV</button>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><Key size={18} className="text-primary" /> Cambiar contraseña</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Contraseña actual</label>
            <input type="password" value={currentPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPw(e.target.value)} className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Nueva contraseña</label>
            <input type="password" value={newPw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPw(e.target.value)} className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground" />
          </div>
        </div>
        <button onClick={changePw} disabled={pwLoading || !currentPw || !newPw} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
          {pwLoading ? 'Cambiando...' : 'Cambiar contraseña'}
        </button>
      </div>

      <EditModal title={editCat ? 'Editar categoría' : 'Nueva categoría'} fields={catFields} initialData={editCat} onSave={handleCatSave} onClose={() => { setCatModal(false); setEditCat(null); }} open={catModal} />
      <DeleteConfirm open={!!deleteCat} onClose={() => setDeleteCat(null)} onConfirm={handleCatDelete} />
    </div>
  );
}
