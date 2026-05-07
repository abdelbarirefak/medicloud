"use client";

import { useEffect, useState } from "react";
import type { Profile, Doctor, Patient } from "@/types/database";
import { 
  Shield, Users, Stethoscope, Calendar, CheckCircle2, 
  XCircle, Loader2, Activity, Megaphone, Trash2, 
  ToggleLeft, ToggleRight, Star, Plus, Eye, LayoutDashboard,
  MessageSquare, AlertTriangle, ClipboardList, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Custom dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ 
    isOpen: boolean; 
    action: string; 
    payload: any; 
    updateId: string; 
    title: string; 
    message: string;
    danger?: boolean;
  } | null>(null);

  // UI states
  const [updatingParams, setUpdatingParams] = useState<string | null>(null);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [doctorPage, setDoctorPage] = useState(1);
  const [patientPage, setPatientPage] = useState(1);
  const adminPageSize = 10;

  async function loadData() {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function promptAction(title: string, message: string, action: string, payload: any, updateId: string, danger: boolean = false) {
    setConfirmDialog({ isOpen: true, title, message, action, payload, updateId, danger });
  }

  async function executeAction() {
    if (!confirmDialog) return;
    const { action, payload, updateId } = confirmDialog;
    setConfirmDialog(null);
    setUpdatingParams(updateId);

    try {
      const res = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      if (res.ok) {
        toast.success("Opération réussie");
        await loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Une erreur est survenue");
      }
    } catch (e) {
      toast.error("Erreur de connexion");
    }
    setUpdatingParams(null);
  }

  async function handleAddSpecialty(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpecialty.trim()) return;
    
    // Quick Add (no dialog to disrupt flow)
    setUpdatingParams("add_specialty");
    try {
      const res = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_SPECIALTY", payload: { name: newSpecialty.trim() } })
      });
      if (res.ok) {
        toast.success("Spécialité ajoutée");
        await loadData();
      }
    } catch (e) {}
    setUpdatingParams(null);
    setNewSpecialty("");
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcasting(true);
    
    let roles = [];
    if (broadcastTarget === "all") roles = ["patient", "doctor"];
    else roles = [broadcastTarget];

    try {
      const res = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEND_BROADCAST", payload: { roles, title: broadcastTitle, message: broadcastMessage } })
      });
      if (res.ok) {
        toast.success("Notification diffusée à tous");
        setBroadcastTitle("");
        setBroadcastMessage("");
      } else {
        toast.error("Erreur d'envoi");
      }
    } catch (e) {
      toast.error("Erreur système");
    }
    setBroadcasting(false);
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
      <span className="text-violet-600 font-medium">Chargement du panneau...</span>
    </div>
  );
  
  if (!data) return <div className="p-8 text-center text-red-500 font-semibold bg-red-50 rounded-2xl border border-red-200">Erreur de chargement des données.</div>;

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: "doctors", label: `Médecins (${data.stats.doctors || 0})`, icon: Stethoscope },
    { id: "patients", label: `Patients (${data.stats.patients || 0})`, icon: Users },
    { id: "specialties", label: "Spécialités", icon: Activity },
    { id: "communications", label: "Communications", icon: MessageSquare },
    { id: "analytics", label: "Analytiques", icon: BarChart3 },
    { id: "audit", label: "Journal d'audit", icon: ClipboardList },
  ];
  const doctorTotalPages = Math.max(1, Math.ceil((data.doctors?.length || 0) / adminPageSize));
  const patientTotalPages = Math.max(1, Math.ceil((data.patients?.length || 0) / adminPageSize));
  const visibleDoctors = data.doctors.slice((doctorPage - 1) * adminPageSize, doctorPage * adminPageSize);
  const visiblePatients = data.patients.slice((patientPage - 1) * adminPageSize, patientPage * adminPageSize);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up relative">
      
      {/* DIALOG COMPONENT */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 shadow-2xl border border-slate-100"
            >
               <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 mx-auto ${confirmDialog.danger ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-600'}`}>
                 {confirmDialog.danger ? <AlertTriangle className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
               </div>
               <h3 className="text-xl font-bold text-slate-800 text-center mb-2">{confirmDialog.title}</h3>
               <p className="text-slate-500 text-center text-[15px] mb-8">{confirmDialog.message}</p>
               
               <div className="flex gap-3">
                 <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                   Annuler
                 </button>
                 <button onClick={executeAction} className={`flex-1 py-3 rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all ${confirmDialog.danger ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/20'}`}>
                   Confirmer
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full mb-4 shadow-sm backdrop-blur-sm border border-white/10">
              <Shield className="w-3.5 h-3.5" />
              Panneau de Configuration
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Espace Administration</h1>
            <p className="text-indigo-100 mt-2 text-sm max-w-xl leading-relaxed">
              Supervisez l'intégralité de la plateforme MediCloud. Gérez les validations des professionnels, les comptes utilisateurs, et les référentiels de spécialités.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1.5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                isActive 
                  ? "bg-violet-50 text-violet-700 shadow-sm border border-violet-100" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? "text-violet-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TABS CONTENT */}
      <div className="min-h-[50vh]">
        
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Utilisateurs", value: data.stats.users, icon: Users, gradient: "from-sky-500 to-sky-600", shadow: "shadow-sky-500/20" },
                { label: "Médecins inscrits", value: data.stats.doctors, icon: Stethoscope, gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-500/20" },
                { label: "Patients", value: data.stats.patients, icon: Users, gradient: "from-violet-500 to-violet-600", shadow: "shadow-violet-500/20" },
                { label: "Rendez-vous", value: data.stats.appointments, icon: Calendar, gradient: "from-amber-500 to-amber-600", shadow: "shadow-amber-500/20" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient}`} />
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Récemment Inscrits
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {data.doctors.slice(0, 6).map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/60 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-sm">
                      {doc.profile?.full_name?.charAt(0) || "D"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-slate-800 truncate">Dr. {doc.profile?.full_name}</div>
                      <div className="text-xs font-medium text-slate-500 truncate">{doc.profile?.email}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${doc.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {doc.is_verified ? 'Vérifié' : 'Attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DOCTORS */}
        {activeTab === "doctors" && (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Professionnel</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">État du Compte</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions Manuelles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.doctors.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">Aucun médecin dans la base</td></tr>
                  ) : visibleDoctors.map((doc: any) => (
                    <tr key={doc.id} className={`hover:bg-slate-50 transition-colors ${!doc.profile?.is_active ? 'opacity-70 grayscale-[20%]' : ''}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm">
                             {doc.profile?.full_name?.charAt(0) || "D"}
                           </div>
                           <div>
                             <div className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                               Dr. {doc.profile?.full_name}
                               {doc.is_verified ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Loader2 className="w-4 h-4 text-amber-500" />}
                               {doc.is_featured && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                             </div>
                             <div className="text-xs font-medium text-slate-500">{doc.profile?.email} • {doc.specialty || "Généraliste"}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {/* TOGGLE SWITCH */}
                        <div className="flex items-center gap-3">
                           <button
                             onClick={() => promptAction(
                               doc.profile?.is_active ? 'Désactiver le compte' : 'Activer le compte',
                               `Êtes-vous sûr de vouloir ${doc.profile?.is_active ? 'désactiver' : 'activer'} l'accès de Dr. ${doc.profile?.full_name} ? Le compte ainsi que ses identifiants d'authentification seront immédiatement ${doc.profile?.is_active ? 'bloqués' : 'restaurés'}.`,
                               "TOGGLE_ACTIVATION",
                               { userId: doc.user_id, status: !doc.profile?.is_active },
                               `a_${doc.id}`,
                               doc.profile?.is_active // Danger if we are disabling
                             )}
                             disabled={updatingParams === `a_${doc.id}`}
                             className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                               doc.profile?.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                             }`}
                           >
                              <span className="sr-only">Toggle active status</span>
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  doc.profile?.is_active ? 'translate-x-5' : 'translate-x-0'
                                } flex items-center justify-center`}
                              >
                                {updatingParams === `a_${doc.id}` && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                              </span>
                           </button>
                           <span className={`text-[13px] font-bold uppercase tracking-wider ${doc.profile?.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                             {doc.profile?.is_active ? 'Actif' : 'Désactivé'}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          
                          {!doc.is_verified && (
                            <button
                              onClick={() => promptAction("Approuver ce compte", "Confirmez-vous que ce praticien est légitime et autorisé à consulter des patients sur la plateforme ?", "TOGGLE_VERIFICATION", { doctorId: doc.id, status: true }, `v_${doc.id}`)}
                              className="px-3 py-1.5 rounded-lg font-semibold text-[13px] bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border border-transparent transition-all flex items-center gap-1.5"
                              title="Valider la légitimité"
                            >
                              <Shield className="w-3.5 h-3.5" /> Valider
                            </button>
                          )}
                          
                          <button
                            onClick={() => promptAction("Mise en avant", "Voulez-vous modifier le statut 'Mettre en avant' pour ce praticien ?", "TOGGLE_FEATURED", { doctorId: doc.id, status: !doc.is_featured }, `f_${doc.id}`)}
                            disabled={updatingParams !== null}
                            className={`p-2 rounded-lg border active:scale-95 transition-all ${doc.is_featured ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-white text-slate-400 border-slate-200 hover:text-amber-500 hover:border-amber-300'}`}
                            title="Mettre en avant"
                          >
                            {updatingParams === `f_${doc.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                          </button>

                          <button
                            className="p-2 rounded-lg bg-white text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all border border-slate-200 ml-2"
                            onClick={() => promptAction("Suppression Définitive", `Attention ! Ceci détruira entièrement le compte de Dr. ${doc.profile?.full_name} et toutes les données associées de la base Cloud. C'est irréversible.`, "DELETE_USER", { userId: doc.user_id }, `d_${doc.id}`, true)}
                            title="Destruction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {doctorTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 p-4 border-t border-slate-100">
                <button disabled={doctorPage === 1} onClick={() => setDoctorPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-xl border border-slate-200 text-sm disabled:opacity-50">Précédent</button>
                <span className="text-sm text-slate-500">Page {doctorPage} / {doctorTotalPages}</span>
                <button disabled={doctorPage === doctorTotalPages} onClick={() => setDoctorPage((p) => Math.min(doctorTotalPages, p + 1))} className="px-4 py-2 rounded-xl border border-slate-200 text-sm disabled:opacity-50">Suivant</button>
              </div>
            )}
          </div>
        )}

        {/* PATIENTS */}
        {activeTab === "patients" && (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
             <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Dossier Patient</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Accès Plateforme</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions Manuelles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.patients.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">Aucun patient</td></tr>
                  ) : visiblePatients.map((pat: any) => (
                    <tr key={pat.id} className={`hover:bg-slate-50 transition-colors ${!pat.profile?.is_active ? 'opacity-70 grayscale-[20%]' : ''}`}>
                      <td className="px-6 py-5">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shadow-sm">
                             {pat.profile?.full_name?.charAt(0) || "P"}
                           </div>
                           <div>
                             <div className="font-bold text-slate-800 text-[15px]">{pat.profile?.full_name}</div>
                             <div className="text-xs font-medium text-slate-500">{pat.profile?.email}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         {/* TOGGLE SWITCH */}
                         <div className="flex items-center gap-3">
                           <button
                             onClick={() => promptAction(
                               pat.profile?.is_active ? 'Restreindre l\'accès' : 'Autoriser l\'accès',
                               `Êtes-vous sûr de vouloir ${pat.profile?.is_active ? 'désactiver' : 'réactiver'} le compte de ${pat.profile?.full_name} ?`,
                               "TOGGLE_ACTIVATION",
                               { userId: pat.user_id, status: !pat.profile?.is_active },
                               `ap_${pat.id}`,
                               pat.profile?.is_active // Danger if we are disabling
                             )}
                             disabled={updatingParams === `ap_${pat.id}`}
                             className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                               pat.profile?.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                             }`}
                           >
                              <span className="sr-only">Toggle active status</span>
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  pat.profile?.is_active ? 'translate-x-5' : 'translate-x-0'
                                } flex items-center justify-center`}
                              >
                                {updatingParams === `ap_${pat.id}` && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                              </span>
                           </button>
                           <span className={`text-[13px] font-bold uppercase tracking-wider ${pat.profile?.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                             {pat.profile?.is_active ? 'Autorisé' : 'Suspendu'}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            className="p-2 rounded-lg bg-white text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all border border-slate-200"
                            onClick={() => promptAction("Suppression Définitive", `Attention ! Êtes vous sur de détruire totalement le compte patient de ${pat.profile?.full_name} ?`, "DELETE_USER", { userId: pat.user_id }, `dp_${pat.id}`, true)}
                            title="Supprimer totalement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
             {patientTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 p-4 border-t border-slate-100">
                <button disabled={patientPage === 1} onClick={() => setPatientPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-xl border border-slate-200 text-sm disabled:opacity-50">Précédent</button>
                <span className="text-sm text-slate-500">Page {patientPage} / {patientTotalPages}</span>
                <button disabled={patientPage === patientTotalPages} onClick={() => setPatientPage((p) => Math.min(patientTotalPages, p + 1))} className="px-4 py-2 rounded-xl border border-slate-200 text-sm disabled:opacity-50">Suivant</button>
              </div>
             )}
          </div>
        )}

        {/* SPECIALTIES */}
        {activeTab === "specialties" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
               <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm sticky top-8">
                 <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                   <Activity className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Base de Référence</h3>
                 <p className="text-slate-500 text-sm mb-6">Ajoutez de nouvelles spécialités médicales pour permettre aux médecins de s'y associer lors de leur inscription.</p>
                 
                 <form onSubmit={handleAddSpecialty} className="space-y-4">
                    <div>
                      <input 
                        type="text" 
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-sm font-medium outline-none transition-all" 
                        placeholder="Ex: Chirurgie Viscérale"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!newSpecialty.trim() || updatingParams === 'add_specialty'}
                      className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updatingParams === 'add_specialty' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Ajouter au catalogue
                    </button>
                 </form>
               </div>
            </div>

            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {data.specialties.map((s: any) => (
                <div key={s.id} className="flex flex-row items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
                       <Stethoscope className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                     </div>
                     <span className="font-bold text-[15px] text-slate-700">{s.name}</span>
                   </div>
                   <button 
                     onClick={() => promptAction("Supprimer la Spécialité", `Voulez-vous supprimer la spécialité '${s.name}' du système ?`, "DELETE_SPECIALTY", { id: s.id }, `ds_${s.id}`, true)}
                     disabled={updatingParams !== null}
                     className="w-8 h-8 rounded-lg flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-50 focus:outline-none transition-colors border border-transparent hover:border-red-100"
                    >
                      {updatingParams === `ds_${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                   </button>
                </div>
              ))}
              {data.specialties.length === 0 && (
                <div className="sm:col-span-2 py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  Le catalogue est vide.
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMMUNICATIONS */}
        {activeTab === "communications" && (
          <div className="max-w-2xl mx-auto">
             <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 flex items-center justify-center mb-6 border border-violet-200 shadow-inner">
                   <Megaphone className="w-7 h-7 text-violet-600" fill="currentColor" />
                </div>
                
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Centre de Diffusion</h2>
                <p className="text-slate-500 text-[15px] mb-8 leading-relaxed">
                   Envoyez une alerte prioritaire (maintenance, mise à jour, informations critiques). Cette notification sera poussée instantanément sur les appareils des cibles sélectionnées.
                </p>

                <form onSubmit={handleBroadcast} className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-sm font-bold text-slate-700">Groupe Cible</label>
                     <select 
                       value={broadcastTarget}
                       onChange={(e) => setBroadcastTarget(e.target.value)}
                       className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer outline-none"
                     >
                       <option value="all">🌐 Tout le monde (Médecins + Patients)</option>
                       <option value="doctor">👨‍⚕️ Uniquement les Médecins professionnels</option>
                       <option value="patient">👤 Uniquement les Patients enregistrés</option>
                     </select>
                  </div>
                  
                  <div className="space-y-1.5">
                     <label className="text-sm font-bold text-slate-700">Sujet de l'alerte</label>
                     <input 
                       type="text" 
                       value={broadcastTitle}
                       onChange={(e) => setBroadcastTitle(e.target.value)}
                       required
                       className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none" 
                     />
                  </div>
                  
                  <div className="space-y-1.5">
                     <label className="text-sm font-bold text-slate-700">Contenu Détaillé</label>
                     <textarea 
                       value={broadcastMessage}
                       onChange={(e) => setBroadcastMessage(e.target.value)}
                       required
                       rows={5}
                       className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none resize-none" 
                     />
                  </div>
                  
                  <div className="pt-4">
                    <button 
                        type="submit"
                        disabled={broadcasting || !broadcastTitle.trim()}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-[15px] shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {broadcasting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                        {broadcasting ? "Envoi en cours..." : "Publier l'alerte réseau"}
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Rendez-vous par statut</h3>
              <div className="grid sm:grid-cols-4 gap-4">
                {["pending", "confirmed", "completed", "cancelled"].map((status) => {
                  const count = (data.appointmentsList || []).filter((a: any) => a.status === status).length;
                  const labels: Record<string, string> = { pending: "En attente", confirmed: "Confirmés", completed: "Terminés", cancelled: "Annulés" };
                  const colors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", confirmed: "bg-emerald-100 text-emerald-700", completed: "bg-teal-100 text-teal-700", cancelled: "bg-red-100 text-red-700" };
                  return (
                    <div key={status} className={`rounded-2xl p-5 text-center ${colors[status]}`}>
                      <div className="text-3xl font-black">{count}</div>
                      <div className="text-sm font-semibold mt-1">{labels[status]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Rendez-vous par mois (12 derniers mois)</h3>
              <div className="flex items-end gap-2 h-48">
                {(() => {
                  const months: Record<string, number> = {};
                  const now = new Date();
                  for (let i = 11; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
                  }
                  (data.appointmentsList || []).forEach((a: any) => {
                    const d = new Date(a.created_at);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    if (key in months) months[key]++;
                  });
                  const values = Object.values(months);
                  const max = Math.max(...values, 1);
                  return Object.entries(months).map(([key, val]) => (
                    <div key={key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-teal-500 rounded-t-lg transition-all" style={{ height: `${(val / max) * 100}%`, minHeight: val > 0 ? "8px" : "2px" }} />
                      <span className="text-[10px] text-slate-500 -rotate-45 origin-top-left whitespace-nowrap">{key.split("-")[1]}/{key.split("-")[0].slice(2)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Top spécialités</h3>
                <div className="space-y-2">
                  {(() => {
                    const specCount: Record<string, number> = {};
                    (data.doctors || []).forEach((d: any) => { specCount[d.specialty] = (specCount[d.specialty] || 0) + 1; });
                    return Object.entries(specCount).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count]) => (
                      <div key={name} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 font-medium">{name}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Répartition par ville</h3>
                <div className="space-y-2">
                  {(() => {
                    const cityCount: Record<string, number> = {};
                    (data.doctors || []).forEach((d: any) => { if (d.city) cityCount[d.city] = (cityCount[d.city] || 0) + 1; });
                    return Object.entries(cityCount).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count]) => (
                      <div key={name} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 font-medium">{name}</span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cible</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data.auditLogs || data.auditLogs.length === 0) ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Aucune action enregistrée</td></tr>
                  ) : data.auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{log.admin?.full_name || "—"}</td>
                      <td className="px-6 py-4"><span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">{log.action}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.target_type} / <span className="font-mono text-xs">{log.target_id?.substring(0, 8)}...</span></td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono max-w-xs truncate">{JSON.stringify(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
