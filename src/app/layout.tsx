import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketRuta",
  description: "Sistema de reservas y control de pasajeros del terminal terrestre",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
