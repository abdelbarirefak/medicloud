"use client";

import { ShieldBan, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DeactivatedPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-dark)]">
      <div className="max-w-md w-full bg-[var(--bg-card)] rounded-2xl shadow-xl border border-red-500/20 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex flex-col items-center justify-center mx-auto mb-6 text-red-500">
          <ShieldBan className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
          Compte Désactivé
        </h1>
        <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
          Votre compte a été suspendu par l'administration du service MediCloud. 
          Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support technique.
        </p>

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
