import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La venta en taquilla y los documentos del pasajero suben imágenes de
  // hasta 5 MB cada una; el límite por defecto de las acciones de servidor
  // es de solo 1 MB.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default nextConfig;
