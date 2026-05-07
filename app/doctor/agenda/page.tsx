"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Appointment, Profile } from "@/types/database";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

export default function DoctorAgendaPage() {
  const supabase = createClient();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Closing Appointment State
  const [selectedApptToClose, setSelectedApptToClose] = useState<Appointment | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [closing, setClosing] = useState(false);

  async function loadWeek() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
    if (!doctor) return;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data } = await supabase
      .from("appointments")
      .select("*, patient:patients(*, profile:profiles(*))")
      .eq("doctor_id", doctor.id)
      .gte("date_time", weekStart.toISOString())
      .lt("date_time", weekEnd.toISOString())
      .order("date_time", { ascending: true });

    setAppointments(data || []);
    setLoading(false);
  }

  useEffect(() => { loadWeek(); }, [weekStart]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function getDayDates() {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i); // Mon-Sat
      return d;
    });
  }

  function getApptForSlot(day: Date, hour: string): Appointment | undefined {
    return appointments.find((a) => {
      const d = new Date(a.date_time);
      return d.toDateString() === day.toDateString() &&
        d.getHours() === parseInt(hour.split(":")[0]);
    });
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (!error) {
      toast.success(`Le rendez-vous a été ${status === "confirmed" ? "confirmé" : "annulé"}`);
      await loadWeek();
    } else {
      toast.error("Erreur: " + error.message);
    }
    setUpdatingId(null);
  }

  async function handleCloseAppointment() {
    if (!selectedApptToClose) return;
    setClosing(true);

    // 1. Update appointment status
    const { error: apptError } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", selectedApptToClose.id);

    if (apptError) {
      toast.error("Erreur lors de la mise à jour: " + apptError.message);
      setClosing(false);
      return;
    }

    // 2. Insert Medical Record
    const { error: recordError } = await supabase
      .from("medical_records")
      .insert({
        patient_id: selectedApptToClose.patient_id,
        doctor_id: selectedApptToClose.doctor_id,
        diagnosis,
        prescription,
        notes
      });

    if (recordError) {
      toast.error("Erreur d'enregistrement du dossier: " + recordError.message);
    } else {
      toast.success("Rendez-vous clôturé et dossier patient mis à jour !");
    }

    // 3. Reset and refetch
    setClosing(false);
    setSelectedApptToClose(null);
    setDiagnosis("");
    setPrescription("");
    setNotes("");
    await loadWeek();
  }

  const dayDates = getDayDates();
  const monthLabel = weekStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/20 border-amber-500/30 text-amber-400",
    confirmed: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
    cancelled: "bg-red-500/20 border-red-500/30 text-red-400",
    completed: "bg-sky-500/20 border-teal-500/30 text-teal-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon Agenda</h1>
          <p className="text-[var(--text-secondary)] mt-1 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:hover:bg-[var(--bg-card-hover)] transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - d.getDay() + 1);
              d.setHours(0, 0, 0, 0);
              setWeekStart(d);
            }}
            className="px-4 py-2 rounded-xl bg-[var(--surface)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:hover:bg-[var(--bg-card-hover)] transition"
          >
            Cette semaine
          </button>
          <button onClick={nextWeek} className="p-2 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:hover:bg-[var(--bg-card-hover)] transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-1 mb-2">
              <div />
              {dayDates.map((d, i) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className={`text-center py-2 rounded-xl text-sm ${isToday ? "bg-sky-500/15 text-teal-600 font-semibold" : "text-[var(--text-secondary)]"}`}>
                    <div className="text-xs">{DAYS[d.getDay()]}</div>
                    <div className="text-lg font-bold">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Time slots grid */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[80px_repeat(6,1fr)] gap-1 mb-1">
                <div className="text-xs text-[var(--text-secondary)] py-3 text-right pr-3">{hour}</div>
                {dayDates.map((day, i) => {
                  const appt = getApptForSlot(day, hour);
                  if (!appt) {
                    return <div key={i} className="h-16 rounded-lg bg-[var(--surface)] border border-[var(--border)]" />;
                  }
                  const pat = appt.patient as unknown as { profile?: Profile };
                  return (
                    <div key={i} className={`h-16 rounded-lg border p-2 text-xs ${statusColor[appt.status]} flex flex-col justify-between`}>
                      <div className="font-medium truncate">{pat?.profile?.full_name || "Patient"}</div>
                      <div className="flex gap-1">
                        {appt.status === "pending" && (
                          <>
                            <button onClick={() => updateStatus(appt.id, "confirmed")} className="p-0.5 hover:scale-110 transition text-emerald-500" title="Confirmer">
                              {updatingId === appt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            </button>
                            <button onClick={() => updateStatus(appt.id, "cancelled")} className="p-0.5 hover:scale-110 transition text-red-500" title="Annuler">
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {appt.status === "confirmed" && (
                          <div className="flex flex-col gap-1.5 w-full">
                            <a
                              href={`/doctor/consultation/${appt.id}`}
                              className="w-full text-center bg-teal-500 hover:bg-teal-600 text-white text-[10px] uppercase font-bold py-1 px-1.5 rounded flex items-center justify-center gap-1 transition shadow-sm"
                              title="Lancer la téléconsultation HD"
                            >
                              🎥 Visio
                            </a>
                            <button 
                              onClick={() => setSelectedApptToClose(appt)} 
                              className="text-[10px] uppercase font-bold text-emerald-600 hover:underline flex items-center justify-center gap-1 w-full"
                              title="Rédiger l'ordonnance et clôturer"
                            >
                              <FileText className="w-3 h-3" /> Fiche
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clôture / Ordonnance Modal */}
      {selectedApptToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#111827]/60" onClick={() => !closing && setSelectedApptToClose(null)} />
          <div className="relative w-full max-w-lg card-gradient rounded-2xl p-6 z-10 border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Clôturer la Consultation
              </h3>
              <button disabled={closing} onClick={() => setSelectedApptToClose(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Veuillez saisir le diagnostic et l'ordonnance. Ces informations seront ajoutées au dossier médical du patient.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Diagnostic (Obligatoire)</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Symptômes, constatations..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm resize-none focus:border-teal-500"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Ordonnance / Prescription</label>
                <textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Liste des médicaments et posologie..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm resize-none font-mono focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Notes internes (Optionnel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes privées pour le prochain rdv..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm resize-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedApptToClose(null)}
                disabled={closing}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleCloseAppointment}
                disabled={closing || !diagnosis}
                className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Valider et Clôturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
