"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getBalance } from '@/services/funds';

export const Balance: React.FC = () => {
    const [amount, setAmount] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatter = useMemo(() => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }), []);

    async function refresh() {
        try {
            setLoading(true);
            setError(null);
            const value = await getBalance();
            setAmount(value);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo obtener el saldo');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
    }, []);

        // Listen for external refresh requests (e.g., after subscribe/cancel)
        useEffect(() => {
            const handler = () => void refresh();
            if (typeof window !== 'undefined') {
                window.addEventListener('balance:refresh', handler);
            }
            return () => {
                if (typeof window !== 'undefined') {
                    window.removeEventListener('balance:refresh', handler);
                }
            };
        }, []);

    return (
        <div
            className="balance-card"
            role="region"
            aria-label="Saldo de la cuenta"
            style={{
            maxWidth: 360,
            padding: 16,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(2,6,23,0.6)',
            background: '#0f172a', // fondo más oscuro tipo sidebar
            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#E6EEF8' }}>Saldo</h3>
            <button
                type="button"
                aria-label="Actualizar saldo"
                title="Actualizar"
                style={{
                background: 'transparent',
                border: 0,
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: 14,
                padding: 6,
                }}
                onClick={refresh}
                disabled={loading}
            >
                {loading ? '…' : '⟳'}
            </button>
            </div>

            <div
            className="balance-amount"
            aria-live="polite"
            style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: 6,
                minHeight: 34,
            }}
            >
            {amount === null ? (
                <span style={{ fontSize: 16, color: '#9CA3AF' }}>Cargando…</span>
            ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: '#F8FAFC' }}>{formatter.format(amount)}</span>
            )}
            </div>

            {error ? (
            <div style={{ fontSize: 13, color: '#fca5a5' }}>{error}</div>
            ) : (
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                Última actualización:{' '}
                <time dateTime={lastUpdated ? lastUpdated.toISOString() : undefined}>
                {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
                </time>
            </div>
            )}
        </div>
    );
};
