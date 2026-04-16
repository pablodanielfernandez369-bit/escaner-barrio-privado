import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
                        subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800", "900"]
});

export const metadata: Metadata = {
    title: "Santa Ines | Security Portal",
    description: "Portal de Seguridad y Biometria Inteligente",
    manifest: "/manifest.json",
    themeColor: "#fafaf9",
    viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
    appleWebApp: {
          capable: true,
          statusBarStyle: "default",
          title: "Santa Ines"
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
          <html lang="es" className="light">
                <body className={`${outfit.className} bg-[#fafaf9] text-slate-900 antialiased selection:bg-emerald-500/20 selection:text-emerald-900`}>
                        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none" />
                        <main className="relative min-h-screen">
                          {children}
                        </main>
                </body>
          </html>
        );
}
</html>
