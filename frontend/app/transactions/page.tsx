"use client";
import { useEffect, useState } from 'react';

type Tx = { id: string; type: 'Subscribe' | 'Cancel'; fundId: string; amount: number; timestampUtc: string };

export default function TransactionsPage() {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? 'https://localhost:7236';
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${base}/api/funds/transactions?count=20`, { cache: 'no-store' });
        if (!res.ok) throw new Error('API respondió con error');
        const data: Tx[] = await res.json();
        if (mounted) setTxs(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Fallo al consultar el backend');
      }
    })();
    return () => { mounted = false; };
  }, [base]);

  if (error) {
    return (
      <section>
        <h2 className="text-xl font-semibold">Error al cargar transacciones</h2>
        <pre className="mt-2 text-sm opacity-80">{error}</pre>
      </section>
    );
  }

  if (txs === null) return <div className="opacity-80">Cargando…</div>;

  return (
    <section>
      <h2 className="text-xl font-semibold">Últimas transacciones</h2>
      {txs.length === 0 ? (
        <p className="mt-3 opacity-80">No hay transacciones existentes.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {txs.map((t) => (
            <li key={t.id} className="rounded border border-white/20 p-3">
              <span className="font-semibold">{t.type}</span> · Fondo {t.fundId} · {new Date(t.timestampUtc).toLocaleString('es-CO')} · {t.amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
