"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Doctor, Profile } from "@/types/database";
import { Save, Loader2, User, Stethoscope, Upload, FileCheck } from "lucide-react";
import { toast } from "sonner";

export default function DoctorProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("Médecine Générale");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("200");
  const [experienceYears, setExperienceYears] = useState("0");
  const [languages, setLanguages] = useState("Français, Arabe");
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profileData }, { data: doctorData }, { data: specialtyData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("doctors").select("*").eq("user_id", user.id).single(),
        supabase.from("specialties").select("name").order("name", { ascending: true }),
      ]);

      setProfile(profileData);
      setDoctor(doctorData);
      setSpecialties((specialtyData || []).map((s) => s.name));
      setFullName(profileData?.full_name || "");
      setPhone(profileData?.phone || "");
      setSpecialty(doctorData?.specialty || "Médecine Générale");
      setCity(doctorData?.city || "");
      setAddress(doctorData?.address || "");
      setBio(doctorData?.bio || "");
      setPrice(String(doctorData?.price || 200));
      setExperienceYears(String(doctorData?.experience_years || 0));
      setLanguages((doctorData?.languages || ["Français", "Arabe"]).join(", "));
      setKycUrl(doctorData?.kyc_document_url || null);
      setLoading(false);
    }

    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doctor || !profile) return;
    setSaving(true);

    const parsedPrice = Number(price);
    const parsedExperience = Number(experienceYears);

    const [{ error: profileError }, { error: doctorError }] = await Promise.all([
      supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id),
      supabase.from("doctors").update({
        specialty,
        city,
        address: address || null,
        bio: bio || null,
        price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        experience_years: Number.isFinite(parsedExperience) ? parsedExperience : 0,
        languages: languages.split(",").map((lang) => lang.trim()).filter(Boolean),
      }).eq("id", doctor.id),
    ]);

    setSaving(false);

    if (profileError || doctorError) {
      toast.error(profileError?.message || doctorError?.message || "Erreur d'enregistrement");
      return;
    }

    toast.success("Profil médecin mis à jour");
    fetch("/api/cache/invalidate", { method: "POST" }).catch(() => {});
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil médecin</h1>
        <p className="text-[var(--text-secondary)] mt-1">Gérez vos informations publiques et professionnelles</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card-gradient rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5 text-teal-600" /> Informations personnelles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Nom complet</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
            </div>
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="w-5 h-5 text-teal-600" /> Informations professionnelles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Spécialité</label>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm">
                {[specialty, ...specialties.filter((s) => s !== specialty)].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Ville</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Tarif (MAD)</label>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Années d'expérience</label>
              <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Langues (séparées par virgules)</label>
            <input value={languages} onChange={(e) => setLanguages(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm resize-none" />
          </div>
        </div>

        <div className="card-gradient rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-5 h-5 text-teal-600" /> Document KYC (Diplôme / Pièce d'identité)</h2>
          <p className="text-sm text-[var(--text-secondary)]">Envoyez un justificatif pour accélérer votre vérification par l'administration.</p>
          {kycUrl ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Document envoyé</span>
              <a href={kycUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-teal-600 underline">Voir</a>
            </div>
          ) : (
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={uploadingKyc}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !doctor || !profile) return;
                  if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 Mo"); return; }
                  setUploadingKyc(true);
                  const ext = file.name.split(".").pop();
                  const path = `kyc/${profile.id}/${Date.now()}.${ext}`;
                  const { error: upErr } = await supabase.storage.from("vault").upload(path, file);
                  if (upErr) { toast.error(upErr.message); setUploadingKyc(false); return; }
                  const { data: urlData } = supabase.storage.from("vault").getPublicUrl(path);
                  const publicUrl = urlData.publicUrl;
                  await supabase.from("doctors").update({ kyc_document_url: publicUrl }).eq("id", doctor.id);
                  setKycUrl(publicUrl);
                  setUploadingKyc(false);
                  toast.success("Document KYC envoyé");
                }}
              />
              <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center hover:border-teal-400 transition">
                {uploadingKyc ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /> : <Upload className="w-6 h-6 mx-auto text-[var(--text-secondary)] mb-2" />}
                <span className="text-sm text-[var(--text-secondary)]">{uploadingKyc ? "Envoi en cours..." : "Cliquez ou glissez un fichier (PDF, image)"}</span>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
