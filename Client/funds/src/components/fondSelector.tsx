import { FundDto } from '@/dtos/funds';
import { getFunds, getBalance, subscribeToFund, cancelFund } from '@/services/funds';
import React, { useEffect, useMemo, useState } from 'react'

export const FondSelector = () => {
    const [funds, setFunds] = useState<FundDto[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Global contact info (required before subscribing to any fund)
  const [contactChannel, setContactChannel] = useState<"email" | "sms">("email");
  const [contactDest, setContactDest] = useState<string>("");
  const [loadingByFund, setLoadingByFund] = useState<Record<string, boolean>>({});

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isValidE164(v: string) {
    return /^\+[1-9]\d{7,14}$/.test(v);
  }
  const contactValid = useMemo(() => {
    const v = contactDest.trim();
    if (!v) return false;
    return contactChannel === 'email' ? isValidEmail(v) : isValidE164(v);
  }, [contactChannel, contactDest]);

  async function refresh() {
    const [f, b] = await Promise.all([getFunds(), getBalance()]);
    setFunds(f);
    setBalance(b);
  }

  async function onSubscribe(fundId: string) {
    try {
      setError(null);
      if (!contactValid) {
        const msg = "Debes proporcionar un email o teléfono válido antes de suscribirte";
        setError(msg);
        if (typeof window !== 'undefined') alert(msg);
        return;
      }
      const notifyChannel = contactChannel;
      const notifyDestination = contactDest.trim();
      setLoadingByFund((s) => ({ ...s, [fundId]: true }));
      await subscribeToFund(fundId, notifyChannel, notifyDestination);
      await refresh();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('balance:refresh'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al suscribirse";
      setError(msg);
      if (typeof window !== 'undefined' && msg.toLowerCase().includes('no tiene saldo disponible')) {
        alert(msg);
        // Re-render solo este componente refrescando sus datos, no toda la página
        await refresh();
        setError(null);
      }
    } finally {
      setLoadingByFund((s) => ({ ...s, [fundId]: false }));
    }
  }

  async function onCancel(fundId: string) {
    try {
      setError(null);
      setLoadingByFund((s) => ({ ...s, [fundId]: true }));
      await cancelFund(fundId);
      await refresh();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('balance:refresh'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cancelar";
      setError(msg);
      if (typeof window !== 'undefined' && msg.toLowerCase().includes('no tiene suscripción activa')) {
        alert(msg);
        // Re-render solo este componente refrescando sus datos, no toda la página
        await refresh();
        setError(null);
      }
    } finally {
      setLoadingByFund((s) => ({ ...s, [fundId]: false }));
    }
  }

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [f, b] = await Promise.all([getFunds(), getBalance()]);
        if (m) {
          setFunds(f);
          setBalance(b);
        }
      } catch (e) {
        if (m) setError(e instanceof Error ? e.message : "Fallo al consultar el backend");
      }
    })();
    return () => {
      m = false;
    };
  }, []);

  if (error) return <div className="p-6 text-red-300">{error}</div>;
  if (funds === null || balance === null) return <div className="p-6 opacity-75">Cargando…</div>;

  return (
    <div>
      {/* Global contact form */}
      <div className="mb-6 rounded border border-white/20 p-4 bg-white/5">
        <div className="font-semibold mb-2">Información de contacto</div>
        <div className="text-sm opacity-80 mb-3">Proporciona tu email o teléfono para recibir notificaciones. Es obligatorio para poder suscribirte.</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Canal
            <select
              className="ml-2 bg-transparent border border-white/30 rounded px-2 py-1"
              value={contactChannel}
              onChange={(e) => setContactChannel(e.target.value === 'sms' ? 'sms' : 'email')}
            >
              <option value="email">email</option>
              <option value="sms">sms</option>
            </select>
          </label>
          <label className="text-sm flex-1 min-w-60">
            Destino
            <input
              className={`block w-full mt-1 bg-transparent border rounded px-2 py-1 ${contactValid ? 'border-white/30' : 'border-rose-500'}`}
              placeholder={contactChannel === 'email' ? 'correo@dominio.com' : '+573001234567'}
              value={contactDest}
              onChange={(e) => setContactDest(e.target.value)}
            />
          </label>
          <div className="text-xs opacity-70">
            Estado: {contactValid ? <span className="text-emerald-300">válido</span> : <span className="text-rose-300">inválido</span>}
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {funds.map((f) => (
          <li key={f.id} className="rounded border border-white/20 p-4">
            <div className="font-semibold">{f.name}</div>
            <div className="text-sm opacity-80">
              Id: {f.id} · Categoría: {f.category ?? "-"} · Mínimo: {f.minAmount.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => onSubscribe(f.id)} disabled={!!loadingByFund[f.id] || !contactValid} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50" type="button">
                {loadingByFund[f.id] ? 'Procesando…' : 'Vincularse'}
              </button>
              <button onClick={() => onCancel(f.id)} disabled={!!loadingByFund[f.id]} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50" type="button">
                {loadingByFund[f.id] ? 'Procesando…' : 'Cancelar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
