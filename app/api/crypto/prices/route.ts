export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCryptoPrices } from '@/lib/crypto-prices';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const url = new URL(req.url);
  const symbols = url.searchParams.get('symbols');
  if (!symbols) return NextResponse.json({});

  const force = url.searchParams.get('force') === '1';
  const tickers = symbols.split(',').map((s) => s.trim()).filter(Boolean);
  const prices = await getCryptoPrices(tickers, force);
  return NextResponse.json(prices);
}
