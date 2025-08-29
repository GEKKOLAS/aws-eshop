import type { FundDto, BalanceDto, TransactionDto } from "@/dtos/funds";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://localhost:7236";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `API error (${res.status})`;
    try {
      const body = (await res.json()) as unknown;
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as Record<string, unknown>).message;
        if (typeof m === 'string') msg = m;
      }
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getFunds(): Promise<FundDto[]> {
  return request<FundDto[]>("/api/funds");
}

export function getBalance(): Promise<BalanceDto> {
  return request<BalanceDto>("/api/funds/balance");
}

export function subscribeToFund(
  fundId: string,
  notifyChannel: "email" | "sms",
  notifyDestination: string
) {
  return request("/api/funds/subscribe", {
    method: "POST",
    body: JSON.stringify({ fundId, notifyChannel, notifyDestination }),
  });
}

export function cancelFund(fundId: string) {
  return request("/api/funds/cancel", {
    method: "POST",
    body: JSON.stringify({ fundId }),
  });
}

export function getTransactions(count = 10): Promise<TransactionDto[]> {
  const c = Number.isFinite(count) && count > 0 ? Math.floor(count) : 10;
  return request<TransactionDto[]>(`/api/funds/transactions?count=${c}`);
}
