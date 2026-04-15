import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Barrio Seguro - Santa Inés",
  description: "Portal de Seguridad y Biometría Inteligente",
  manifest: "/manifest.json",
  themeColor: "#020617",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "S.Inés Guard"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased selection:bg-emerald-500/30 selection:text-emerald-200`}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)] pointer-events-none" />
        <main className="relative min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
