CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment_slot
ON appointments (doctor_id, date_time)
WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_availability_doctor_day
ON availability (doctor_id, day_of_week);

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

DROP POLICY IF EXISTS "Patient sees own reviews" ON reviews;
CREATE POLICY "Patient sees own reviews" ON reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Doctor sees own reviews" ON reviews;
CREATE POLICY "Doctor sees own reviews" ON reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone sees published doctor reviews" ON reviews;
CREATE POLICY "Anyone sees published doctor reviews" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Patient creates review for own completed appointment" ON reviews;
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

CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id);
