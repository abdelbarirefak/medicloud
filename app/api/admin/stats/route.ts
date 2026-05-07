import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { adminLimiter, getClientId, checkRateLimit } from "@/lib/ratelimit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(adminLimiter, getClientId(request));
  if (rl) return rl;

  // Verify the requesting user is an admin
  const supabaseUser = await createServerSupabaseClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Use service role to bypass RLS
  const admin = await createServiceRoleClient();

  const [
    { count: users },
    { count: doctors },
    { count: patients },
    { count: appointments },
    { data: allDoctors },
    { data: allPatients },
    { data: allSpecialties },
    { data: auditLogs },
    { data: appointmentsList },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("doctors").select("*", { count: "exact", head: true }),
    admin.from("patients").select("*", { count: "exact", head: true }),
    admin.from("appointments").select("*", { count: "exact", head: true }),
    admin.from("doctors").select("*, profile:profiles(*)").order("created_at", { ascending: false }),
    admin.from("patients").select("*, profile:profiles(*)").order("created_at", { ascending: false }),
    admin.from("specialties").select("*").order("name", { ascending: true }),
    admin.from("audit_logs").select("*, admin:profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    admin.from("appointments").select("id, date_time, status, created_at"),
  ]);

  return NextResponse.json({
    stats: {
      users: users || 0,
      doctors: doctors || 0,
      patients: patients || 0,
      appointments: appointments || 0,
    },
    doctors: allDoctors || [],
    patients: allPatients || [],
    specialties: allSpecialties || [],
    auditLogs: auditLogs || [],
    appointmentsList: appointmentsList || [],
  });
}
