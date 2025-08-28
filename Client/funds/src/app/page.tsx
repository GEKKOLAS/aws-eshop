"use client";
import { useEffect, useState } from "react";
import { getFunds, getBalance, subscribeToFund, cancelFund } from "@/services/funds";
import type { FundDto } from "@/dtos/funds";

export default function Home() {
  const [funds, setFunds] = useState<FundDto[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelByFund, setChannelByFund] = useState<Record<string, "email" | "sms">>({});
  const [destByFund, setDestByFund] = useState<Record<string, string>>({});

  async function refresh() {
    const [f, b] = await Promise.all([getFunds(), getBalance()]);
    setFunds(f);
    setBalance(b);
  }

  async function onSubscribe(fundId: string) {
    try {
      setError(null);
      const notifyChannel = channelByFund[fundId] ?? "email";
      const notifyDestination = (destByFund[fundId] ?? "").trim();
      if (!notifyDestination) throw new Error("Escribe el destino (email o +E.164)");
      await subscribeToFund(fundId, notifyChannel, notifyDestination);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al suscribirse");
    }
  }

  async function onCancel(fundId: string) {
    try {
      setError(null);
      await cancelFund(fundId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar");
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
    <section className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Saldo: {balance.toLocaleString("es-CO", { style: "currency", currency: "COP" })}</h2>
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
                  onChange={(e) => setChannelByFund((s) => ({ ...s, [f.id]: e.target.value as any }))}
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
                  onChange={(e) => setDestByFund((s) => ({ ...s, [f.id]: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => onSubscribe(f.id)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500" type="button">
                Vincularse
              </button>
              <button onClick={() => onCancel(f.id)} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500" type="button">
                Cancelar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
