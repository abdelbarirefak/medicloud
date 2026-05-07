"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { Save, ArrowLeft, Loader2, Info, Clock, CalendarDays, Paperclip, DownloadCloud, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function DoctorConsultationPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params); // Unwrap NextJS 15 Promise params correctly
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [patientDocs, setPatientDocs] = useState<any[]>([]);
  
  // Doctor notes state
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [savingParams, setSavingParams] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: doc } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (doc?.role !== "doctor") return router.push("/login");
      setDoctorProfile(doc);

      // Verify doctor owns this appointment
      const { data: doctorRecord } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctorRecord) return router.push("/doctor/agenda");

      const { data: appt, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(
            *,
            profile:profiles(full_name, email, avatar_url)
          )
        `)
        .eq("id", params.id)
        .eq("doctor_id", doctorRecord.id)
        .single();
        
      if (error || !appt) {
        toast.error("Consultation introuvable ou accès refusé.");
        return router.push("/doctor/agenda");
      }
      
      setAppointment(appt);
      setNotes(appt.notes || "");
      
      // Look for an existing medical record for this appointment to auto-fill
      const { data: record } = await supabase
        .from("medical_records")
        .select("*")
        .eq("appointment_id", appt.id)
        .single();
        
      if (record) {
          setDiagnosis(record.diagnosis || "");
          setPrescription(record.prescription || "");
      }

      // Initialize Waiting Room restriction check (15 minutes threshold = 900000 ms)
      const targetTime = new Date(appt.date_time).getTime();
      const diffInitial = targetTime - new Date().getTime();
      if (diffInitial > 900000) {
         setTimeRemaining(diffInitial);
      }
      
      // Load documents from Patient's Global Vault
      const { data: dbFiles } = await supabase.from('patient_documents').select('*').eq('patient_id', appt.patient_id);
      if (dbFiles) setPatientDocs(dbFiles);

      setLoading(false);
    }
    loadData();
  }, [supabase, router, params.id]);

  // Timer loop for countdown
  useEffect(() => {
    if (!appointment) return;
    const targetTime = new Date(appointment.date_time).getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = targetTime - now;
      
      // If under 15 minutes (900,000 ms), they can join.
      if (diff <= 900000) {
         setTimeRemaining(null); // Clear waiting room
         clearInterval(timer);
      } else {
         setTimeRemaining(diff);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [appointment]);

  async function downloadDoc(doc: any) {
      toast.info("Génération du lien sécurisé...");
      const { data, error } = await supabase.storage.from('vault').createSignedUrl(doc.file_path, 3600);
      if (error || !data) {
          return toast.error("Le document est inaccessible.");
      }
      window.open(data.signedUrl, '_blank');
  }

  async function handleSaveRecord() {
    if (!diagnosis) {
        toast.error("Le diagnostic est obligatoire pour clore la consultation.");
        return;
    }
    setSavingParams(true);
    
    // Transactional: create medical record + complete appointment in one DB call
    const { error } = await supabase.rpc("close_appointment", {
        p_appointment_id: appointment.id,
        p_patient_id: appointment.patient_id,
        p_doctor_id: appointment.doctor_id,
        p_diagnosis: diagnosis,
        p_prescription: prescription || null,
        p_notes: notes || null,
    });

    if (error) {
        toast.error("Erreur de sauvegarde", { description: error.message });
        setSavingParams(false);
        return;
    }

    toast.success("Consultation terminée", { description: "Le dossier médical a été mis à jour avec succès." });
    router.push("/doctor/agenda");
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
    );
  }

  const roomName = `MediCloud-Consultation-${appointment.id.replace(/-/g, '')}`;

  // Helper function to render an animated countdown
  const renderCountdown = (ms: number) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      
      return (
          <div className="flex items-center justify-center gap-4 text-center mt-2">
             {days > 0 && (
                <div className="flex flex-col bg-slate-800/50 rounded-xl p-3 min-w-[70px]">
                    <span className="text-3xl lg:text-4xl font-bold text-white tracking-widest">{days}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Jours</span>
                </div>
             )}
             {(hours > 0 || days > 0) && (
                <div className="flex flex-col bg-slate-800/50 rounded-xl p-3 min-w-[70px]">
                    <span className="text-3xl lg:text-4xl font-bold text-white tracking-widest">{hours.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Heures</span>
                </div>
             )}
             <div className="flex flex-col bg-slate-800/50 rounded-xl p-3 min-w-[70px]">
                 <span className="text-3xl lg:text-4xl font-bold text-white tracking-widest">{minutes.toString().padStart(2, '0')}</span>
                 <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Minutes</span>
             </div>
             <div className="flex flex-col bg-slate-800/50 rounded-xl p-3 min-w-[70px] ring-1 ring-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                 <span className="text-3xl lg:text-4xl font-bold text-sky-400 tracking-widest animate-pulse">{seconds.toString().padStart(2, '0')}</span>
                 <span className="text-[10px] uppercase tracking-wider text-sky-400/80 font-medium">Secondes</span>
             </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/doctor/agenda"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
               {timeRemaining !== null ? "Salle d'Attente" : "Téléconsultation en cours"}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">Salle sécurisée HD avec {appointment.patient.profile.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[75vh]">
        
        {/* Left Side: Video (Takes 2 columns) */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-black flex flex-col relative h-full">
            {timeRemaining !== null ? (
              // SALLE D'ATTENTE UI
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-10 hidden-scrollbar overflow-y-auto">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(56,189,248,0.2)]">
                      <Clock className="w-8 h-8 text-sky-400" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Le rendez-vous n'est pas encore prêt</h2>
                  <p className="text-slate-400 text-sm lg:text-base max-w-lg mb-8">
                      La téléconsultation avec votre patient démarrera automatiquement 15 minutes avant le début officiel.
                  </p>
                  
                  <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6 lg:p-8 flex flex-col items-center">
                      <p className="text-slate-400 font-medium uppercase tracking-wider text-xs flex items-center gap-2 mb-2">
                        <CalendarDays className="w-4 h-4" /> Ouverture dans
                      </p>
                      {renderCountdown(timeRemaining - 900000)}
                  </div>
              </div>
            ) : (
                // JITSI WEBRTC UI
                <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={roomName}
                    configOverwrite={{
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        disableModeratorIndicator: true,
                        disableDeepLinking: true,
                        prejoinPageEnabled: false,
                        defaultLanguage: 'fr',
                    }}
                    interfaceConfigOverwrite={{
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_BRAND_WATERMARK: false,
                    }}
                    userInfo={{
                        displayName: doctorProfile?.full_name || 'Docteur',
                        email: doctorProfile?.email || 'doctor@medicloud.ma'
                    }}
                    getIFrameRef={(iframeRef) => {
                        iframeRef.style.height = '100%';
                        iframeRef.style.width = '100%';
                    }}
                    onApiReady={(externalApi) => {
                        externalApi.on('videoConferenceJoined', () => {
                            toast.success("Vous avez rejoint la salle avec succès.");
                        });
                    }}
                />
            )}
        </div>

        {/* Right Side: Medical Sheet (Takes 1 column) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-4">Fiche Médicale Rapide</h3>
            
            <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl mb-6">
                <div className="flex gap-2 items-start text-sky-800 mb-2">
                    <Info className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">Informations Patient</span>
                </div>
                <div className="text-sm text-sky-700 pl-7">
                    <p><strong>Motif de la visite :</strong> {appointment.motive}</p>
                    <p><strong>Âge : </strong> {appointment.patient?.date_of_birth ? new Date().getFullYear() - new Date(appointment.patient.date_of_birth).getFullYear() + " ans" : "Non renseigné"}</p>
                    {appointment.patient?.allergies && appointment.patient.allergies.length > 0 && (
                        <p className="mt-1"><strong>⚠️ Allergies :</strong> <span className="text-red-500 font-medium">{appointment.patient.allergies.join(", ")}</span></p>
                    )}
                </div>
            </div>

            {patientDocs.length > 0 && (
                <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-700">Documents joints ({patientDocs.length})</h4>
                    </div>
                    <div className="p-3 space-y-2 bg-white">
                        {patientDocs.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2 hover:bg-sky-50 transition">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                                    <span className="text-xs text-slate-600 truncate font-medium">{doc.file_name}</span>
                                </div>
                                <button 
                                    onClick={() => downloadDoc(doc)}
                                    className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-200 transition shrink-0"
                                    title="Télécharger / Voir"
                                >
                                    <DownloadCloud className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4 flex-1">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Diagnostic Confimé <span className="text-red-500">*</span></label>
                   <textarea 
                     value={diagnosis}
                     onChange={(e) => setDiagnosis(e.target.value)}
                     className="w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-[var(--primary)] text-sm resize-none h-20"
                     placeholder="Saisissez le diagnostic..."
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Ordonnance (Prescriptions)</label>
                   <textarea 
                     value={prescription}
                     onChange={(e) => setPrescription(e.target.value)}
                     className="w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-[var(--primary)] text-sm resize-none h-28"
                     placeholder="Médicaments et posologie (facultatif)"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Notes Privées (Non visible par le patient)</label>
                   <textarea 
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     className="w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-[var(--primary)] text-sm resize-none h-20"
                     placeholder="Observations internes..."
                   />
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                    onClick={handleSaveRecord}
                    disabled={savingParams || !diagnosis}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition disabled:opacity-50 disabled:pointer-events-none"
                    title={!diagnosis ? "Le diagnostic est requis" : ""}
                >
                    {savingParams ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Clôturer la Consultation
                </button>
                <p className="text-center text-xs text-slate-400 mt-3">Ceci générera une fiche médicale accessible au patient et archivera le rendez-vous.</p>
            </div>
        </div>

      </div>
    </div>
  );
}
