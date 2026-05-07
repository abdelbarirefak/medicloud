"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-teal-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Vous êtes hors ligne
        </h1>
        <p className="text-slate-500 mb-8">
          Vérifiez votre connexion Internet et réessayez. MediCloud nécessite
          une connexion pour accéder à vos rendez-vous et données médicales.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>

        <p className="text-xs text-slate-400 mt-8">
          MediCloud — Application installée en mode hors-ligne
        </p>
      </div>
    </div>
  );
}
