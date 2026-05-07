"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile, Patient } from "@/types/database";
import { User, Save, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PatientProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dob, setDob] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      setFullName(p?.full_name || "");
      setPhone(p?.phone || "");

      const { data: pat } = await supabase.from("patients").select("*").eq("user_id", user.id).single();
      setPatient(pat);
      setBloodGroup(pat?.blood_group || "");
      setAllergies(pat?.allergies?.join(", ") || "");
      setDob(pat?.date_of_birth || "");
      setEmergencyContact(pat?.emergency_contact || "");
    }
    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);

    if (patient) {
      await supabase.from("patients").update({
        blood_group: bloodGroup || null,
        allergies: allergies ? allergies.split(",").map((a) => a.trim()) : null,
        date_of_birth: dob || null,
        emergency_contact: emergencyContact || null,
      }).eq("id", patient.id);
    }

    setSaving(false);
    setSaved(true);
    toast.success("Profil mis à jour avec succès !");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-[var(--text-secondary)] mt-1">Gérez vos informations personnelles et médicales</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal info */}
        <div className="card-gradient rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--primary-light)]" />
            Informations personnelles
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Nom complet</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Email</label>
              <input type="email" value={profile?.email || ""} disabled
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-sm opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Téléphone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6XX XXX XXX"
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Date de naissance</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm" />
            </div>
          </div>
        </div>

        {/* Medical info */}
        <div className="card-gradient rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informations médicales</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Groupe sanguin</label>
              <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm">
                <option value="">Non précisé</option>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Contact d&apos;urgence</label>
              <input type="tel" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="+212..."
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Allergies (séparées par des virgules)</label>
            <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Pénicilline, Aspirine..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm" />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/20 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Enregistrement..." : saved ? "Enregistré !" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
