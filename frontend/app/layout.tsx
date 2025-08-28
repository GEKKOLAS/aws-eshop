import React from 'react';
import './globals.css';

export const metadata = { title: 'Funds', description: 'Funds frontend' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans">
        <div className="max-w-3xl mx-auto p-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Fondos</h1>
            <nav className="flex gap-3">
              <a className="underline" href="/">Inicio</a>
              <a className="underline" href="/transactions">Transacciones</a>
            </nav>
          </header>
          <main className="mt-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
