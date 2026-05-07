"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Appointment, Profile } from "@/types/database";
import { Calendar, XCircle, Loader2, RotateCcw, Star, LayoutList, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function PatientAppointmentsPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [reviewAppt, setReviewAppt] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const pageSize = 8;

  async function loadAppointments() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: patient } = await supabase
      .from("patients").select("id").eq("user_id", user.id).single();
    if (!patient) return;

    let q = supabase
      .from("appointments")
      .select("*, doctor:doctors(*, profile:profiles(*)), review:reviews(id)", { count: "exact" })
      .eq("patient_id", patient.id)
      .order("date_time", { ascending: false });

    if (filter !== "all") q = q.eq("status", filter);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count } = await q.range(from, to);
    setAppointments(data || []);
    setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));

    // Also load all appointments for calendar (only once or when needed)
    const { data: allData } = await supabase
      .from("appointments")
      .select("*, doctor:doctors(*, profile:profiles(*))")
      .eq("patient_id", patient.id)
      .order("date_time", { ascending: true });
    setAllAppointments(allData || []);
    setLoading(false);
  }

  useEffect(() => { loadAppointments(); }, [filter, page]);
  useEffect(() => { setPage(1); }, [filter]);

  useEffect(() => {
    async function loadSlots() {
      if (!rescheduleAppt || !rescheduleDate) {
        setAvailableSlots([]);
        return;
      }

      const url = new URL("/api/search/slots", window.location.origin);
      url.searchParams.set("doctorId", rescheduleAppt.doctor_id);
      url.searchParams.set("date", rescheduleDate);
      const res = await fetch(url.toString());
      const json = await res.json();
      setAvailableSlots(json.slots || []);
      setRescheduleTime("");
    }

    loadSlots();
  }, [rescheduleAppt, rescheduleDate]);

  async function cancelAppointment(id: string) {
    setCancellingId(id);
    // Optimistic update
    const prev = [...appointments];
    setAppointments((a) => a.map((ap) => ap.id === id ? { ...ap, status: "cancelled" as const } : ap));
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      setAppointments(prev); // Revert on error
      toast.error("Erreur lors de l'annulation");
    } else {
      toast.success("Rendez-vous annulé");
    }
    setCancellingId(null);
  }

  async function saveReschedule() {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return;
    setSavingReschedule(true);

    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: rescheduleAppt.id,
        dateTime: new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString(),
      }),
    });

    setSavingReschedule(false);

    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || "Erreur de reprogrammation");
      return;
    }

    toast.success("Rendez-vous reprogrammé");
    setRescheduleAppt(null);
    setRescheduleDate("");
    setRescheduleTime("");
    await loadAppointments();
  }

  async function submitReview() {
    if (!reviewAppt) return;
    setSavingReview(true);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: reviewAppt.id, rating, comment }),
    });

    setSavingReview(false);

    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || "Erreur d'avis");
      return;
    }

    toast.success("Merci pour votre avis");
    setReviewAppt(null);
    setRating(5);
    setComment("");
    await loadAppointments();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const statusLabel: Record<string, string> = {
    pending: "En attente", confirmed: "Confirmé", cancelled: "Annulé", completed: "Terminé",
  };

  const filters = [
    { key: "all", label: "Tous" },
    { key: "pending", label: "En attente" },
    { key: "confirmed", label: "Confirmés" },
    { key: "completed", label: "Terminés" },
    { key: "cancelled", label: "Annulés" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes rendez-vous</h1>
          <p className="text-[var(--text-secondary)] mt-1">Gérez et suivez vos consultations</p>
        </div>
        <div className="flex gap-1 bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)]">
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-teal-600 text-white" : "text-[var(--text-secondary)]"}`} title="Liste"><LayoutList className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("calendar")} className={`p-2 rounded-lg transition ${viewMode === "calendar" ? "bg-teal-600 text-white" : "text-[var(--text-secondary)]"}`} title="Calendrier"><CalendarDays className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-sky-500/20 text-teal-600 border border-teal-500/30"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:hover:bg-[var(--bg-card-hover)] border border-transparent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && !loading && (() => {
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const firstDow = new Date(calYear, calMonth, 1).getDay();
        const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
        const dayNames = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
        const statusColors: Record<string,string> = { pending: "bg-amber-400", confirmed: "bg-emerald-400", completed: "bg-teal-400", cancelled: "bg-red-300" };
        const apptsByDay: Record<number, Appointment[]> = {};
        allAppointments.forEach((a) => {
          const d = new Date(a.date_time);
          if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
            const day = d.getDate();
            if (!apptsByDay[day]) apptsByDay[day] = [];
            apptsByDay[day].push(a);
          }
        });
        return (
          <div className="card-gradient rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-secondary)]"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold text-[var(--text-primary)]">{monthNames[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-secondary)]"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {dayNames.map((d) => <div key={d} className="text-[10px] font-bold text-[var(--text-secondary)] uppercase py-1">{d}</div>)}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayAppts = apptsByDay[day] || [];
                const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                return (
                  <div key={day} className={`relative p-1.5 rounded-lg text-xs min-h-[40px] flex flex-col items-center ${isToday ? "bg-teal-50 border border-teal-300" : "hover:bg-[var(--surface)]"}`}>
                    <span className={`font-medium ${isToday ? "text-teal-700" : "text-[var(--text-primary)]"}`}>{day}</span>
                    {dayAppts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayAppts.slice(0, 3).map((a) => <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${statusColors[a.status] || "bg-slate-300"}`} title={`${new Date(a.date_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} - ${a.status}`} />)}
                        {dayAppts.length > 3 && <span className="text-[8px] text-[var(--text-secondary)]">+{dayAppts.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-[var(--text-secondary)]">
              {Object.entries(statusColors).map(([s, c]) => <span key={s} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${c}`} />{statusLabel[s]}</span>)}
            </div>
          </div>
        );
      })()}

      {/* Appointments list */}
      {loading ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">Chargement...</div>
      ) : appointments.length === 0 ? (
        <div className="card-gradient rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucun rendez-vous</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {filter === "all" ? "Vous n'avez pas encore pris de rendez-vous." : `Aucun rendez-vous ${statusLabel[filter]?.toLowerCase() || ""}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const doc = appt.doctor as unknown as { profile?: Profile; specialty?: string };
            const reviews = (appt as Appointment & { review?: { id: string }[] }).review || [];
            const isPast = new Date(appt.date_time) < new Date();
            const canCancel = !isPast && (appt.status === "pending" || appt.status === "confirmed");
            const canReview = appt.status === "completed" && reviews.length === 0;

            return (
              <div key={appt.id} className="card-gradient rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent)]/10 flex items-center justify-center text-[var(--text-primary)] text-sm font-bold shrink-0">
                    {doc?.profile?.full_name?.charAt(0) || "D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">
                        Dr. {doc?.profile?.full_name || "—"}
                      </h3>
                      <span className={`badge-${appt.status} px-2.5 py-0.5 rounded-lg text-xs font-medium`}>
                        {statusLabel[appt.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--primary-light)] mb-2">{doc?.specialty}</p>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(appt.date_time)}
                      </span>
                    </div>
                    {appt.motive && (
                      <p className="text-xs text-[var(--text-secondary)] mt-2 bg-[var(--surface)] px-3 py-2 rounded-lg">
                        {appt.motive}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {appt.status === "confirmed" && (
                      <a
                        href={`/patient/consultation/${appt.id}`}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-sky-500 hover:shadow-lg hover:shadow-teal-500/25 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        🎥 Rejoindre la Visio
                      </a>
                    )}
                    {canCancel && (
                      <>
                      <button
                        onClick={() => setRescheduleAppt(appt)}
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium text-teal-600 border border-teal-500/20 hover:bg-teal-50 focus:ring-2 focus:ring-teal-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reprogrammer
                      </button>
                      <button
                        onClick={() => cancelAppointment(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium text-red-500 border border-red-500/20 hover:bg-red-50 focus:ring-2 focus:ring-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {cancellingId === appt.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Annuler
                      </button>
                      </>
                    )}
                    {canReview && (
                      <button
                        onClick={() => setReviewAppt(appt)}
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium text-amber-600 border border-amber-500/20 hover:bg-amber-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Avis
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-50">
            Précédent
          </button>
          <span className="text-sm text-[var(--text-secondary)]">Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-50">
            Suivant
          </button>
        </div>
      )}

      {rescheduleAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRescheduleAppt(null)} />
          <div className="relative card-gradient rounded-2xl p-6 w-full max-w-md z-10">
            <h3 className="text-xl font-bold mb-2">Reprogrammer le rendez-vous</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">Choisissez une nouvelle date et un créneau disponible.</p>
            <div className="space-y-4">
              <input type="date" min={new Date().toISOString().split("T")[0]} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <button key={slot} onClick={() => setRescheduleTime(slot)} className={`py-2 rounded-xl text-xs font-medium border ${rescheduleTime === slot ? "bg-teal-600 text-white border-teal-600" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"}`}>
                    {slot}
                  </button>
                ))}
              </div>
              {rescheduleDate && availableSlots.length === 0 && <p className="text-xs text-[var(--text-secondary)]">Aucun créneau disponible.</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRescheduleAppt(null)} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">Annuler</button>
              <button onClick={saveReschedule} disabled={savingReschedule || !rescheduleDate || !rescheduleTime} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-50">
                {savingReschedule ? "Enregistrement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReviewAppt(null)} />
          <div className="relative card-gradient rounded-2xl p-6 w-full max-w-md z-10">
            <h3 className="text-xl font-bold mb-2">Donner votre avis</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">Votre note aide les autres patients à choisir leur praticien.</p>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} onClick={() => setRating(value)} className={value <= rating ? "text-amber-400" : "text-slate-300"}>
                  <Star className="w-7 h-7" fill="currentColor" />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Commentaire optionnel..." className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm resize-none" />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setReviewAppt(null)} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">Annuler</button>
              <button onClick={submitReview} disabled={savingReview} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50">
                {savingReview ? "Envoi..." : "Publier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
