"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[AdminError]", error); }, [error]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Erreur inattendue</h2>
        <p className="text-sm text-[var(--text-secondary)]">{error.message}</p>
        <button onClick={reset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition">
          <RotateCcw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    </div>
  );
}
