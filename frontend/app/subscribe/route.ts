import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const fundId = String(form.get('fundId') ?? '');
  const base = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5087';
  const res = await fetch(`${base}/api/funds/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fundId })
  });
  const data = await res.json();
  return NextResponse.redirect(new URL('/', req.url));
}
