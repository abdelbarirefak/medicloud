export type UserRole = 'patient' | 'doctor' | 'admin';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  city: string;
  address: string | null;
  bio: string | null;
  rating: number;
  price: number;
  experience_years: number;
  languages: string[];
  avatar_url: string | null;
  kyc_document_url: string | null;
  is_verified: boolean;
  created_at: string;
  // Joined from profiles
  profile?: Profile;
}

export interface Patient {
  id: string;
  user_id: string;
  blood_group: string | null;
  allergies: string[] | null;
  date_of_birth: string | null;
  emergency_contact: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  date_time: string;
  status: AppointmentStatus;
  motive: string;
  notes: string | null;
  created_at: string;
  // Joined
  doctor?: Doctor & { profile?: Profile };
  patient?: Patient & { profile?: Profile };
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  diagnosis: string;
  prescription: string | null;
  notes: string | null;
  file_url: string | null;
  created_at: string;
}

export interface Availability {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
  slot_duration: number; // minutes
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment_confirmed' | 'appointment_cancelled' | 'appointment_reminder' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient?: Patient & { profile?: Profile };
}
