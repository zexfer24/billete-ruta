import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

/*
 * Atkinson Hyperlegible Next, del Braille Institute: distingue caracteres
 * parecidos (I l 1, O 0, S 5), clave para códigos de reserva, cédulas y montos.
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-atkinson",
  /*
   * Next no tiene métricas de esta fuente para ajustar la de respaldo y lo
   * advierte en cada compilación; se declara el respaldo a mano.
   */
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "TicketRuta — Terminal de pasajeros",
    template: "%s · TicketRuta",
  },
  description: "Compra tu pasaje de autobús, paga y muestra tu ticket al subir.",
  applicationName: "TicketRuta",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#601DBF",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={atkinson.variable} data-scroll-behavior="smooth">
      <body className="bg-lienzo font-sans text-tinta antialiased">{children}</body>
    </html>
  );
}
