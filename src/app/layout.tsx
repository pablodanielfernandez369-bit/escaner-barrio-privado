import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"]
});

import { CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: `${CONFIG.neighborhoodName} | ${CONFIG.brandName}`,
  description: "Portal de Seguridad y Biometría Inteligente",
  manifest: "/manifest.json",
  themeColor: "#020617",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: CONFIG.neighborhoodName
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${outfit.className} bg-slate-950 text-white antialiased selection:bg-emerald-500/20 selection:text-emerald-500`}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none opacity-50" />
        <main className="relative min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
