import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Nav } from "@/components/layout/Nav";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "CATL · Back-office",
  description:
    "Back-office de la Ceinture Aliment-Terre Liégeoise — gestion des stocks, réceptions, zones et historique.",
  applicationName: "CATL · Back-office",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CATL",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2c3e50",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-catl-bg">
        <Providers>
          <Header />
          <Nav />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white py-4">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-xs text-catl-text">
              CATL · Ceinture Aliment-Terre Liégeoise · Hackathon 2026
            </div>
          </footer>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
