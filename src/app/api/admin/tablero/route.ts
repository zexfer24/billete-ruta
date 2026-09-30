import { NextResponse } from "next/server";
import { can, currentPanelUser } from "@/modules/auth";
import { departureTaxRevenue, last24h } from "@/modules/reports";
import { formatMoney } from "@/lib/decimal";

/**
 * Tasa de salida cobrada en las últimas 24 horas, consultada por live-tax.tsx
 * cada 30 segundos mientras el tablero está a la vista. Devuelve solo lo que
 * la tarjeta muestra, más el momento de la cifra (`generatedAt`). Requiere
 * sesión de panel con el permiso terminal.dashboard; el rol OPERADOR nunca lo
 * tiene.
 */
export async function GET(): Promise<NextResponse> {
  const user = await currentPanelUser();
  if (!user) {
    return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  }
  if (!can(user.role, "terminal.dashboard")) {
    return NextResponse.json({ error: "No tienes permiso para ver el tablero." }, { status: 403 });
  }

  const { from, to } = last24h();
  const tax = await departureTaxRevenue(from, to);

  return NextResponse.json(
    {
      tax: {
        totalUsd: formatMoney(tax.totalUsd, "USD"),
        reservations: tax.reservations,
        passengers: tax.passengers,
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
