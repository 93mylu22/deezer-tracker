import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARMY 🇨🇴 - Music Tracker",
  description: "Seguimiento diario de posiciones en charts de Deezer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-bg">{children}</body>
    </html>
  );
}
