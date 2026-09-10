import type { PanelRole } from "@prisma/client";

export const ALL_PERMISSIONS = [
  "payments.review",
  "payments.cash",
  "fleet.manage",
  "departures.manage",
  "boarding.manage",
  "trips.manage",
  "agency.reports",
  "terminal.dashboard",
  "terminal.users",
  "terminal.agencies",
  "terminal.rates",
  "terminal.messages",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * El admin del terminal supervisa y configura, pero no vende ni cobra: por eso
 * no tiene los permisos de venta. El operador opera su agencia y nunca ve
 * información del terminal ni de otras agencias.
 */
const MATRIX: Record<PanelRole, readonly Permission[]> = {
  ADMIN: [
    "terminal.dashboard",
    "terminal.users",
    "terminal.agencies",
    "terminal.rates",
    "terminal.messages",
    "agency.reports",
  ],
  OPERADOR: [
    "payments.review",
    "payments.cash",
    "fleet.manage",
    "departures.manage",
    "boarding.manage",
    "trips.manage",
    "agency.reports",
  ],
};

export class ForbiddenError extends Error {
  constructor(role: PanelRole, permission: Permission) {
    super(`El rol ${role} no tiene el permiso ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function can(role: PanelRole, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function assertCan(role: PanelRole, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(role, permission);
}
