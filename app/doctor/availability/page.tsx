"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Availability } from "@/types/database";
import { CalendarClock, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

type Row = {
  id?: string;
  day_of_week: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_duration: number;
};

function defaultRows(): Row[] {
  return DAYS.map((day) => ({
    day_of_week: day.value,
    enabled: day.value !== 0,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration: 30,
  }));
}

export default function DoctorAvailabilityPage() {
  const supabase = createClient();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(defaultRows());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return;
      setDoctorId(doctor.id);

      const { data } = await supabase.from("availability").select("*").eq("doctor_id", doctor.id);
      const defaults = defaultRows();

      if (data && data.length > 0) {
        setRows(defaults.map((row) => {
          const existing = (data as Availability[]).find((a) => a.day_of_week === row.day_of_week);
          return existing ? {
            id: existing.id,
            day_of_week: existing.day_of_week,
            enabled: true,
            start_time: existing.start_time.slice(0, 5),
            end_time: existing.end_time.slice(0, 5),
            slot_duration: existing.slot_duration,
          } : { ...row, enabled: false };
        }));
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  function updateRow(day: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => row.day_of_week === day ? { ...row, ...patch } : row));
  }

  async function handleSave() {
    if (!doctorId) return;
    setSaving(true);

    const { error: deleteError } = await supabase.from("availability").delete().eq("doctor_id", doctorId);
    if (deleteError) {
      setSaving(false);
      toast.error(deleteError.message);
      return;
    }

    const enabledRows = rows.filter((row) => row.enabled).map((row) => ({
      doctor_id: doctorId,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      slot_duration: row.slot_duration,
    }));

    const { error } = enabledRows.length > 0
      ? await supabase.from("availability").insert(enabledRows)
      : { error: null };

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Disponibilités enregistrées");
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6 text-teal-600" /> Mes disponibilités</h1>
        <p className="text-[var(--text-secondary)] mt-1">Définissez vos jours de travail, horaires et durée des créneaux.</p>
      </div>

      <div className="card-gradient rounded-2xl p-6 space-y-4">
        {rows.map((row) => {
          const day = DAYS.find((d) => d.value === row.day_of_week)?.label || "Jour";
          return (
            <div key={row.day_of_week} className="grid md:grid-cols-[160px_1fr_1fr_1fr] gap-3 items-center p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input type="checkbox" checked={row.enabled} onChange={(e) => updateRow(row.day_of_week, { enabled: e.target.checked })} />
                {day}
              </label>
              <input type="time" value={row.start_time} disabled={!row.enabled} onChange={(e) => updateRow(row.day_of_week, { start_time: e.target.value })} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm disabled:opacity-50" />
              <input type="time" value={row.end_time} disabled={!row.enabled} onChange={(e) => updateRow(row.day_of_week, { end_time: e.target.value })} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm disabled:opacity-50" />
              <select value={row.slot_duration} disabled={!row.enabled} onChange={(e) => updateRow(row.day_of_week, { slot_duration: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm disabled:opacity-50">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}
