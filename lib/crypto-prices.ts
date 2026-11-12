// Módulo compartido de cotizaciones cripto con caché en memoria.
// Evita golpear CoinGecko en cada request (lento + rate limit del plan free).

// Mapa de tickers comunes -> id de CoinGecko (evita ambigüedades de símbolo).
const COMMON: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin',
  XRP: 'ripple', SOL: 'solana', ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron',
  DOT: 'polkadot', MATIC: 'matic-network', POL: 'polygon-ecosystem-token', LTC: 'litecoin',
  SHIB: 'shiba-inu', AVAX: 'avalanche-2', LINK: 'chainlink', ATOM: 'cosmos', XLM: 'stellar',
  BCH: 'bitcoin-cash', UNI: 'uniswap', DAI: 'dai', ETC: 'ethereum-classic', FIL: 'filecoin',
  APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', NEAR: 'near', ALGO: 'algorand',
  VET: 'vechain', ICP: 'internet-computer', SAND: 'the-sandbox', MANA: 'decentraland',
  AAVE: 'aave', GRT: 'the-graph', XMR: 'monero', PEPE: 'pepe', SUI: 'sui', TON: 'the-open-network',
};

export interface PriceInfo { price: number; change24h: number; }

// Caché de la lista completa de monedas (symbol -> id) de CoinGecko.
let coinListCache: { map: Record<string, string>; ts: number } | null = null;

// Caché de precios por ticker. Compartido entre todos los usuarios (los precios son globales).
const PRICE_TTL_MS = 3 * 60 * 1000; // 3 minutos
const priceCache = new Map<string, { info: PriceInfo; ts: number }>();

async function getIdForSymbol(sym: string): Promise<string | null> {
  const upper = sym.toUpperCase();
  if (COMMON[upper]) return COMMON[upper];
  const now = Date.now();
  if (!coinListCache || now - coinListCache.ts > 24 * 60 * 60 * 1000) {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/list', { next: { revalidate: 0 } });
      if (res.ok) {
        const list = await res.json();
        const map: Record<string, string> = {};
        for (const c of list ?? []) {
          const s = String(c?.symbol ?? '').toUpperCase();
          if (s && !map[s]) map[s] = c?.id;
        }
        coinListCache = { map, ts: now };
      }
    } catch { /* ignore */ }
  }
  return coinListCache?.map?.[upper] ?? null;
}

/**
 * Devuelve precios (USD + cambio 24h) por ticker.
 * Sólo consulta a CoinGecko los tickers que no estén en caché o estén vencidos (TTL 3 min).
 * @param force Si es true, ignora el caché y refresca todo.
 */
export async function getCryptoPrices(
  tickers: string[],
  force = false,
): Promise<Record<string, PriceInfo>> {
  const now = Date.now();
  const wanted = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)));
  const result: Record<string, PriceInfo> = {};
  const stale: string[] = [];

  for (const t of wanted) {
    const cached = priceCache.get(t);
    if (!force && cached && now - cached.ts < PRICE_TTL_MS) {
      result[t] = cached.info;
    } else {
      stale.push(t);
    }
  }

  if (stale.length === 0) return result;

  // Resolver ids de CoinGecko para los tickers vencidos.
  const idToTicker: Record<string, string> = {};
  const ids: string[] = [];
  for (const t of stale) {
    const id = await getIdForSymbol(t);
    if (id) { ids.push(id); idToTicker[id] = t; }
  }

  if (ids.length > 0) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 0 } },
      );
      if (res.ok) {
        const data = await res.json();
        for (const [id, info] of Object.entries(data ?? {})) {
          const ticker = idToTicker[id] ?? id.toUpperCase();
          const parsed: PriceInfo = {
            price: (info as any)?.usd ?? 0,
            change24h: (info as any)?.usd_24h_change ?? 0,
          };
          priceCache.set(ticker, { info: parsed, ts: now });
          result[ticker] = parsed;
        }
      }
    } catch (e: any) {
      console.error('CoinGecko fetch error:', e?.message);
    }
  }

  // Fallback: Coinbase. En algunos hosts (p. ej. el servidor de producción) la IP
  // está bloqueada/limitada por CoinGecko y devuelve vacío; Coinbase sí responde.
  const missing = stale.filter((t) => !result[t]);
  if (missing.length > 0) {
    const cb = await fetchCoinbasePrices(missing);
    for (const [t, info] of Object.entries(cb)) {
      priceCache.set(t, { info, ts: now });
      result[t] = info;
    }
  }

  // Para tickers que no se pudieron refrescar, servir el último valor en caché si existe (aunque esté vencido).
  for (const t of stale) {
    if (!result[t]) {
      const cached = priceCache.get(t);
      if (cached) result[t] = cached.info;
    }
  }

  return result;
}

// Consulta precios (USD) y cambio 24h desde Coinbase por ticker.
// Precio: api.coinbase.com/v2/prices/<T>-USD/spot ; cambio 24h: exchange stats (open vs last).
async function fetchCoinbasePrices(tickers: string[]): Promise<Record<string, PriceInfo>> {
  const out: Record<string, PriceInfo> = {};
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const [spotRes, statsRes] = await Promise.all([
          fetch(`https://api.coinbase.com/v2/prices/${t}-USD/spot`, { next: { revalidate: 0 } }),
          fetch(`https://api.exchange.coinbase.com/products/${t}-USD/stats`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 0 },
          }).catch(() => null),
        ]);
        if (!spotRes.ok) return;
        const spot = await spotRes.json();
        const price = parseFloat(spot?.data?.amount);
        if (!price || !isFinite(price)) return;
        let change24h = 0;
        if (statsRes && statsRes.ok) {
          const stats = await statsRes.json();
          const open = parseFloat(stats?.open);
          const last = parseFloat(stats?.last);
          if (open > 0 && isFinite(last)) change24h = ((last - open) / open) * 100;
        }
        out[t] = { price, change24h };
      } catch {
        /* ignore */
      }
    }),
  );
  return out;
}
