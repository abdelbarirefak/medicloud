"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Heart,
  Clock,
  Shield,
  Search,
  Calendar,
  Star,
  ArrowRight,
  Activity,
  Users,
  CheckCircle2,
  Stethoscope,
  MapPin,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
    },
  }),
};

export default function HomePage() {
  const [stats, setStats] = useState({
    doctors: 0,
    patients: 0,
    appointments: 0,
    satisfaction: 98,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/public/stats");
        if (!res.ok) return;
        const json = await res.json();
        setStats(json);
      } catch {}
    }

    loadStats();
  }, []);

  return (
    <div className="min-h-screen mesh-gradient">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass fixed top-0 w-full z-50"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Heart className="w-4.5 h-4.5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Medi<span className="text-teal-600">Cloud</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-teal-600 transition">Fonctionnalités</a>
            <a href="#how" className="hover:text-teal-600 transition">Comment ça marche</a>
            <a href="#stats" className="hover:text-teal-600 transition">Statistiques</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-lg"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/30 hover:-translate-y-0.5 transition-all"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-16 left-[15%] w-[500px] h-[500px] bg-teal-400/[0.07] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-32 right-[10%] w-[400px] h-[400px] bg-indigo-400/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-teal-200/[0.08] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-8 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse-dot" />
            Plateforme Cloud de Santé Numérique
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6"
          >
            Prenez rendez-vous
            <br />
            <span className="gradient-text">en quelques clics</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Trouvez le médecin idéal près de chez vous, consultez ses
            disponibilités en temps réel et réservez votre créneau
            instantanément. <strong className="text-[var(--text-primary)]">24h/24, 7j/7.</strong>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-teal-600 to-indigo-500 rounded-2xl shadow-xl shadow-teal-600/15 hover:shadow-2xl hover:shadow-teal-600/25 hover:-translate-y-0.5 transition-all"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-base font-medium text-[var(--text-secondary)] rounded-2xl border border-[var(--border)] hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
            >
              J&apos;ai déjà un compte
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section id="stats" className="py-14 border-y border-[var(--border)] bg-white/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6 text-center">
          {[
            { value: `${stats.doctors}+`, label: "Médecins", icon: Stethoscope },
            { value: `${stats.patients}+`, label: "Patients", icon: Users },
            { value: `${stats.satisfaction}%`, label: "Satisfaction", icon: Star },
            { value: "24/7", label: "Disponible", icon: Clock },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-sm text-[var(--text-secondary)]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Une plateforme complète pour gérer votre santé, de la recherche de
              médecin au suivi de votre dossier médical.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Search,
                title: "Haute Disponibilité (Redis)",
                desc: "Recherche de médecins ultra-rapide protégée par un cache Upstash Redis Serverless.",
                gradient: "from-teal-500 to-teal-600",
              },
              {
                icon: Activity,
                title: "Automatisation Serverless",
                desc: "Tâches de fond via Vercel Cron Jobs pour nettoyer la BDD et archiver les vieux rendez-vous.",
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                icon: Shield,
                title: "Sécurité & Rôles (RLS)",
                desc: "Authentification robuste avec Supabase Auth et protection des lignes SQL via Row Level Security.",
                gradient: "from-indigo-500 to-indigo-600",
              },
              {
                icon: Calendar,
                title: "Notifications Intégrées",
                desc: "Rappels automatiques en temps réel via notifications in-app et WebSocket Supabase Realtime.",
                gradient: "from-rose-500 to-rose-600",
              },
              {
                icon: Heart,
                title: "Edge Runtime & Rate Limiting",
                desc: "API de recherche déployée sur 100+ Edge PoPs mondiaux (<50ms) avec rate limiting Upstash distribué.",
                gradient: "from-amber-500 to-amber-600",
              },
              {
                icon: MapPin,
                title: "100% PWA & Hors-Ligne",
                desc: "Application installable avec Service Worker 3 stratégies, page offline et bannière d'installation.",
                gradient: "from-cyan-500 to-cyan-600",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={scaleIn}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="card-gradient p-6 rounded-2xl cursor-default group"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg shadow-black/5`}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[15px] font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="py-28 px-6 bg-white/40">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-[var(--text-secondary)]">
              3 étapes simples pour prendre rendez-vous
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Cherchez un médecin",
                desc: "Filtrez par spécialité, ville ou disponibilité. Consultez les avis.",
              },
              {
                step: "02",
                title: "Choisissez un créneau",
                desc: "Sélectionnez un créneau disponible dans le calendrier du médecin.",
              },
              {
                step: "03",
                title: "Confirmez votre RDV",
                desc: "Recevez votre confirmation par email et un rappel automatique 24h avant.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <div className="text-6xl font-extrabold gradient-text mb-4 tracking-tighter">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {item.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center rounded-3xl p-12 md:p-16 bg-gradient-to-br from-teal-600 to-indigo-600 relative overflow-hidden shadow-2xl"
        >
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.07] rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Prêt à simplifier votre accès aux soins ?
            </h2>
            <p className="text-teal-100 mb-8 max-w-lg mx-auto">
              Créez votre compte gratuit et prenez votre premier rendez-vous en
              moins de 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group flex items-center gap-2 px-8 py-4 font-semibold text-teal-700 bg-white rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                Créer mon compte patient
              </Link>
              <Link
                href="/register?role=doctor"
                className="px-8 py-4 font-medium text-white/90 rounded-2xl border border-white/30 hover:bg-white/10 hover:text-white transition-all"
              >
                Je suis médecin
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-12 px-6 bg-white/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-600" fill="currentColor" />
            <span className="font-semibold">MediCloud</span>
            <span className="text-[var(--text-secondary)] text-sm ml-2">
              © 2026 · Projet Cloud ENSEM
            </span>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Next.js · TypeScript · Supabase · Vercel
          </div>
        </div>
      </footer>
    </div>
  );
}
