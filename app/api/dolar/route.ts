export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchBcraDolar } from '@/lib/dolar';

// Devuelve la cotización del Dólar USD en tiempo real desde el BCRA.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const live = await fetchBcraDolar();
  if (!live) {
    return NextResponse.json({ error: 'No se pudo obtener la cotización del BCRA' }, { status: 502 });
  }
  return NextResponse.json({ rate: live.rate, fecha: live.fecha, source: 'BCRA' });
}
