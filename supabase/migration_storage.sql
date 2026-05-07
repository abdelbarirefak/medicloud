-- ============================================================================
-- Migration: Coffre-Fort Médical (Supabase Storage & DB)
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ============================================================================

-- 1. Création administrative du Bucket Privé 'vault' dans Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault', 
  'vault', 
  false, -- Bucket strictement PRIVÉ
  10485760, -- Limite 10MB par fichier
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Configuration basique de sécurité (RLS) sur le Bucket binaire
-- (Pour une application complexe, on analyserait path_tokens)
CREATE POLICY "Authenticated users can upload to vault" 
  ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'vault');
  
CREATE POLICY "Authenticated users can select from vault" 
  ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'vault');

-- 2. Création de la table 'patient_documents' pour stocker les métadonnées
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_path TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Activation de la sécurité RLS sur la table de métadonnées
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- 3a. Le patient peut voir et gérer ses propres documents
CREATE POLICY "Patient can access own documents" 
  ON public.patient_documents 
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- 3b. Le médecin peut voir les documents rattachés aux patients qu'il a en rendez-vous
CREATE POLICY "Doctor can view consultation documents" 
  ON public.patient_documents 
  FOR SELECT 
  USING (
     EXISTS (
       SELECT 1 FROM appointments a 
       WHERE a.patient_id = patient_documents.patient_id 
       AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = auth.uid() LIMIT 1)
     )
  );

-- Facultatif : Ajoute Notify sur Realtime pour la table documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_documents;
