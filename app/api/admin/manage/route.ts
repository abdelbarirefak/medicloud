import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { adminLimiter, getClientId, checkRateLimit } from "@/lib/ratelimit";
import { invalidateDoctorSearchCache } from "@/lib/cache";

type BroadcastTarget = { id: string };

async function logAudit(admin: any, adminId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  await admin.from("audit_logs").insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details }).catch(() => {});
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(adminLimiter, getClientId(request));
  if (rl) return rl;

  const supabaseUser = await createServerSupabaseClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createServiceRoleClient();
  const body = await request.json();
  const { action, payload } = body;

  try {
    switch(action) {
      case "TOGGLE_VERIFICATION": {
        const { error: vError } = await admin.from("doctors").update({ is_verified: payload.status }).eq("id", payload.doctorId);
        if (vError) throw new Error("Verif error: " + vError.message);
        await invalidateDoctorSearchCache();
        await logAudit(admin, user.id, "TOGGLE_VERIFICATION", "doctor", payload.doctorId, { status: payload.status });
        return NextResponse.json({ success: true });
      }
        
      case "TOGGLE_FEATURED": {
        const { error: fError } = await admin.from("doctors").update({ is_featured: payload.status }).eq("id", payload.doctorId);
        if (fError) throw new Error("Feature error: " + fError.message);
        await invalidateDoctorSearchCache();
        await logAudit(admin, user.id, "TOGGLE_FEATURED", "doctor", payload.doctorId, { status: payload.status });
        return NextResponse.json({ success: true });
      }

      case "TOGGLE_ACTIVATION": {
        const { error: profileError } = await admin.from("profiles").update({ is_active: payload.status }).eq("id", payload.userId);
        if (profileError) throw new Error("Erreur Profile update: " + profileError.message);
        await logAudit(admin, user.id, "TOGGLE_ACTIVATION", "profile", payload.userId, { status: payload.status });
        return NextResponse.json({ success: true });
      }

      case "DELETE_USER":
        await admin.auth.admin.deleteUser(payload.userId);
        await logAudit(admin, user.id, "DELETE_USER", "profile", payload.userId);
        return NextResponse.json({ success: true });

      case "ADD_SPECIALTY":
        await admin.from("specialties").insert({ name: payload.name });
        await logAudit(admin, user.id, "ADD_SPECIALTY", "specialty", payload.name);
        return NextResponse.json({ success: true });
      
      case "DELETE_SPECIALTY":
        await admin.from("specialties").delete().eq("id", payload.id);
        await logAudit(admin, user.id, "DELETE_SPECIALTY", "specialty", payload.id);
        return NextResponse.json({ success: true });

      case "SEND_BROADCAST":
        // Fetch all targets
        const { data: targets } = await admin.from("profiles").select("id").in("role", payload.roles);
        if (targets) {
          const notifications = (targets as BroadcastTarget[]).map((t) => ({
            user_id: t.id,
            title: payload.title,
            message: payload.message,
            type: "system"
          }));
          const { error } = await admin.from("notifications").insert(notifications);
          if (error) throw error;
        }
        await logAudit(admin, user.id, "SEND_BROADCAST", "notification", "broadcast", { roles: payload.roles, title: payload.title });
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
