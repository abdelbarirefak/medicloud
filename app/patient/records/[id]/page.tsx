"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

type RecordDetail = {
  id: string;
  diagnosis: string;
  prescription: string | null;
  notes: string | null;
  created_at: string;
  doctor: { specialty: string; city: string; profile: { full_name: string; email: string } };
  patient: { profile: { full_name: string; email: string } };
};

export default function PrescriptionPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const supabase = createClient();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("medical_records")
        .select(`
          id, diagnosis, prescription, notes, created_at,
          doctor:doctors(specialty, city, profile:profiles(full_name, email)),
          patient:patients(profile:profiles(full_name, email))
        `)
        .eq("id", params.id)
        .single();
      if (data) setRecord(data as unknown as RecordDetail);
      setLoading(false);
    }
    load();
  }, [supabase, params.id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  if (!record) return <div className="text-center py-20 text-[var(--text-secondary)]">Dossier introuvable</div>;

  const date = new Date(record.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/patient/records" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="w-4 h-4" /> Retour aux documents
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
        >
          <Printer className="w-4 h-4" /> Imprimer / Exporter PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 print:border-0 print:shadow-none print:p-0" id="prescription-print">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">MediCloud</h1>
            <p className="text-sm text-slate-500">Plateforme de consultations en ligne</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-semibold">{date}</p>
            <p className="text-xs text-slate-400 mt-1">Ref: {record.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Doctor */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Médecin</h3>
            <p className="font-semibold text-slate-900">Dr. {record.doctor.profile.full_name}</p>
            <p className="text-sm text-slate-600">{record.doctor.specialty}</p>
            {record.doctor.city && <p className="text-sm text-slate-500">{record.doctor.city}</p>}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient</h3>
            <p className="font-semibold text-slate-900">{record.patient.profile.full_name}</p>
            <p className="text-sm text-slate-500">{record.patient.profile.email}</p>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnostic</h3>
          <p className="text-slate-800 leading-relaxed">{record.diagnosis}</p>
        </div>

        {/* Prescription */}
        {record.prescription && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-5 print:bg-white print:border print:border-slate-300">
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3">Ordonnance</h3>
            <p className="text-slate-800 whitespace-pre-wrap font-mono text-sm leading-relaxed">{record.prescription}</p>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-slate-600 text-sm">{record.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 mt-8 text-center text-xs text-slate-400">
          <p>Document généré automatiquement par MediCloud — Ce document n'a pas de valeur légale sans signature du médecin.</p>
        </div>
      </div>
    </div>
  );
}
