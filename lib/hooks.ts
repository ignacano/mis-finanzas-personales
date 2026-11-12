'use client';
import { useState, useEffect, useCallback } from 'react';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error cargando datos');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}

export function formatARS(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

export function formatUSD(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function statusColor(status: string | null | undefined): string {
  switch (status) {
    case 'pagado': return 'text-emerald-400 bg-emerald-400/10';
    case 'pendiente': return 'text-yellow-400 bg-yellow-400/10';
    case 'vencido': return 'text-red-400 bg-red-400/10';
    case 'parcial': return 'text-orange-400 bg-orange-400/10';
    case 'cancelado': return 'text-gray-400 bg-gray-400/10';
    case 'programado': return 'text-blue-400 bg-blue-400/10';
    default: return 'text-gray-400 bg-gray-400/10';
  }
}
