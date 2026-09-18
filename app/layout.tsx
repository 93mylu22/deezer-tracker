import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Tracker",
  description: "Seguimiento diario de posiciones en charts de Colombia",
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
