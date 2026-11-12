'use client';
import { useState } from 'react';
import { formatARS } from '@/lib/hooks';
import { ChevronDown, ChevronRight, Wallet } from 'lucide-react';

interface CategoryDetail {
  category: string;
  color: string;
  total: number;
  items: { id: string; name: string; amountARS: number }[];
}

export function IncomeBreakdownChart({ monthlyIncome, data }: { monthlyIncome: number; data: CategoryDetail[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const totalSpent = (data ?? []).reduce((s, c) => s + (c?.total ?? 0), 0);
  const income = monthlyIncome ?? 0;

  if (!income || income <= 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 mb-6 text-center">
        <Wallet size={32} className="text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold mb-1">Gastos vs. ingreso fijo</h3>
        <p className="text-sm text-muted-foreground">
          Configurá tu <span className="text-foreground font-medium">ingreso fijo mensual (salario)</span> en la sección
          {' '}<a href="/configuracion" className="text-primary hover:underline">Configuración</a> para ver qué porcentaje de tu ingreso representa cada categoría de gasto.
        </p>
      </div>
    );
  }

  const spentPct = income > 0 ? (totalSpent / income) * 100 : 0;
  const remaining = income - totalSpent;
  const toggle = (cat: string) => setExpanded((p) => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="font-display font-semibold">Gastos del mes vs. ingreso fijo</h3>
        <span className="text-xs text-muted-foreground">Ingreso fijo: <span className="font-mono text-foreground">{formatARS(income)}</span></span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Cada barra muestra el porcentaje que la categoría representa sobre tu ingreso fijo mensual. Tocá una categoría para ver el detalle de gastos que la componen.</p>

      {/* Resumen total */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Total gastado</p>
          <p className="font-display text-lg font-bold">{formatARS(totalSpent)}</p>
          <p className="text-xs text-muted-foreground">{spentPct.toFixed(1)}% del ingreso</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Remanente</p>
          <p className={`font-display text-lg font-bold ${remaining < 0 ? 'text-destructive' : 'text-primary'}`}>{formatARS(remaining)}</p>
          <p className="text-xs text-muted-foreground">{(100 - spentPct).toFixed(1)}% del ingreso</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Categorías</p>
          <p className="font-display text-lg font-bold">{(data ?? []).length}</p>
          <p className="text-xs text-muted-foreground">con gastos este mes</p>
        </div>
      </div>

      {/* Barra total */}
      <div className="mb-6">
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${spentPct > 100 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(spentPct, 100)}%` }} />
        </div>
      </div>

      {/* Categorías */}
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No hay gastos registrados este mes.</p>}
      <div className="space-y-3">
        {(data ?? []).map((c) => {
          const pct = income > 0 ? (c.total / income) * 100 : 0;
          const isOpen = !!expanded[c.category];
          return (
            <div key={c.category} className="rounded-lg border border-border overflow-hidden">
              <button onClick={() => toggle(c.category)} className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition">
                <div className="flex items-center gap-2 mb-1.5">
                  {isOpen ? <ChevronDown size={15} className="text-muted-foreground shrink-0" /> : <ChevronRight size={15} className="text-muted-foreground shrink-0" />}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm font-medium flex-1 truncate">{c.category}</span>
                  <span className="text-sm font-mono font-bold">{pct.toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground font-mono w-24 text-right">{formatARS(c.total)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden ml-6" style={{ width: 'calc(100% - 1.5rem)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: c.color }} />
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 bg-muted/20">
                  <div className="space-y-1 ml-6">
                    {c.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground truncate pr-2">{it.name}</span>
                        <span className="font-mono shrink-0">{formatARS(it.amountARS)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
