import { prisma } from '@/lib/prisma';

const BCRA_URL = 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/USD';
const TTL_MS = 60_000; // cache en memoria 60s para no golpear el BCRA en cada request

let cache: { rate: number; fecha: string; at: number } | null = null;

/** Obtiene la cotización oficial del dólar (USD) desde el BCRA. Devuelve null si falla. */
export async function fetchBcraDolar(): Promise<{ rate: number; fecha: string } | null> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { rate: cache.rate, fecha: cache.fecha };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(BCRA_URL, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    const det = result?.detalle?.find((x: any) => x?.codigoMoneda === 'USD') ?? result?.detalle?.[0];
    const rate = det?.tipoCotizacion;
    const fecha = result?.fecha ?? '';
    if (typeof rate === 'number' && rate > 0) {
      cache = { rate, fecha, at: Date.now() };
      return { rate, fecha };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resuelve el valor del Dólar USD a usar en toda la app.
 * Si dolarAuto está activo, intenta la cotización en tiempo real del BCRA y la persiste.
 * Si falla o está en manual, usa el valor guardado (dolarUSD).
 */
export async function resolveDolarUSD(settings: any): Promise<number> {
  const stored = Number(settings?.dolarUSD) > 0 ? Number(settings.dolarUSD) : 1400;
  if (!settings?.id || settings?.dolarAuto === false) return stored;
  const live = await fetchBcraDolar();
  if (live && live.rate > 0) {
    if (Math.abs(live.rate - stored) > 0.0001) {
      try {
        await prisma.appSettings.update({ where: { id: settings.id }, data: { dolarUSD: live.rate } });
      } catch {
        // ignorar errores de persistencia; devolvemos igual el valor en vivo
      }
    }
    return live.rate;
  }
  return stored;
}
