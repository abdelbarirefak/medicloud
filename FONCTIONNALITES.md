# 🩺 Fonctionnalités de la Plateforme MediCloud

**MediCloud** est une application SaaS Cloud-Native (Next.js 14, Supabase) destinée à moderniser et centraliser la gestion des cabinets médicaux et les parcours de soins des patients. 

L'architecture repose sur un modèle multi-rôles (RBAC) sécurisé via Supabase Auth (JWT). Voici l'ensemble exhaustif des fonctionnalités intégrées à l'application.

---

## 🎨 1. Architecture Générale & Design System
*   **Thème "Soin Clinique" :** Design System structuré conçu spécifiquement pour le milieu médical. Interface lumineuse (Light Mode), couleurs dominantes *Teal* (Sarcelle) inspirant la confiance, bords adoucis et ombres portées épurées.
*   **Routing Sécurisé :** Les espaces (`/patient`, `/doctor`, `/admin`) sont protégés par un système de balisage "Middleware Edge". Un rôle non autorisé est immédiatement réorienté.
*   **Notifications Toasts (`sonner`) :** Apparition dynamique de fenêtres non-bloquantes confirmant les actions réussies (RDVs, modifications de profils) ou prévenant des erreurs, créant un ressenti "Application Mobile Native".

---

## 👨‍⚕️ 2. L'Espace Médecin (Portail Praticien)
**Déclencheur d'accès :** Compte validé avec le tag de rôle `doctor`.

### A. Tableau de Bord & Statistiques
*   **Overview :** Suivi en temps réel des statistiques clés du mois (nombre de patients uniques, nombre d'annulations, estimations financières basées sur le tarif de consultation fixé).
*   **Démarrage Express :** Visualisation des prochains rendez-vous urgents de la journée sans devoir naviguer dans le calendrier.

### B. Agenda & Gestion des Flux (Planning)
*   **Calendrier Dynamique :** Vue organisée sur 7 jours croisant les créneaux horaires classiques (08h00 - 17h00).
*   **Système d'Accréditation :** Devant chaque demande de consultation, le médecin peut d'un seul clic statutaire :
    *   ✅ **Confirmer** le rendez-vous (informe le patient).
    *   ❌ **Annuler** le rendez-vous.
*   **"Clôturer la Consultation" (Module Cœur) :** Lors de l'acte vis-à-vis, le médecin valide la fin de la séance. Une fenêtre d'édition s'ouvre, lui permettant de saisir instantanément le **Diagnostic clinique** et **l'Ordonnance** (Prescription médicale).

### C. Annuaire "Mes Patients"
*   **Dossier Express :** Accès immédiat aux facteurs de risques des patients enregistrés : Groupe sanguin, liste des allergies, et numéro de téléphone pour notification.

---

## 🤒 3. L'Espace Patient (Portail Standard)
**Déclencheur d'accès :** Tout nouveau citoyen créant un compte (Rôle public par défaut `patient`).

### A. Annuaire Médical Avancé
*   **Recherche temps réel :** Le patient peut taper le nom, rechercher par *Spécialité* ou filtrer par *Ville* (via des badges navigables horizontalement).
*   **Filtre Qualité :** Seuls les médecins manuellement "Vérifiés" (approuvés) par un admin apparaissent dans les recherches.

### B. Prise de Rendez-vous Fluide (Smart Booking)
*   **Sélection par Tuiles (Time Slots) :** L'interface ne demande plus au patient d'écrire l'heure. Une jolie grille affiche les Heures Standards sélectionnables en une pression tactile.
*   **Statuts Synchronisés :** Une fois le motif inscrit, le patient vérifie l'avancement *(En Attente -> Confirmé -> Réalisé)* depuis son propre espace "Mes Rendez-vous".

### C. Dossier Médical / Mes Documents 📋
*   Le carnet de santé digitalisé. Chaque fois qu'un de ses médecins "clôture" un RDV, le patient reçoit ici le **Diagnostic Textuel** et surtout l'**Ordonnance** avec la posologie. Idéal pour conserver la trace des directives de son chirurgien ou généraliste dans le temps.

### D. Dossier d'Urgence (Mon Profil)
*   Formulaire clinique permettant de remplir ses constantes personnelles avant les rendez-vous : Date de Naissance, Numéro SOS (Contact d'urgence), Liste des **Allergies** (ex: Pénicilline), et **Groupe Sanguin**.

---

## 🛡️ 4. L'Espace Administration (Back-Office)
**Déclencheur d'accès :** Accréditation manuelle dans la base de données (`admin`).

### A. Contrôle d'Intégrité de la Plateforme (Global Metrics)
*   Affichage en gros plan du volume total brassé par l'application : Nombre global de patients inscrits, nombre net de rendez-vous générés dans le cloud.

### B. Validation d'Onboarding (KYC Doctors)
*   Afin de protéger les citoyens des faux médecins clandestins, l'inscription d'un médecin via la landing page crée un dossier invisible.
*   L'Admin voit la tour de contrôle `"Médecins en attente de vérification"`. Après contrôle (diplôme, identité), l'Admin clique sur **"Vérifier"**, libérant publiquement la fiche du praticien dans l'Annuaire Patient (`patient/search`).
