import { createHash, randomBytes } from "node:crypto";
import type { PanelRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PANEL_COOKIE = "tr_panel";
export const PASSENGER_COOKIE = "tr_pax";

/** Duración de una sesión, tanto de panel como de pasajero. */
export const SESSION_HOURS = 12;

export interface PanelSessionUser {
  id: string;
  email: string;
  name: string;
  role: PanelRole;
  agencyId: string | null;
  agencyName: string | null;
}

export interface PassengerSessionUser {
  id: string;
  idNumber: string;
  fullName: string;
  phone: string;
  birthYear: number;
}

function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/** Solo se guarda el hash: un volcado de la tabla no permite suplantar a nadie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_HOURS * 3_600_000);
}

// --- Panel ------------------------------------------------------------------

export async function createPanelSession(
  panelUserId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = newToken();
  const expiresAt = expiry(now);
  await prisma.panelSession.create({ data: { panelUserId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

export async function resolvePanelSession(
  token: string | undefined,
  now: Date = new Date(),
): Promise<PanelSessionUser | null> {
  if (!token) return null;
  const sesion = await prisma.panelSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { panelUser: { include: { agency: true } } },
  });
  if (!sesion || sesion.expiresAt <= now || !sesion.panelUser.active) return null;

  await prisma.panelSession.update({
    where: { id: sesion.id },
    data: { lastSeenAt: now },
  });

  return {
    id: sesion.panelUser.id,
    email: sesion.panelUser.email,
    name: sesion.panelUser.name,
    role: sesion.panelUser.role,
    agencyId: sesion.panelUser.agencyId,
    agencyName: sesion.panelUser.agency?.name ?? null,
  };
}

export async function destroyPanelSession(token: string): Promise<void> {
  await prisma.panelSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

// --- Pasajero ---------------------------------------------------------------

export async function createPassengerSession(
  accountId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = newToken();
  const expiresAt = expiry(now);
  await prisma.passengerSession.create({ data: { accountId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

export async function resolvePassengerSession(
  token: string | undefined,
  now: Date = new Date(),
): Promise<PassengerSessionUser | null> {
  if (!token) return null;
  const sesion = await prisma.passengerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { account: true },
  });
  if (!sesion || sesion.expiresAt <= now || !sesion.account.active) return null;

  await prisma.passengerSession.update({
    where: { id: sesion.id },
    data: { lastSeenAt: now },
  });

  return {
    id: sesion.account.id,
    idNumber: sesion.account.idNumber,
    fullName: sesion.account.fullName,
    phone: sesion.account.phone,
    birthYear: sesion.account.birthYear,
  };
}

export async function destroyPassengerSession(token: string): Promise<void> {
  await prisma.passengerSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
