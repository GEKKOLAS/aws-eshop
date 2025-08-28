"use client";
import { useEffect, useState } from "react";
import { getFunds, getBalance, subscribeToFund, cancelFund, type Fund } from "@/services/funds";

export default function Page() {
  const [funds, setFunds] = useState<Fund[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelByFund, setChannelByFund] = useState<Record<string, "email" | "sms">>({});
  const [destByFund, setDestByFund] = useState<Record<string, string>>({});

  async function refreshData() {
  const [f, b] = await Promise.all([getFunds(), getBalance()]);
  setFunds(f);
  setBalance(b);
  }

  async function subscribe(fundId: string) {
    try {
      setError(null);
  const notifyChannel = channelByFund[fundId] ?? "email";
  const notifyDestination = (destByFund[fundId] ?? "").trim();
      if (!notifyDestination)
        throw new Error(notifyChannel === "sms" ? "Ingresa un número E.164 (ej: +573001234567)" : "Ingresa un correo válido");
  await subscribeToFund(fundId, notifyChannel, notifyDestination);
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al suscribirse");
    }
  }

  async function cancel(fundId: string) {
    try {
      setError(null);
  await cancelFund(fundId);
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar");
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [f, b] = await Promise.all([getFunds(), getBalance()]);
        if (mounted) {
          setFunds(f);
          setBalance(b);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Fallo al consultar el backend");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <section>
        <h2 className="text-xl font-semibold">Error al cargar datos</h2>
        <pre className="mt-2 text-sm opacity-80">{error}</pre>
  <p className="mt-2">Verifica que la API esté corriendo en {process.env.NEXT_PUBLIC_API_BASE ?? "https://localhost:7236"} y recarga la página.</p>
      </section>
    );
  }

  if (funds === null || balance === null) {
    return <div className="opacity-80">Cargando…</div>;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold">Saldo: {balance.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</h2>
      <h3 className="mt-4 mb-2 text-lg font-medium">Fondos disponibles</h3>
      <ul className="space-y-3">
        {funds.map((f) => (
          <li key={f.id} className="rounded border border-white/20 p-4">
            <div className="font-semibold">{f.name}</div>
            <div className="text-sm opacity-80">
              Id: {f.id} · Categoría: {f.category ?? "-"} · Mínimo: {f.minAmount.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
            </div>
            <div className="flex flex-wrap items-end gap-3 mt-3">
              <label className="text-sm">
                Canal
                <select
                  className="ml-2 bg-transparent border border-white/30 rounded px-2 py-1"
                  value={channelByFund[f.id] ?? "email"}
                  onChange={e => setChannelByFund(s => ({ ...s, [f.id]: e.target.value as any }))}
                >
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                </select>
              </label>
              <label className="text-sm flex-1 min-w-60">
                Destino
                <input
                  className="block w-full mt-1 bg-transparent border border-white/30 rounded px-2 py-1"
                  placeholder="correo@dominio.com o +573001234567"
                  value={destByFund[f.id] ?? ""}
                  onChange={e => setDestByFund(s => ({ ...s, [f.id]: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => subscribe(f.id)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500" type="button">
                Vincularse
              </button>
              <button onClick={() => cancel(f.id)} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500" type="button">
                Cancelar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
