"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Notification } from "@/types/database";
import { Bell, CheckCircle2, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  async function load(nextPage = page) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const from = (nextPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) toast.error(error.message);
    setItems((data || []) as Notification[]);
    setTotal(count || 0);
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]);

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("Notifications marquées comme lues");
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-teal-600" /> Notifications</h1>
          <p className="text-[var(--text-secondary)] mt-1">Historique de vos alertes et annonces</p>
        </div>
        <button onClick={markAllRead} className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-semibold border border-teal-100 hover:bg-teal-100 transition">
          Tout marquer lu
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
      ) : items.length === 0 ? (
        <div className="card-gradient rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Aucune notification</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Vos notifications apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((notif) => (
            <div key={notif.id} className={`card-gradient rounded-2xl p-5 border ${notif.is_read ? "border-[var(--border)]" : "border-teal-200 bg-teal-50/30"}`}>
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.type === "system" ? "bg-violet-100 text-violet-600" : "bg-teal-100 text-teal-700"}`}>
                  {notif.type === "system" ? <Megaphone className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-[var(--text-primary)]">{notif.title}</h3>
                    {notif.is_read && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{notif.message}</p>
                  <p className="text-xs text-[var(--text-secondary)]/70 mt-3">{new Date(notif.created_at).toLocaleString("fr-FR")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-50">Précédent</button>
          <span className="text-sm text-[var(--text-secondary)]">Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm disabled:opacity-50">Suivant</button>
        </div>
      )}
    </div>
  );
}
