import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { doctorId, dateTime, motive } = body;

  if (!doctorId || !dateTime || !motive?.trim()) {
    return NextResponse.json({ error: "Missing appointment fields" }, { status: 400 });
  }

  const selectedDate = new Date(dateTime);
  if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
    return NextResponse.json({ error: "Invalid appointment date" }, { status: 400 });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  const { count: alreadyBooked } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId)
    .eq("date_time", selectedDate.toISOString())
    .in("status", ["pending", "confirmed"]);

  if ((alreadyBooked || 0) > 0) {
    return NextResponse.json({ error: "Ce créneau vient d'être réservé. Veuillez choisir un autre horaire." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      doctor_id: doctorId,
      patient_id: patient.id,
      date_time: selectedDate.toISOString(),
      motive: motive.trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { appointmentId, dateTime } = body;

  if (!appointmentId || !dateTime) {
    return NextResponse.json({ error: "Missing reschedule fields" }, { status: 400 });
  }

  const selectedDate = new Date(dateTime);
  if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
    return NextResponse.json({ error: "Invalid appointment date" }, { status: 400 });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, doctor_id, patient_id, status")
    .eq("id", appointmentId)
    .eq("patient_id", patient.id)
    .single();

  if (!appointment || !["pending", "confirmed"].includes(appointment.status)) {
    return NextResponse.json({ error: "Appointment cannot be rescheduled" }, { status: 400 });
  }

  const { count: alreadyBooked } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", appointment.doctor_id)
    .eq("date_time", selectedDate.toISOString())
    .in("status", ["pending", "confirmed"])
    .neq("id", appointment.id);

  if ((alreadyBooked || 0) > 0) {
    return NextResponse.json({ error: "Ce créneau est déjà réservé." }, { status: 409 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ date_time: selectedDate.toISOString(), status: "pending" })
    .eq("id", appointment.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
