-- ============================================================================
-- MediCloud Database Schema — Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL DEFAULT 'Médecine Générale',
  city TEXT NOT NULL DEFAULT '',
  address TEXT,
  bio TEXT,
  rating NUMERIC(2,1) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  price NUMERIC(8,2) DEFAULT 200,
  experience_years INT DEFAULT 0,
  languages TEXT[] DEFAULT ARRAY['Français', 'Arabe'],
  avatar_url TEXT,
  kyc_document_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Doctor can update own profile" ON doctors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Doctor can insert own profile" ON doctors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blood_group TEXT,
  allergies TEXT[],
  date_of_birth DATE,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient can view own record" ON patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Patient can update own record" ON patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Patient can insert own record" ON patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Doctors can view patients" ON patients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM doctors d WHERE d.user_id = auth.uid()
  )
);

-- 4. Availability
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INT NOT NULL DEFAULT 30
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability" ON availability FOR SELECT USING (true);
CREATE POLICY "Doctor can manage own availability" ON availability FOR ALL USING (
  EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  motive TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient sees own appointments" ON appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);
CREATE POLICY "Doctor sees own appointments" ON appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);
CREATE POLICY "Patient can create appointment" ON appointments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);
CREATE POLICY "Patient can cancel own appointment" ON appointments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);
CREATE POLICY "Doctor can update appointment status" ON appointments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);

-- 6. Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  diagnosis TEXT NOT NULL DEFAULT '',
  prescription TEXT,
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient sees own records" ON medical_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);
CREATE POLICY "Doctor sees records they created" ON medical_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);
CREATE POLICY "Doctor can create records" ON medical_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- 8. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone sees published doctor reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Patient creates review for own completed appointment" ON reviews FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = appointment_id
      AND a.patient_id = reviews.patient_id
      AND a.doctor_id = reviews.doctor_id
      AND a.status = 'completed'
      AND p.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION refresh_doctor_rating(target_doctor_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE doctors
  SET rating = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews
    WHERE doctor_id = target_doctor_id
  ), 4.5)
  WHERE id = target_doctor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_review_rating_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_doctor_rating(OLD.doctor_id);
    RETURN OLD;
  END IF;

  PERFORM refresh_doctor_rating(NEW.doctor_id);

  IF TG_OP = 'UPDATE' AND OLD.doctor_id <> NEW.doctor_id THEN
    PERFORM refresh_doctor_rating(OLD.doctor_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_rating_change ON reviews;
CREATE TRIGGER on_review_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION handle_review_rating_change();

-- ============================================================================
-- Trigger: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  );

  -- If the user is a doctor, create a doctor record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'doctor' THEN
    INSERT INTO public.doctors (user_id, specialty, city)
    VALUES (NEW.id, 'Médecine Générale', '');
  END IF;

  -- If the user is a patient, create a patient record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient' THEN
    INSERT INTO public.patients (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists then create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(city);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(date_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment_slot ON appointments (doctor_id, date_time) WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_availability_doctor_day ON availability (doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id);

-- 9. Specialties
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view specialties" ON specialties FOR SELECT USING (true);
CREATE POLICY "Only admin can manage specialties" ON specialties FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- 10. Audit Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admin can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 11. Transactional function: close appointment + create medical record
-- ============================================================================
CREATE OR REPLACE FUNCTION close_appointment(
  p_appointment_id UUID,
  p_patient_id UUID,
  p_doctor_id UUID,
  p_diagnosis TEXT,
  p_prescription TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
BEGIN
  UPDATE appointments
  SET status = 'completed', notes = p_notes
  WHERE id = p_appointment_id AND doctor_id = p_doctor_id AND status IN ('confirmed', 'pending');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or already completed/cancelled';
  END IF;

  INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, prescription, notes)
  VALUES (p_patient_id, p_doctor_id, p_appointment_id, p_diagnosis, p_prescription, p_notes)
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Sample seed data (doctors)
-- ============================================================================
-- NOTE: These will be inserted via the app registration flow.
-- To test quickly, you can seed directly after creating auth users.
