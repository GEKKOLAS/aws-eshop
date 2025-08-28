import { FundsListSchema, type BalanceDto, type FundDto } from "../dtos/funds";
export type Fund = FundDto;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://localhost:7236";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!res.ok) {
    let message = "Error de la API";
    try {
      const body = (await res.json()) as any;
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  // Some endpoints may return no content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export async function getFunds(): Promise<Fund[]> {
  const data = await request<unknown>("/api/funds");
  return FundsListSchema.parse(data);
}

export async function getBalance(): Promise<number> {
  const data = await request<BalanceDto>("/api/funds/balance");
  // Primitive number; trust type here. Optionally, validate with z.number()
  return data;
}

export async function subscribeToFund(
  fundId: string,
  notifyChannel: "email" | "sms",
  notifyDestination: string
): Promise<void> {
  await request<unknown>("/api/funds/subscribe", {
    method: "POST",
    body: JSON.stringify({ fundId, notifyChannel, notifyDestination }),
  });
}

export async function cancelFund(fundId: string): Promise<void> {
  await request<unknown>("/api/funds/cancel", {
    method: "POST",
    body: JSON.stringify({ fundId }),
  });
}
