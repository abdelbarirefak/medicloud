"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { Users, FileText, Search } from "lucide-react";

interface PatientWithProfile {
  id: string;
  user_id: string;
  blood_group: string | null;
  allergies: string[] | null;
  profile: Profile;
}

export default function DoctorPatientsPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctor) return;

      // Get unique patient IDs from appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", doctor.id);

      if (!appts || appts.length === 0) { setLoading(false); return; }

      const uniquePatientIds = [...new Set(appts.map((a) => a.patient_id))];

      const { data: patientData } = await supabase
        .from("patients")
        .select("*, profile:profiles(*)")
        .in("id", uniquePatientIds);

      setPatients((patientData || []) as unknown as PatientWithProfile[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = query.trim()
    ? patients.filter((p) => p.profile?.full_name?.toLowerCase().includes(query.toLowerCase()))
    : patients;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes patients</h1>
        <p className="text-[var(--text-secondary)] mt-1">{patients.length} patients au total</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Chercher un patient..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="card-gradient rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucun patient</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Vos patients apparaîtront ici une fois qu&apos;ils auront pris rendez-vous.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((pat) => (
            <div key={pat.id} className="card-gradient rounded-2xl p-5 hover:bg-[var(--bg-card-hover)] transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 flex items-center justify-center text-[var(--text-primary)] text-sm font-bold shrink-0">
                  {pat.profile?.full_name?.charAt(0) || "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{pat.profile?.full_name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{pat.profile?.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                {pat.blood_group && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">{pat.blood_group}</span>
                  </div>
                )}
                {pat.allergies && pat.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pat.allergies.map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
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
    </div>
  );
}
