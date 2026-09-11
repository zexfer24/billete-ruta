import type { Prisma } from "@prisma/client";
import { round2, ZERO } from "@/lib/decimal";
import { balanceUsd } from "@/modules/catalog";

export type ProofCoverageKind = "ABONO_PARCIAL" | "PAGO_COMPLETO" | "EXCEDE_SALDO";

export interface ProofCoverage {
  kind: ProofCoverageKind;
  balanceBeforeUsd: Prisma.Decimal;
  balanceAfterUsd: Prisma.Decimal;
  excessUsd: Prisma.Decimal;
}

/**
 * Clasifica cómo un comprobante cubre el saldo pendiente de la reserva: si es
 * un abono parcial, si completa el saldo exacto, o si lo excede. Función pura,
 * sin acceso a base de datos.
 */
export function proofCoverage(
  totalUsd: Prisma.Decimal,
  paidUsd: Prisma.Decimal,
  amountUsd: Prisma.Decimal,
): ProofCoverage {
  const balanceBeforeUsd = balanceUsd(totalUsd, paidUsd);
  const balanceAfterUsd = balanceUsd(totalUsd, round2(paidUsd.add(amountUsd)));

  const excedente = round2(amountUsd.sub(balanceBeforeUsd));
  const excessUsd = excedente.isNegative() ? ZERO : excedente;

  let kind: ProofCoverageKind;
  if (excessUsd.greaterThan(ZERO)) {
    kind = "EXCEDE_SALDO";
  } else if (balanceAfterUsd.isZero()) {
    kind = "PAGO_COMPLETO";
  } else {
    kind = "ABONO_PARCIAL";
  }

  return { kind, balanceBeforeUsd, balanceAfterUsd, excessUsd };
}
