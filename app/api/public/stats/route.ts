import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const [doctors, patients, appointments] = await Promise.all([
    supabase.from("doctors").select("id", { count: "exact", head: true }).eq("is_verified", true),
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    doctors: doctors.count || 0,
    patients: patients.count || 0,
    appointments: appointments.count || 0,
    satisfaction: 98,
  });
}
