'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 Omni App Error Boundary caught exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0d1528] border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">Ein unerwarteter Fehler ist aufgetreten</h2>
          <p className="text-xs text-slate-400 font-mono break-words">
            {error?.message || 'Laufzeitfehler beim Laden der Anwendung.'}
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Seite erneut laden</span>
        </button>
      </div>
    </div>
  );
}
