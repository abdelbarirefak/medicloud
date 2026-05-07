import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { appointmentId, rating, comment } = body;

  if (!appointmentId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, patient_id, doctor_id, status")
    .eq("id", appointmentId)
    .eq("patient_id", patient.id)
    .eq("status", "completed")
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: "Completed appointment not found" }, { status: 404 });
  }

  const { error } = await supabase.from("reviews").insert({
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    rating,
    comment: comment?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
