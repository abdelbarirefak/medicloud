"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-[var(--text-secondary)]">{error.message || "Quelque chose s'est mal passé."}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-semibold text-sm hover:shadow-lg transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    </div>
  );
}
