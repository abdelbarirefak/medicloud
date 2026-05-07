-- ============================================================================
-- MediCloud Seed Data — Run this in the Supabase SQL Editor
-- This script cleans up old seed data, then creates 3 médecins, 2 patients et des rendez-vous.
-- Mot de passe pour TOUS les comptes : password123
-- ============================================================================

-- 0. NETTOYAGE : Supprimer les anciennes données de test (ON DELETE CASCADE va tout nettoyer)
DELETE FROM auth.users WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666'
);

-- 1. Activer l'extension pour hasher les mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insérer les utilisateurs dans auth.users
-- Le trigger `on_auth_user_created` s'exécutera automatiquement pour créer les profils !
INSERT INTO auth.users (
  id, 
  instance_id, 
  aud, 
  role, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_user_meta_data, 
  created_at, 
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.benali@medicloud.ma', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Dr. Youssef Benali", "role":"doctor"}', NOW(), NOW(), '', '', '', ''),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.idrissi@medicloud.ma', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Dr. Nadia Idrissi", "role":"doctor"}', NOW(), NOW(), '', '', '', ''),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.chraibi@medicloud.ma', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Dr. Amine Chraibi", "role":"doctor"}', NOW(), NOW(), '', '', '', ''),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amine@medicloud.ma', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Amine Patient", "role":"patient"}', NOW(), NOW(), '', '', '', ''),
('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sara@medicloud.ma', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Sara Patient", "role":"patient"}', NOW(), NOW(), '', '', '', ''),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@medicloud.ma', crypt('password123', gen_salt('bf')), NOW(), '{"full_name":"Admin Système", "role":"admin"}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 3. Mettre à jour les médecins auto-créés avec des données réalistes 
UPDATE public.doctors SET specialty = 'Cardiologie', city = 'Casablanca', price = 300, is_verified = true, experience_years = 12, rating = 4.8, address = '15 Bd Anfa, Casablanca' 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

UPDATE public.doctors SET specialty = 'Dermatologie', city = 'Rabat', price = 250, is_verified = true, experience_years = 8, rating = 4.9, address = 'Agdal, Rabat' 
WHERE user_id = '22222222-2222-2222-2222-222222222222';

UPDATE public.doctors SET specialty = 'Ophtalmologie', city = 'Marrakech', price = 200, is_verified = true, experience_years = 15, rating = 4.7, address = 'Gueliz, Marrakech' 
WHERE user_id = '33333333-3333-3333-3333-333333333333';

-- 4. Mettre à jour les fiches patients auto-créées
UPDATE public.patients SET blood_group = 'O+', allergies = ARRAY['Pénicilline', 'Pollen'], date_of_birth = '1990-05-15'
WHERE user_id = '44444444-4444-4444-4444-444444444444';

UPDATE public.patients SET blood_group = 'A-', emergency_contact = '+212600112233'
WHERE user_id = '55555555-5555-5555-5555-555555555555';

-- 5. Créer des rendez-vous de démonstration
INSERT INTO public.appointments (doctor_id, patient_id, date_time, status, motive)
SELECT d.id, p.id, NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'pending', 'Douleurs thoraciques et essoufflement'
FROM public.doctors d, public.patients p
WHERE d.user_id = '11111111-1111-1111-1111-111111111111' AND p.user_id = '44444444-4444-4444-4444-444444444444'
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (doctor_id, patient_id, date_time, status, motive)
SELECT d.id, p.id, NOW() + INTERVAL '2 days' + INTERVAL '5 hours', 'confirmed', 'Acné sévère'
FROM public.doctors d, public.patients p
WHERE d.user_id = '22222222-2222-2222-2222-222222222222' AND p.user_id = '44444444-4444-4444-4444-444444444444'
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (doctor_id, patient_id, date_time, status, motive, notes)
SELECT d.id, p.id, NOW() - INTERVAL '3 days' + INTERVAL '3 hours', 'completed', 'Baisse de l''acuité visuelle', 'Prescription délivrée.'
FROM public.doctors d, public.patients p
WHERE d.user_id = '33333333-3333-3333-3333-333333333333' AND p.user_id = '55555555-5555-5555-5555-555555555555'
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (doctor_id, patient_id, date_time, status, motive)
SELECT d.id, p.id, NOW() + INTERVAL '2 hours', 'confirmed', 'Bilan cardiaque de routine'
FROM public.doctors d, public.patients p
WHERE d.user_id = '11111111-1111-1111-1111-111111111111' AND p.user_id = '55555555-5555-5555-5555-555555555555'
ON CONFLICT DO NOTHING;
