import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { ConversationSessionCleanup } from "@/components/chat/ConversationSessionCleanup";
import { ChatAccessLogger } from "@/components/chat/ChatAccessLogger";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteVisitTracker } from "@/components/SiteVisitTracker";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PlatformPresenceProvider } from "@/contexts/PlatformPresenceContext";
import { StatePresenceProvider } from "@/contexts/StatePresenceContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trovaa — Sua conversa, seu lugar",
  description: "Converse em tempo real por estado com o Trovaa. Sua conversa, seu lugar.",
  applicationName: "Trovaa",
  appleWebApp: {
    capable: true,
    title: "Trovaa",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("trovaa-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(!t&&d)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" suppressHydrationWarning>
        <ThemeProvider>
          <PlatformPresenceProvider>
            <StatePresenceProvider>
              {children}
              <ConversationSessionCleanup />
              <ChatAccessLogger />
              <SiteVisitTracker />
              <PwaRegister />
              <InstallAppBanner />
            </StatePresenceProvider>
          </PlatformPresenceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
