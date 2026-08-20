'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 Global Error Boundary Caught:', error);
  }, [error]);

  return (
    <html lang="de" className="dark bg-base">
      <body className="bg-base text-primary flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="max-w-lg w-full bg-surface border border-rose-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center font-bold text-lg">
              ⚠️
            </div>
            <h2 className="text-lg font-bold">Omni Global Error Boundary</h2>
          </div>

          <div className="p-4 rounded-2xl bg-base border border-subtle text-xs font-mono text-rose-300 break-words max-h-48 overflow-y-auto">
            {error?.message || 'Unbekannter Fehler im Layout'}
            {error?.stack && (
              <pre className="mt-2 text-[10px] text-muted whitespace-pre-wrap">{error.stack}</pre>
            )}
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            Anwendung zurücksetzen & neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
