"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getTransactions, getFunds } from '@/services/funds';
import type { TransactionDto, FundDto } from '@/dtos/funds';

export const Subscriptions: React.FC = () => {
  const [tx, setTx] = useState<TransactionDto[] | null>(null);
  const [funds, setFunds] = useState<FundDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [t, f] = await Promise.all([getTransactions(200), getFunds()]);
        if (m) {
          setTx(t);
          setFunds(f);
        }
      } catch (e) {
        if (m) setError(e instanceof Error ? e.message : 'No se pudo cargar suscripciones');
      }
    })();
    return () => { m = false; };
  }, []);

  const active = useMemo(() => {
    if (!tx) return [] as Array<{ fundId: string; count: number }>;
    const map = new Map<string, number>();
    for (const t of tx) {
      const v = map.get(t.fundId) ?? 0;
      map.set(t.fundId, v + (t.type === 'Subscribe' ? 1 : -1));
    }
    return Array.from(map.entries())
      .filter(([, c]) => c > 0)
      .map(([fundId, count]) => ({ fundId, count }));
  }, [tx]);

  if (error) return <div className="p-4 text-red-300">{error}</div>;
  if (tx === null || funds === null) return <div className="p-4 opacity-75">Cargando…</div>;

  if (active.length === 0) return <div className="p-4 opacity-75">Sin suscripciones activas</div>;

  const fundById = new Map(funds.map(f => [f.id, f] as const));

  return (
    <div className="rounded border border-white/20">
      <div className="px-4 py-3 font-semibold border-b border-white/10">Suscripciones activas</div>
      <ul>
        {active.map(s => {
          const f = fundById.get(s.fundId);
          return (
            <li key={s.fundId} className="px-4 py-3 flex items-center justify-between border-t border-white/10">
              <div>
                <div className="font-medium">{f?.name ?? s.fundId}</div>
                <div className="text-sm opacity-80">Id: {s.fundId} · Vinculaciones: {s.count}</div>
              </div>
              {f && (
                <div className="text-sm">Mínimo: {f.minAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
