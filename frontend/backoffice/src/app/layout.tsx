import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Nav } from "@/components/layout/Nav";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "CATL · Back-office",
  description:
    "Back-office de la Ceinture Aliment-Terre Liégeoise — gestion des stocks, réceptions, zones et historique.",
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
          <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white py-4">
            <div className="max-w-6xl mx-auto px-6 text-xs text-catl-text">
              CATL · Ceinture Aliment-Terre Liégeoise · Hackathon 2026
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
