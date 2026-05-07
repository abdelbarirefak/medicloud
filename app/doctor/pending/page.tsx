"use client";

import Link from "next/link";
import { ShieldAlert, AlertCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PendingVerificationPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-dark)]">
      <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border)] p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex flex-col items-center justify-center mx-auto mb-6 text-amber-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
          Compte En Attente
        </h1>
        <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
          Votre compte médecin est actuellement en cours de vérification par notre équipe d'administration. 
          Veuillez patienter quelques heures pour que nous puissions valider vos informations professionnelles.
        </p>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 text-left mb-8">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-600">
            <strong>Pourquoi une vérification ?</strong>
            <p className="mt-1 opacity-80">
              Pour garantir la sécurité de nos patients, tous les comptes professionnels doivent être certifiés manuellement.
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-sm flex items-center justify-center gap-2 hover:bg-[var(--bg-card-hover)] transition"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
