import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { NotificationProvider } from "@/components/NotificationProvider";
import { PWARegistration } from "@/components/PWARegistration";
import { ThemeProvider } from "@/components/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const viewport: Viewport = {
  themeColor: "#14b8a6",
};

export const metadata: Metadata = {
  title: "MediCloud — Rendez-vous Médicaux en Ligne",
  manifest: "/manifest.json",
  description:
    "Plateforme cloud de prise de rendez-vous médicaux au Maroc. Trouvez un médecin, réservez en ligne, gérez votre dossier médical.",
  keywords: ["médecin", "rendez-vous", "santé", "Maroc", "cloud", "MediCloud"],
  appleWebApp: {
    title: "MediCloud",
    statusBarStyle: "default",
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={plusJakartaSans.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ThemeProvider>
        <PWARegistration />
        <Toaster theme="light" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
