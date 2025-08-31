"use client";
import React from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 space-y-3">
      <h2 className="text-lg font-semibold">Ocurrió un error</h2>
      <pre className="text-sm opacity-80 overflow-auto max-h-60">{error?.message}</pre>
      <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500" onClick={() => reset()}>Reintentar</button>
    </div>
  );
}
