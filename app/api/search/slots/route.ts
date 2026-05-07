import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchLimiter, getClientId, checkRateLimit } from "@/lib/ratelimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export async function GET(request: Request) {
  const rateLimitResponse = await checkRateLimit(searchLimiter, getClientId(request));
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");

  if (!doctorId || !date) {
    return NextResponse.json({ error: "doctorId and date are required" }, { status: 400 });
  }

  const selectedDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = selectedDate.getDay();

  const { data: availability } = await supabase
    .from("availability")
    .select("start_time, end_time, slot_duration")
    .eq("doctor_id", doctorId)
    .eq("day_of_week", dayOfWeek)
    .single();

  const startTime = availability?.start_time?.slice(0, 5) || "08:00";
  const endTime = availability?.end_time?.slice(0, 5) || "17:00";
  const slotDuration = availability?.slot_duration || 30;

  if (!availability && dayOfWeek === 0) {
    return NextResponse.json({ slots: [] });
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("date_time")
    .eq("doctor_id", doctorId)
    .in("status", ["pending", "confirmed"])
    .gte("date_time", dayStart.toISOString())
    .lt("date_time", dayEnd.toISOString());

  const booked = new Set((appointments || []).map((appt) => {
    const d = new Date(appt.date_time);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }));

  const slots: string[] = [];
  for (let cursor = toMinutes(startTime); cursor < toMinutes(endTime); cursor += slotDuration) {
    const time = toTime(cursor);
    const slotDate = new Date(`${date}T${time}:00`);
    if (slotDate > new Date() && !booked.has(time)) slots.push(time);
  }

  return NextResponse.json({ slots });
}
