import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { adminLimiter, getClientId, checkRateLimit } from "@/lib/ratelimit";

export async function PATCH(request: Request) {
  const rl = await checkRateLimit(adminLimiter, getClientId(request));
  if (rl) return rl;

  // Verify the requesting user is an admin
  const supabaseUser = await createServerSupabaseClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { doctorId } = await request.json();
  if (!doctorId) return NextResponse.json({ error: "doctorId required" }, { status: 400 });

  // Use service role to bypass RLS
  const admin = await createServiceRoleClient();
  const { error } = await admin.from("doctors").update({ is_verified: true }).eq("id", doctorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
