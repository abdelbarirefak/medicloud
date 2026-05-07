"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile, Appointment } from "@/types/database";
import { Calendar, Clock, Users, CheckCircle2, TrendingUp, XCircle, Loader2 } from "lucide-react";

export default function DoctorDashboard() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0, completed: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(profileData);

    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
    if (!doctor) return;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // Today's appointments
    const { data: todayData } = await supabase
      .from("appointments")
      .select("*, patient:patients(*, profile:profiles(*))")
      .eq("doctor_id", doctor.id)
      .gte("date_time", startOfDay)
      .lt("date_time", endOfDay)
      .order("date_time", { ascending: true });
    setTodayAppts(todayData || []);

    // Stats
    const { count: total } = await supabase
      .from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctor.id);
    const { count: pending } = await supabase
      .from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctor.id).eq("status", "pending");
    const { count: completed } = await supabase
      .from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctor.id).eq("status", "completed");

    setStats({ total: total || 0, today: todayData?.length || 0, pending: pending || 0, completed: completed || 0 });
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    // Optimistic update
    const prev = [...todayAppts];
    setTodayAppts((a) => a.map((ap) => ap.id === id ? { ...ap, status: status as any } : ap));
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      setTodayAppts(prev); // Revert
    }
    setUpdatingId(null);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const statusLabel: Record<string, string> = {
    pending: "En attente", confirmed: "Confirmé", cancelled: "Annulé", completed: "Terminé",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Bonjour, Dr. {profile?.full_name?.split(" ").slice(-1)[0] || "—"} 👋
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">Voici votre tableau de bord</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total RDV", value: stats.total, icon: Calendar, color: "from-sky-500/20 to-sky-500/5", textColor: "text-teal-600" },
          { label: "Aujourd'hui", value: stats.today, icon: Clock, color: "from-amber-500/20 to-amber-500/5", textColor: "text-amber-400" },
          { label: "En attente", value: stats.pending, icon: TrendingUp, color: "from-violet-500/20 to-violet-500/5", textColor: "text-violet-400" },
          { label: "Terminés", value: stats.completed, icon: CheckCircle2, color: "from-emerald-500/20 to-emerald-500/5", textColor: "text-emerald-400" },
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

      {/* Today's appointments */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Patients du jour</h2>
        {todayAppts.length === 0 ? (
          <div className="card-gradient rounded-2xl p-8 text-center">
            <Users className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Aucun rendez-vous aujourd&apos;hui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppts.map((appt) => {
              const pat = appt.patient as unknown as { profile?: Profile };
              return (
                <div key={appt.id} className="card-gradient rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 flex items-center justify-center text-[var(--text-primary)] text-sm font-bold shrink-0">
                    {pat?.profile?.full_name?.charAt(0) || "P"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {pat?.profile?.full_name || "Patient"}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {formatTime(appt.date_time)} — {appt.motive || "Non précisé"}
                    </div>
                  </div>
                  <span className={`badge-${appt.status} px-2.5 py-0.5 rounded-lg text-xs font-medium`}>
                    {statusLabel[appt.status]}
                  </span>
                  {appt.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(appt.id, "confirmed")}
                        disabled={updatingId === appt.id}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                      >
                        {updatingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => updateStatus(appt.id, "cancelled")}
                        disabled={updatingId === appt.id}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {appt.status === "confirmed" && (
                    <button
                      onClick={() => updateStatus(appt.id, "completed")}
                      disabled={updatingId === appt.id}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-sky-500/20 transition text-xs font-medium"
                    >
                      Terminer
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
