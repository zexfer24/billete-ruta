import { describe, expect, it } from "vitest";
import { buildNotices } from "@/modules/notices";
import type { NoticeReservationInput } from "@/modules/notices";

const AHORA = new Date("2026-09-13T12:00:00.000Z");

function reserva(overrides: Partial<NoticeReservationInput> = {}): NoticeReservationInput {
  return {
    code: "TR-0913-1PAX-AAAA",
    status: "PENDIENTE_PAGO",
    departsAt: new Date(AHORA.getTime() + 48 * 3_600_000),
    origin: "Caracas",
    destination: "Maracaibo",
    expiresAt: null,
    reconfirmedAt: null,
    hasTicket: false,
    latestProof: null,
    ...overrides,
  };
}

describe("buildNotices", () => {
  it("avisa cuando falta la foto de la cédula", () => {
    const avisos = buildNotices({ hasIdDocument: false, reservations: [] }, AHORA);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      kind: "DOCUMENTO_FALTANTE",
      level: "alerta",
      href: "/mi/documentos",
      at: AHORA,
    });
  });

  it("no avisa nada cuando hay documento y no hay reservas", () => {
    expect(buildNotices({ hasIdDocument: true, reservations: [] }, AHORA)).toEqual([]);
  });

  it("avisa que la reserva se libera en 40 minutos", () => {
    const expiresAt = new Date(AHORA.getTime() + 40 * 60_000);
    const avisos = buildNotices(
      { hasIdDocument: true, reservations: [reserva({ status: "PENDIENTE_PAGO", expiresAt })] },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.kind).toBe("RESERVA_POR_LIBERAR");
    expect(avisos[0]?.level).toBe("alerta");
    expect(avisos[0]?.body).toContain("40 min");
    expect(avisos[0]?.at).toEqual(expiresAt);
    expect(avisos[0]?.href).toBe("/mi/reservas/TR-0913-1PAX-AAAA");
  });

  it("avisa el comprobante rechazado con el motivo en el cuerpo", () => {
    const createdAt = new Date(AHORA.getTime() - 10 * 60_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [
          reserva({
            status: "PENDIENTE_PAGO",
            latestProof: { status: "RECHAZADO", rejectionReason: "Monto no coincide", createdAt },
          }),
        ],
      },
      AHORA,
    );
    const aviso = avisos.find((a) => a.kind === "COMPROBANTE_RECHAZADO");
    expect(aviso).toBeDefined();
    expect(aviso?.level).toBe("alerta");
    expect(aviso?.body).toContain("Monto no coincide");
    expect(aviso?.at).toEqual(createdAt);
  });

  it("un rechazo sin motivo no rompe el cuerpo", () => {
    const createdAt = new Date(AHORA.getTime() - 5 * 60_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [
          reserva({
            status: "PENDIENTE_PAGO",
            latestProof: { status: "RECHAZADO", rejectionReason: null, createdAt },
          }),
        ],
      },
      AHORA,
    );
    const aviso = avisos.find((a) => a.kind === "COMPROBANTE_RECHAZADO");
    expect(aviso).toBeDefined();
    expect(aviso?.body.length).toBeGreaterThan(0);
  });

  it("una reserva en validación produce un aviso informativo", () => {
    const createdAt = new Date(AHORA.getTime() - 20 * 60_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [
          reserva({
            status: "EN_VALIDACION",
            latestProof: { status: "PENDIENTE", rejectionReason: null, createdAt },
          }),
        ],
      },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ kind: "COMPROBANTE_EN_VALIDACION", level: "info", at: createdAt });
  });

  it("pago en sitio a veinte horas de la salida sin reconfirmar avisa", () => {
    const departsAt = new Date(AHORA.getTime() + 20 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGO_EN_SITIO", departsAt, reconfirmedAt: null })],
      },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ kind: "RECONFIRMAR_PAGO_EN_SITIO", level: "alerta", at: departsAt });
  });

  it("pago en sitio a treinta horas de la salida no avisa todavía", () => {
    const departsAt = new Date(AHORA.getTime() + 30 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGO_EN_SITIO", departsAt, reconfirmedAt: null })],
      },
      AHORA,
    );
    expect(avisos).toEqual([]);
  });

  it("pago en sitio ya reconfirmado no avisa", () => {
    const departsAt = new Date(AHORA.getTime() + 20 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [
          reserva({
            status: "PAGO_EN_SITIO",
            departsAt,
            reconfirmedAt: new Date(AHORA.getTime() - 60_000),
          }),
        ],
      },
      AHORA,
    );
    expect(avisos).toEqual([]);
  });

  it("el ticket listo avisa con origen, destino y hora", () => {
    const departsAt = new Date(AHORA.getTime() + 5 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [
          reserva({
            status: "PAGADA",
            departsAt,
            hasTicket: true,
            origin: "Caracas",
            destination: "Maracaibo",
          }),
        ],
      },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ kind: "TICKET_LISTO", level: "exito", at: departsAt });
    expect(avisos[0]?.body).toContain("Caracas");
    expect(avisos[0]?.body).toContain("Maracaibo");
  });

  it("una reserva pagada sin ticket todavía no avisa ticket listo", () => {
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGADA", hasTicket: false })],
      },
      AHORA,
    );
    expect(avisos.filter((a) => a.kind === "TICKET_LISTO")).toHaveLength(0);
  });

  it.each(["LIBERADA", "CANCELADA", "ABORDADA", "NO_SHOW"] as const)(
    "un estado final (%s) no produce ningún aviso",
    (status) => {
      const avisos = buildNotices(
        {
          hasIdDocument: true,
          reservations: [
            reserva({
              status,
              expiresAt: new Date(AHORA.getTime() + 10 * 60_000),
              latestProof: { status: "RECHAZADO", rejectionReason: "motivo", createdAt: AHORA },
            }),
          ],
        },
        AHORA,
      );
      expect(avisos).toEqual([]);
    },
  );

  it("una salida ya pasada no produce ningún aviso", () => {
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [
          reserva({
            status: "PENDIENTE_PAGO",
            departsAt: new Date(AHORA.getTime() - 3_600_000),
            expiresAt: new Date(AHORA.getTime() + 10 * 60_000),
          }),
        ],
      },
      AHORA,
    );
    expect(avisos).toEqual([]);
  });

  it("ordena primero alerta, luego info, luego éxito, y por fecha dentro de cada nivel", () => {
    const avisos = buildNotices(
      {
        hasIdDocument: false,
        reservations: [
          reserva({
            code: "TR-0913-1PAX-BBBB",
            status: "PAGADA",
            departsAt: new Date(AHORA.getTime() + 2 * 3_600_000),
            hasTicket: true,
          }),
          reserva({
            code: "TR-0913-1PAX-CCCC",
            status: "EN_VALIDACION",
            latestProof: { status: "PENDIENTE", rejectionReason: null, createdAt: AHORA },
          }),
          reserva({
            code: "TR-0913-1PAX-DDDD",
            status: "PENDIENTE_PAGO",
            expiresAt: new Date(AHORA.getTime() + 90 * 60_000),
          }),
        ],
      },
      AHORA,
    );

    expect(avisos.map((a) => a.kind)).toEqual([
      "DOCUMENTO_FALTANTE",
      "RESERVA_POR_LIBERAR",
      "COMPROBANTE_EN_VALIDACION",
      "TICKET_LISTO",
    ]);
  });
});
