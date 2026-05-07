"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Doctor, Profile } from "@/types/database";
import { Search, MapPin, Star, Filter, Stethoscope, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type DoctorResult = Doctor & {
  profile?: Profile;
  reviews?: { id: string; rating: number; comment: string | null; patient?: { profile?: Profile } }[];
};

export default function DoctorSearchPage() {
  const supabase = createClient();
  const [doctors, setDoctors] = useState<DoctorResult[]>([]);
  const [specialties, setSpecialties] = useState<string[]>(["Tous"]);
  const [cities, setCities] = useState<string[]>(["Toutes"]);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("Tous");
  const [city, setCity] = useState("Toutes");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingMotive, setBookingMotive] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    async function loadDoctors() {
      setLoading(true);
      
      // Interrogation de notre serveur Edge (qui va se renseigner auprès du Cache Redis)
      const url = new URL("/api/search/doctors", window.location.origin);
      if (specialty !== "Tous") url.searchParams.append("specialty", specialty);
      if (city !== "Toutes") url.searchParams.append("city", city);
      if (query.trim()) url.searchParams.append("q", query.trim());
      url.searchParams.append("page", String(page));
      url.searchParams.append("pageSize", "9");

      try {
        const res = await fetch(url.toString());
        const json = await res.json();
        setDoctors(json.data || []);
        setSpecialties(json.specialties || ["Tous"]);
        setCities(json.cities || ["Toutes"]);
        setTotalPages(json.totalPages || 1);
      } catch (err) {
        toast.error("Échec de la récupération des données.");
      }
      setLoading(false);
    }
    loadDoctors();
  }, [specialty, city, query, page]);

  useEffect(() => {
    setPage(1);
  }, [specialty, city, query]);

  useEffect(() => {
    async function loadSlots() {
      if (!selectedDoctor || !bookingDate) {
        setAvailableSlots([]);
        return;
      }

      const url = new URL("/api/search/slots", window.location.origin);
      url.searchParams.set("doctorId", selectedDoctor.id);
      url.searchParams.set("date", bookingDate);

      const res = await fetch(url.toString());
      const json = await res.json();
      setAvailableSlots(json.slots || []);
      setBookingTime("");
    }

    loadSlots();
  }, [selectedDoctor, bookingDate]);

  async function handleBook() {
    if (!selectedDoctor || !bookingDate || !bookingTime || !bookingMotive) return;
    setBookingLoading(true);

    const dateTime = new Date(`${bookingDate}T${bookingTime}:00`).toISOString();
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId: selectedDoctor.id,
        dateTime,
        motive: bookingMotive,
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || "Erreur de réservation");
      setBookingLoading(false);
      return;
    }

    toast.success("Rendez-vous créé avec succès !");
    setBookingSuccess(true);
    setBookingLoading(false);
    setTimeout(() => {
      setSelectedDoctor(null);
      setBookingSuccess(false);
      setBookingDate("");
      setBookingTime("");
      setBookingMotive("");
    }, 2500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trouver un médecin</h1>
        <p className="text-[var(--text-secondary)] mt-1">Recherchez par nom, spécialité ou ville</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un médecin, une spécialité..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${
            showFilters
              ? "border-teal-500/30 bg-teal-500/10 text-teal-600"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Filter pills */}
      {showFilters && (
        <div className="card-gradient rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Spécialité</label>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {specialties.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecialty(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    specialty === s
                      ? "bg-sky-500/20 text-teal-600 border border-teal-500/30"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:hover:bg-[var(--bg-card-hover)] border border-transparent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Ville</label>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    city === c
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:hover:bg-[var(--bg-card-hover)] border border-transparent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">Chargement...</div>
      ) : doctors.length === 0 ? (
        <div className="card-gradient rounded-2xl p-12 text-center">
          <Stethoscope className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucun médecin trouvé</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Essayez de modifier vos critères de recherche.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="card-gradient rounded-2xl p-5 hover:bg-[var(--bg-card-hover)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/40 to-[var(--accent)]/20 flex items-center justify-center text-[var(--text-primary)] text-lg font-bold shrink-0">
                  {doc.profile?.full_name?.charAt(0) || "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">
                    Dr. {doc.profile?.full_name || "—"}
                  </h3>
                  <p className="text-xs text-[var(--primary-light)]">{doc.specialty}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <Star className="w-3.5 h-3.5" fill="currentColor" />
                  {doc.rating}
                </div>
              </div>

              <div className="space-y-2 text-xs text-[var(--text-secondary)] mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {doc.city || "Non précisé"}
                  {doc.address && ` — ${doc.address}`}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {doc.experience_years} ans d&apos;expérience
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[var(--text-primary)]">{doc.price} MAD</span>
                <button
                  onClick={() => setSelectedDoctor(doc)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-xs font-semibold hover:shadow-lg hover:shadow-teal-500/20 transition-all"
                >
                  Réserver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-[var(--text-secondary)]">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setSelectedDoctor(null); setBookingSuccess(false); }} />
          <div className="relative w-full max-w-md card-gradient rounded-2xl p-6 z-10 max-h-[90vh] overflow-y-auto hide-scrollbar">
            {bookingSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Rendez-vous créé !</h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  Votre demande a été envoyée au Dr. {selectedDoctor.profile?.full_name}.
                  Vous recevrez une confirmation bientôt.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-1">Réserver un rendez-vous</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Dr. {selectedDoctor.profile?.full_name} — {selectedDoctor.specialty}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Heure (Créneaux disponibles)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((t) => (
                        <button
                          key={t}
                          onClick={() => setBookingTime(t)}
                          className={`py-2 rounded-xl text-xs font-medium transition-all ${
                            bookingTime === t 
                              ? "bg-sky-500 text-[var(--text-primary)] shadow-md shadow-teal-500/20" 
                              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {bookingDate && availableSlots.length === 0 && (
                      <p className="text-xs text-[var(--text-secondary)] mt-2">
                        Aucun créneau disponible pour cette date.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Motif de consultation</label>
                    <textarea
                      value={bookingMotive}
                      onChange={(e) => setBookingMotive(e.target.value)}
                      placeholder="Décrivez brièvement votre motif..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 text-sm resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] hover:border-[var(--border)] transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBook}
                    disabled={bookingLoading || !bookingDate || !bookingTime || !bookingMotive}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/20 transition-all disabled:opacity-50"
                  >
                    {bookingLoading ? "Réservation..." : "Confirmer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
