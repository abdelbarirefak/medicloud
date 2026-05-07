"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useState, useEffect } from "react";
import type { Profile } from "@/types/database";
import {
  Heart,
  LayoutDashboard,
  Search,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Stethoscope,
  Users,
  Shield,
  FileText,
  CalendarClock,
  Sun,
  Moon
} from "lucide-react";

import { useNotifications } from "@/components/NotificationProvider";
import { useTheme } from "@/components/ThemeProvider";

const patientLinks = [
  { href: "/patient/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/patient/search", label: "Chercher un médecin", icon: Search },
  { href: "/patient/appointments", label: "Mes rendez-vous", icon: Calendar },
  { href: "/patient/records", label: "Mes documents", icon: FileText },
  { href: "/patient/notifications", label: "Notifications", icon: Bell },
  { href: "/patient/profile", label: "Mon profil", icon: User },
];

const doctorLinks = [
  { href: "/doctor/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/doctor/agenda", label: "Mon agenda", icon: Calendar },
  { href: "/doctor/patients", label: "Mes patients", icon: Users },
  { href: "/doctor/notifications", label: "Notifications", icon: Bell },
  { href: "/doctor/availability", label: "Disponibilités", icon: CalendarClock },
  { href: "/doctor/profile", label: "Mon profil", icon: User },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Administration", icon: Shield },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const { unreadCount, markAsRead } = useNotifications();
  const { theme, toggle: toggleTheme } = useTheme();

  const [roleAssumed, setRoleAssumed] = useState<string>("patient");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fast path: get role from JWT directly to avoid UI flash
      setRoleAssumed(user.user_metadata?.role || "patient");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      if (data?.role) setRoleAssumed(data.role);
    }
    loadProfile();
  }, [supabase]);

  const links =
    roleAssumed === "doctor"
      ? doctorLinks
      : roleAssumed === "admin"
      ? adminLinks
      : patientLinks;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--bg-card)] border-r border-[var(--border)] fixed inset-y-0 z-40">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-[var(--border)]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow-md shadow-teal-500/15">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-lg font-bold">
            Medi<span className="text-[var(--primary-light)]">Cloud</span>
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                }`}
              >
                <link.icon className="w-4.5 h-4.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[var(--text-primary)] text-xs font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                {profile?.full_name || "Chargement..."}
              </div>
              <div className="text-xs text-[var(--text-secondary)] capitalize">
                {profile?.role === "doctor" ? "Médecin" : profile?.role === "admin" ? "Admin" : "Patient"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 h-full bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border)]">
              <span className="text-lg font-bold">
                Medi<span className="text-[var(--primary-light)]">Cloud</span>
              </span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-sky-500/15 text-teal-600"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <link.icon className="w-4.5 h-4.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4.5 h-4.5" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 relative min-h-screen">
        {/* Top bar */}
        <header className="glass sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-t-0 border-[var(--border)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition p-1"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link href={`/${roleAssumed}/notifications`} onClick={markAsRead} className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition p-1" title="Centre de notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
