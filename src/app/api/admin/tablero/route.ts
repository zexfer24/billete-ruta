import { NextResponse } from "next/server";
import { can, currentPanelUser } from "@/modules/auth";
import {
  departureTaxRevenue,
  last24h,
  newAccounts,
  recurringAccounts,
  terminalTripCount,
} from "@/modules/reports";
import { formatMoney } from "@/lib/decimal";

/**
 * Cifras del tablero del terminal en las últimas 24 horas, consultadas por
 * live-tax.tsx cada 30 segundos. Requiere sesión de panel con el permiso
 * terminal.dashboard; el rol OPERADOR nunca lo tiene.
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
  const [tax, trips, freshAccounts, returningAccounts] = await Promise.all([
    departureTaxRevenue(from, to),
    terminalTripCount(from, to),
    newAccounts(from, to),
    recurringAccounts(),
  ]);

  return NextResponse.json({
    tax: {
      totalUsd: formatMoney(tax.totalUsd, "USD"),
      reservations: tax.reservations,
      passengers: tax.passengers,
    },
    trips,
    newAccounts: freshAccounts,
    recurringAccounts: returningAccounts,
    generatedAt: new Date().toISOString(),
  });
}
