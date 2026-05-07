"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { ArrowLeft, Loader2, Clock, CalendarDays, UploadCloud, FilePlus, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PatientConsultationPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof?.role !== "patient") return router.push("/login");
      setPatientProfile(prof);

      // Verify patient owns this appointment
      const { data: patientRecord } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (!patientRecord) return router.push("/patient/appointments");

      const { data: appt, error } = await supabase
        .from("appointments")
        .select(`
          *,
          doctor:doctors(
            specialty,
            profile:profiles(full_name)
          )
        `)
        .eq("id", params.id)
        .eq("patient_id", patientRecord.id)
        .single();
        
      if (error || !appt) {
        toast.error("Consultation introuvable ou accès refusé.");
        return router.push("/patient/appointments");
      }
      
      setAppointment(appt);

      // Initialize Waiting Room restriction check (15 minutes threshold = 900000 ms)
      const targetTime = new Date(appt.date_time).getTime();
      const diffInitial = targetTime - new Date().getTime();
      if (diffInitial > 900000) {
         setTimeRemaining(diffInitial);
      }
      
      // Load previously uploaded files
      const { data: dbFiles } = await supabase.from('patient_documents').select('*').eq('appointment_id', appt.id);
      if (dbFiles) setUploadedFiles(dbFiles.map(f => ({ name: f.file_name })));

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
      
      if (diff <= 900000) {
         setTimeRemaining(null);
         clearInterval(timer); // Timer clears when under 15 mins
      } else {
         setTimeRemaining(diff);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [appointment]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
          return toast.error("Le fichier est trop volumineux (10 Mo maximum).");
      }

      setUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
          const filePath = `${patientProfile.id}/${Date.now()}_${safeName}.${fileExt}`;

          // Upload to Storage
          const { error: uploadError } = await supabase.storage
            .from('vault')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Record in Database (Globally available in Vault)
          const { error: dbError } = await supabase.from('patient_documents').insert({
              patient_id: appointment.patient_id,
              file_name: file.name,
              file_size: file.size,
              content_type: file.type,
              file_path: filePath,
              appointment_id: null
          });

          if (dbError) throw dbError;

          toast.success("Document envoyé avec succès");
          setUploadedFiles(prev => [...prev, { name: file.name }]);

      } catch (err: any) {
          toast.error("Erreur lors de l'envoi", { description: err.message });
      } finally {
          setUploading(false);
          event.target.value = ''; // reset input
      }
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
          href="/patient/appointments"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {timeRemaining !== null ? "Salle d'Attente" : "Téléconsultation en cours"}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">Salle sécurisée HD avec le {appointment.doctor?.profile?.full_name}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-black flex flex-col relative h-[75vh]">
          {timeRemaining !== null ? (
              // SALLE D'ATTENTE UI
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-10 hidden-scrollbar overflow-y-auto">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(56,189,248,0.2)]">
                      <Clock className="w-8 h-8 text-sky-400" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">La salle n'est pas encore prête</h2>
                  <p className="text-slate-400 text-sm lg:text-base max-w-lg mb-8">
                      Le lien de la téléconsultation s'activera automatiquement 15 minutes avant le début du rendez-vous.
                  </p>
                  
                  <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6 lg:p-8 flex flex-col items-center w-full max-w-sm mb-6">
                      <p className="text-slate-400 font-medium uppercase tracking-wider text-xs flex items-center gap-2 mb-2">
                        <CalendarDays className="w-4 h-4" /> Ouverture dans
                      </p>
                      {renderCountdown(timeRemaining - 900000)}
                  </div>
                  
                  {/* Uploader de Documents Médicaux */}
                  <div className="w-full max-w-md bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-5 text-left shadow-lg">
                      <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                          <UploadCloud className="w-5 h-5 text-teal-400" />
                          Coffre-fort avant consultation
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                          Transmettez vos analyses ou radios au médecin. Ils seront protégés et disponibles pendant l'appel.
                      </p>
                      
                      <div className="relative">
                          <input 
                             type="file" 
                             onChange={handleFileUpload} 
                             disabled={uploading}
                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                             title="Cliquez pour envoyer un document"
                             accept=".pdf,.png,.jpg,.jpeg"
                          />
                          <div className={`border-2 border-dashed ${uploading ? 'border-teal-500/50 bg-teal-500/10' : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-500'} rounded-xl py-6 flex flex-col items-center justify-center transition-all`}>
                              {uploading ? (
                                  <>
                                      <Loader2 className="w-6 h-6 text-teal-400 animate-spin mb-2" />
                                      <span className="text-sm font-medium text-teal-300">Envoi sécurisé en cours...</span>
                                  </>
                              ) : (
                                  <>
                                      <FilePlus className="w-6 h-6 text-slate-400 mb-2" />
                                      <span className="text-sm font-medium text-slate-300">Cliquez pour ajouter un fichier</span>
                                      <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 10 MB)</span>
                                  </>
                              )}
                          </div>
                      </div>
                      
                      {uploadedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                              {uploadedFiles.map((f, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg p-2.5">
                                      <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                                      <span className="text-xs text-slate-300 truncate w-full">{f.name}</span>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  </div>
                              ))}
                          </div>
                      )}
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
                      displayName: patientProfile?.full_name || 'Patient',
                      email: patientProfile?.email || 'patient@medicloud.ma'
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
    </div>
  );
}
