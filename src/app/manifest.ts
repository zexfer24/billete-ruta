import type { MetadataRoute } from "next";

/** Manifiesto de la aplicación: permite instalar TicketRuta en la pantalla de inicio del teléfono. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TicketRuta — Terminal de pasajeros",
    short_name: "TicketRuta",
    description: "Compra tu pasaje de autobús, paga y muestra tu ticket al subir.",
    start_url: "/",
    display: "standalone",
    theme_color: "#601DBF",
    background_color: "#F6F4FA",
    lang: "es",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
