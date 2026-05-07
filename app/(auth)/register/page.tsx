"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Heart, Mail, Lock, User, Phone, Loader2, Stethoscope, UserCheck } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [role, setRole] = useState<"patient" | "doctor">(
    (searchParams.get("role") as "patient" | "doctor") || "patient"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone,
        },
      },
    });

    if (authError) {
      setError(
        authError.message === "User already registered"
          ? "Cet email est déjà utilisé"
          : authError.message
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <UserCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Compte créé !</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-sm">
            Une dernière étape : <strong>Veuillez consulter votre boîte de réception</strong> (ou vos courriers indésirables) et cliquez sur le lien de confirmation pour activer votre compte. Vous ne pourrez pas vous connecter avant !
          </p>
          <Link
            href="/login"
            className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white font-semibold text-sm"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
            <Heart className="w-6 h-6 text-[var(--text-primary)]" fill="white" />
          </div>
          <span className="text-2xl font-bold">
            Medi<span className="text-[var(--primary-light)]">Cloud</span>
          </span>
        </Link>

        <div className="card-gradient rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Créer un compte</h1>
          <p className="text-[var(--text-secondary)] text-center text-sm mb-6">
            Rejoignez MediCloud gratuitement
          </p>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("patient")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                role === "patient"
                  ? "bg-sky-500/20 border-teal-500/30 text-teal-600 border"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"
              }`}
            >
              <User className="w-4 h-4" />
              Patient
            </button>
            <button
              type="button"
              onClick={() => setRole("doctor")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                role === "doctor"
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 border"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Médecin
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === "doctor" ? "Dr. Mohammed Alami" : "Mohammed Alami"}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.ma"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-secondary)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6XX XXX XXX"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-secondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Création..." : `Créer mon compte ${role === "doctor" ? "médecin" : "patient"}`}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-[var(--text-secondary)]">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-[var(--primary-light)] hover:text-[var(--primary)] font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
