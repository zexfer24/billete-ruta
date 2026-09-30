"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuelve a pedir la pantalla cada `intervalMs` mientras está montado, hasta
 * `maxTries` veces. Lo usa el detalle de una reserva pagada mientras su
 * ticket se genera, para que el QR aparezca solo sin recargar a mano.
 */
export function AutoRefresh({ intervalMs = 10_000, maxTries = 12 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter();

  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= maxTries) window.clearInterval(timer);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [router, intervalMs, maxTries]);

  return null;
}
