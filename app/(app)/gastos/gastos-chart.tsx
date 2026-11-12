'use client';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface MonthPoint {
  label: string;
  ym: string;
  total: number;
  future: boolean;
  current: boolean;
}

export function GastosEvolutionChart({ data, onSelectMonth }: { data: MonthPoint[]; onSelectMonth?: (ym: string) => void }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sin datos para graficar</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={54}
          tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
        <Tooltip
          formatter={(v: any) => [`$ ${(v ?? 0).toLocaleString('es-AR')}`, 'Total']}
          contentStyle={{ fontSize: 12, backgroundColor: 'hsl(222 47% 9%)', border: '1px solid hsl(217 33% 17%)', borderRadius: 8 }}
          itemStyle={{ color: 'hsl(160 84% 45%)' }}
          labelStyle={{ color: 'hsl(210 40% 96%)' }}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
        />
        <Bar
          dataKey="total"
          radius={[4, 4, 0, 0]}
          onClick={(d: any) => { const ym = d?.payload?.ym ?? d?.ym; if (ym) onSelectMonth?.(ym); }}
          style={{ cursor: onSelectMonth ? 'pointer' : 'default' }}
        >
          {data.map((d: MonthPoint, i: number) => (
            <Cell key={i} fill={d.current ? '#10b981' : d.future ? '#334155' : '#0ea5e9'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
