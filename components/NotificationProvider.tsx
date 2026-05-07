"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { BellRing, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase";

interface NotificationContextProps {
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: () => void;
}

type NotificationRow = {
  id: string;
  user_id: string;
  type: "appointment_confirmed" | "appointment_cancelled" | "appointment_reminder" | "system";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const NotificationContext = createContext<NotificationContextProps>({
  unreadCount: 0,
  refreshNotifications: async () => {},
  markAsRead: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

function playNotificationSound() {
  try {
    const audioContextCtor =
      window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!audioContextCtor) return;

    const ctx = new audioContextCtor();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // Ignore browsers that block autoplay audio until user interaction.
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createClient());
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (count !== null) setUnreadCount(count);
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = supabaseRef.current;

    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      await fetchUnreadCount();

      if (!active) return;

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: RealtimePostgresInsertPayload<NotificationRow>) => {
            const newNotif = payload.new;

            playNotificationSound();
            setUnreadCount((prev) => prev + 1);

            if (newNotif.type === "system") {
              toast.info(`Annonce système : ${newNotif.title}`, {
                description: newNotif.message,
                duration: 6000,
                icon: <Megaphone className="w-5 h-5 text-violet-500" />,
              });
              return;
            }

            toast.success(newNotif.title, {
              description: newNotif.message,
              icon: <BellRing className="w-5 h-5 text-teal-600" />,
            });
          }
        )
        .subscribe();

      if (active) {
        subscriptionRef.current = channel;
      } else {
        supabase.removeChannel(channel);
      }
    }

    void setupRealtime();

    return () => {
      active = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async () => {
    setUnreadCount(0);
    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, refreshNotifications: fetchUnreadCount, markAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
