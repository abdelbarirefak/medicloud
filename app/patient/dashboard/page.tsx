"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile, Appointment } from "@/types/database";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  TrendingUp,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";

export default function PatientDashboard() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Get patient record
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!patient) return;

      // Get appointments with doctor info
      const { data: appts } = await supabase
        .from("appointments")
        .select(`*, doctor:doctors(*, profile:profiles(*))`)
        .eq("patient_id", patient.id)
        .order("date_time", { ascending: false })
        .limit(5);

      setAppointments(appts || []);

      // Stats
      const { count: total } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id);

      const { count: upcoming } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id)
        .in("status", ["pending", "confirmed"])
        .gte("date_time", new Date().toISOString());

      const { count: completed } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id)
        .eq("status", "completed");

      const { count: cancelled } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patient.id)
        .eq("status", "cancelled");

      setStats({
        total: total || 0,
        upcoming: upcoming || 0,
        completed: completed || 0,
        cancelled: cancelled || 0,
      });
    }
    load();
  }, [supabase]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusLabel: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé",
    completed: "Terminé",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {profile?.full_name?.split(" ")[0] || "Patient"} 👋
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Voici un résumé de votre espace santé
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total RDV", value: stats.total, icon: Calendar, color: "from-sky-500/20 to-sky-500/5", textColor: "text-teal-600" },
          { label: "À venir", value: stats.upcoming, icon: Clock, color: "from-amber-500/20 to-amber-500/5", textColor: "text-amber-400" },
          { label: "Terminés", value: stats.completed, icon: CheckCircle2, color: "from-emerald-500/20 to-emerald-500/5", textColor: "text-emerald-400" },
          { label: "Annulés", value: stats.cancelled, icon: XCircle, color: "from-red-500/20 to-red-500/5", textColor: "text-red-400" },
        ].map((stat) => (
          <div key={stat.label} className="card-gradient rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/patient/search"
          className="card-gradient rounded-2xl p-6 hover:bg-[var(--bg-card-hover)] transition-all group"
        >
          <Stethoscope className="w-8 h-8 text-[var(--primary-light)] mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Chercher un médecin</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Trouvez un spécialiste près de chez vous et réservez en ligne.
          </p>
        </Link>
        <Link
          href="/patient/appointments"
          className="card-gradient rounded-2xl p-6 hover:bg-[var(--bg-card-hover)] transition-all group"
        >
          <Calendar className="w-8 h-8 text-emerald-400 mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Mes rendez-vous</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Consultez, annulez ou reprogrammez vos prochains rendez-vous.
          </p>
        </Link>
      </div>

      {/* Recent Appointments */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Derniers rendez-vous</h2>
        {appointments.length === 0 ? (
          <div className="card-gradient rounded-2xl p-8 text-center">
            <Activity className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Aucun rendez-vous pour le moment</p>
            <Link
              href="/patient/search"
              className="inline-flex mt-4 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--text-primary)] text-sm font-medium hover:shadow-lg hover:shadow-teal-500/20 transition-all"
            >
              Prendre un rendez-vous
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="card-gradient rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent)]/10 flex items-center justify-center text-[var(--text-primary)] text-sm font-bold shrink-0">
                  {(appt.doctor as unknown as { profile?: Profile })?.profile?.full_name?.charAt(0) || "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    Dr. {(appt.doctor as unknown as { profile?: Profile })?.profile?.full_name || "—"}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatDate(appt.date_time)}
                  </div>
                </div>
                <span className={`badge-${appt.status} px-3 py-1 rounded-lg text-xs font-medium`}>
                  {statusLabel[appt.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
