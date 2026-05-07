"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { FileText, Stethoscope, Clock, Download, UploadCloud, Loader2, Trash2, Edit2, CheckCircle2, FilePlus, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Type configurations
type MedicalRecord = {
  id: string;
  diagnosis: string;
  prescription: string;
  notes: string | null;
  created_at: string;
  doctor: {
    specialty: string;
    profile: { full_name: string; };
  };
};

type VaultDocument = {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  appointment_id?: string | null;
};

export default function PatientRecordsPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload & UI Status
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setPatientUserId(user.id);

    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
    if (!patient) return;
    setPatientId(patient.id);

    // Fetch Formal Medical Records
    const { data: medData } = await supabase
      .from("medical_records")
      .select(`id, diagnosis, prescription, notes, created_at, doctor:doctors (specialty, profile:profiles ( full_name ))`)
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false });

    if (medData) setRecords(medData as unknown as MedicalRecord[]);

    // Fetch Vault Documents (Uploaded by patient)
    const { data: vaultData } = await supabase
      .from("patient_documents")
      .select("*")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false });

    if (vaultData) setVaultDocs(vaultData as VaultDocument[]);
    
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Handle Document Upload
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file || !patientId || !patientUserId) return;

      if (file.size > 10 * 1024 * 1024) {
          return toast.error("Le fichier est trop volumineux (10 Mo maximum).");
      }

      setUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const safeName = cleanName.replace(/[^a-zA-Z0-9 -]/g, '_');
          const filePath = `${patientUserId}/${Date.now()}_${safeName}.${fileExt}`;

          // Upload to Storage Bucket 'vault'
          const { error: uploadError } = await supabase.storage.from('vault').upload(filePath, file);
          if (uploadError) throw uploadError;

          // Record Metadata Globally (appointment_id is explicitly NULL so it's globally available)
          const { error: dbError } = await supabase.from('patient_documents').insert({
              patient_id: patientId,
              file_name: cleanName,
              file_size: file.size,
              content_type: file.type,
              file_path: filePath,
              appointment_id: null // Unlinked from specific meeting
          });
          if (dbError) throw dbError;

          toast.success("Document ajouté au coffre-fort avec succès");
          loadData(); // Refresh UI

      } catch (err: any) {
          toast.error("Erreur d'envoi", { description: err.message });
      } finally {
          setUploading(false);
          event.target.value = ''; // Reset input
      }
  }

  // Generate Download URL 
  async function downloadDoc(doc: VaultDocument) {
      toast.info("Génération du lien sécurisé...");
      const { data, error } = await supabase.storage.from('vault').createSignedUrl(doc.file_path, 3600);
      if (error || !data) return toast.error("Erreur de téléchargement");
      window.open(data.signedUrl, '_blank');
  }

  // Delete Document
  async function deleteDoc(doc: VaultDocument) {
      if (!confirm("Voulez-vous vraiment supprimer ce document de votre dossier médical ?")) return;
      
      const tId = toast.loading("Suppression en cours...");
      
      // 1. Delete physical file from storage
      const { error: storageError } = await supabase.storage.from('vault').remove([doc.file_path]);
      if (storageError) {
          toast.dismiss(tId);
          return toast.error("Échec de la suppression sécurisée");
      }
      
      // 2. Delete metadata from DB
      const { error: dbError } = await supabase.from('patient_documents').delete().eq("id", doc.id);
      
      toast.dismiss(tId);
      if (dbError) return toast.error("Erreur lors de la mise à jour de la base de données.");
      
      toast.success("Fichier définitivement supprimé");
      setVaultDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  // Rename Document
  async function saveRename(doc: VaultDocument) {
      if (!editName.trim()) return;
      const { error } = await supabase.from('patient_documents').update({ file_name: editName }).eq("id", doc.id);
      if (error) return toast.error("Impossible de renommer.");
      
      toast.success("Renommé avec succès");
      setEditingDocId(null);
      setVaultDocs(prev => prev.map(d => d.id === doc.id ? { ...d, file_name: editName } : d));
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  return (
    <div className="space-y-10 max-w-5xl pb-10">
      
      {/* SECTION 1: PERSONAL VAULT */}
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-teal-600" /> Mon Coffre-Fort Patient
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Vos analyses, radios, anciens dossiers. Vous et vos médecins y avez accès.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Uploader Box */}
            <div className="lg:col-span-1">
                 <div className="bg-white border-2 border-dashed border-teal-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative hover:bg-teal-50/50 transition duration-300 group shadow-sm h-full min-h-[200px]">
                    <input 
                         type="file" 
                         onChange={handleFileUpload} 
                         disabled={uploading}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                         accept=".pdf,.png,.jpg,.jpeg"
                    />
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-3" />
                            <span className="font-semibold text-teal-700">Sécurisation et Envoi...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                <FilePlus className="w-6 h-6 text-teal-600" />
                            </div>
                            <span className="font-semibold text-slate-800">Uploader un document</span>
                            <span className="text-sm text-slate-500 mt-1">PDF ou Images (Max 10Mo)</span>
                        </div>
                    )}
                 </div>
            </div>

            {/* List of Files */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center justify-between">
                        Fichiers Centralisés 
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{vaultDocs.length}</span>
                    </h3>
                    
                    {vaultDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                            <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                            Votre coffre-fort est vide.
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                           {vaultDocs.map((doc) => (
                               <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-teal-200 transition gap-4">
                                   <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                                       <div className="w-10 h-10 bg-blue-100 rounded-lg flex shrink-0 items-center justify-center">
                                           <FileText className="w-5 h-5 text-blue-600" />
                                       </div>
                                       {editingDocId === doc.id ? (
                                           <div className="flex items-center gap-2 w-full">
                                              <input 
                                                 type="text" 
                                                 autoFocus
                                                 value={editName}
                                                 onChange={(e) => setEditName(e.target.value)}
                                                 className="px-2 py-1 border border-teal-300 rounded focus:outline-none focus:ring-2 ring-teal-500/20 text-sm w-full"
                                              />
                                              <button onClick={() => saveRename(doc)} className="text-teal-600 text-sm font-semibold hover:underline">OK</button>
                                              <button onClick={() => setEditingDocId(null)} className="text-slate-400 text-sm hover:underline">Annuler</button>
                                           </div>
                                       ) : (
                                           <div className="truncate shrink">
                                               <p className="font-medium text-slate-800 text-sm truncate" title={doc.file_name}>{doc.file_name}</p>
                                               <p className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()} {doc.appointment_id && "- Lié à une session"}</p>
                                           </div>
                                       )}
                                   </div>

                                   {editingDocId !== doc.id && (
                                       <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                                           <button onClick={() => downloadDoc(doc)} className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition" title="Télécharger">
                                               <Download className="w-4 h-4" />
                                           </button>
                                           <button onClick={() => { setEditingDocId(doc.id); setEditName(doc.file_name); }} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Renommer">
                                               <Edit2 className="w-4 h-4" />
                                           </button>
                                           <button onClick={() => deleteDoc(doc)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                                               <Trash2 className="w-4 h-4" />
                                           </button>
                                       </div>
                                   )}
                               </div>
                           ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </section>

      {/* SECTION 2: FORMAL MEDICAL RECORDS (Visits generated by doctors) */}
      <section className="space-y-6 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-xl font-bold">Comptes-Rendus Médicaux (Visites)</h2>
          <p className="text-[var(--text-secondary)] mt-1">Clôtures de consultations, ordonnances et diagnostics officiels émis par les médecins.</p>
        </div>

        {records.length === 0 ? (
          <div className="card-gradient rounded-2xl p-12 text-center border border-[var(--border)]">
            <Stethoscope className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Aucun historique clinique</h3>
            <p className="text-[var(--text-secondary)] text-sm">
              Vous n'avez pas encore d'ordonnances ou de constats liés à une consultation vidéo.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {records.map((record) => (
              <div key={record.id} className="card-gradient rounded-2xl p-6 border border-[var(--border)] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 rounded-l-2xl"></div>
                
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Doctor Info */}
                  <div className="md:w-1/3 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Clock className="w-4 h-4" />
                      {new Date(record.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        Dr. {record.doctor.profile.full_name}
                      </div>
                      <div className="text-sm text-teal-600 flex items-center gap-1.5 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                        {record.doctor.specialty}
                      </div>
                    </div>
                  </div>

                  {/* Medical Details */}
                  <div className="md:w-2/3 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">Diagnostic</h4>
                      <p className="text-[var(--text-primary)] leading-relaxed">{record.diagnosis}</p>
                    </div>
                    
                    {record.prescription && (
                      <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-teal-600 uppercase tracking-wider">Ordonnance Officielle</h4>
                        </div>
                        <p className="text-[var(--text-primary)] whitespace-pre-wrap font-mono text-sm leading-relaxed">
                          {record.prescription}
                        </p>
                      </div>
                    )}

                    {record.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">Notes du Médecin (Partagées)</h4>
                        <p className="text-[var(--text-secondary)] text-sm">{record.notes}</p>
                      </div>
                    )}

                    <Link
                      href={`/patient/records/${record.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200 hover:bg-teal-100 transition mt-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Exporter / Imprimer
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
