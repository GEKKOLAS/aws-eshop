"use client";
import React, { useEffect, useState } from 'react';
import { getTransactions, getFunds } from '@/services/funds';
import type { TransactionDto } from '@/dtos/funds';

type FundDto = { id: number | string; name: string };

export const Transactions: React.FC = () => {
    const [items, setItems] = useState<TransactionDto[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fundNames, setFundNames] = useState<Record<string, string>>({});

    useEffect(() => {
        let m = true;
        (async () => {
            try {
                const [tx, funds] = await Promise.all([getTransactions(20), getFunds()]);
                if (!m) return;

                const map: Record<string, string> = {};
                (funds as FundDto[]).forEach(f => { map[String(f.id)] = f.name; });

                setItems(tx);
                setFundNames(map);
            } catch (e) {
                if (m) setError(e instanceof Error ? e.message : 'No se pudo cargar el histórico');
            }
        })();
        return () => { m = false; };
    }, []);

    if (error) return <div className="p-4 text-red-300">{error}</div>;
    if (items === null) return <div className="p-4 opacity-75">Cargando…</div>;

    if (items.length === 0) return <div className="p-4 opacity-75">Sin transacciones</div>;

    return (
        <div className="rounded border border-white/20">
            <div className="px-4 py-3 font-semibold border-b border-white/10">Transacciones</div>
            <ul>
                {items.map(t => (
                    <li key={t.id} className="px-4 py-3 flex items-center justify-between border-t border-white/10">
                        <div className="space-y-1">
                            <div className="text-sm opacity-80">ID: <span className="font-mono">{t.id}</span></div>
                            <div className="text-sm">
                                {t.type} · Fondo: <span className="font-medium">{fundNames[String(t.fundId)] ?? t.fundId}</span> · Monto: {t.amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                            </div>
                        </div>
                        <time className="text-xs opacity-70">{new Date(t.timestampUtc).toLocaleString()}</time>
                    </li>
                ))}
            </ul>
        </div>
    );
};
