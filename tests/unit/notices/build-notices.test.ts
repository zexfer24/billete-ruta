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
    expect(avisos[0]?.body).toContain("tu viaje Caracas → Maracaibo");
    expect(avisos[0]?.at).toEqual(expiresAt);
    expect(avisos[0]?.href).toBe("/mi/reservas/TR-0913-1PAX-AAAA");
  });

  it("si el bus sale en 39 min, el plazo es la salida y no las 2 horas de la reserva", () => {
    const departsAt = new Date(AHORA.getTime() + 39 * 60_000);
    const expiresAt = new Date(AHORA.getTime() + 2 * 3_600_000);
    const [aviso, ...resto] = buildNotices(
      { hasIdDocument: true, reservations: [reserva({ status: "PENDIENTE_PAGO", departsAt, expiresAt })] },
      AHORA,
    );
    expect(resto).toEqual([]);
    expect(aviso).toMatchObject({ kind: "RESERVA_POR_LIBERAR", level: "alerta", at: departsAt });
    expect(aviso?.title).toBe("Paga antes de que salga tu bus");
    // AHORA es 08:00 en Caracas.
    expect(aviso?.body).toBe(
      "Tu viaje Caracas → Maracaibo sale hoy a las 08:39, en 39 min. Paga antes de esa hora para no perder el viaje.",
    );
    expect(aviso?.body).not.toContain("2 h");
  });

  it("si el bus sale en 10 horas, el plazo sigue siendo el de la reserva", () => {
    const departsAt = new Date(AHORA.getTime() + 10 * 3_600_000);
    const expiresAt = new Date(AHORA.getTime() + 2 * 3_600_000);
    const [aviso] = buildNotices(
      { hasIdDocument: true, reservations: [reserva({ status: "PENDIENTE_PAGO", departsAt, expiresAt })] },
      AHORA,
    );
    expect(aviso).toMatchObject({ kind: "RESERVA_POR_LIBERAR", at: expiresAt });
    expect(aviso?.title).toBe("Paga pronto para no perder tu puesto");
    expect(aviso?.body).toContain("para pagar tu viaje Caracas → Maracaibo. Si no pagas, tu puesto queda libre");
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
    expect(aviso?.body).toContain("del viaje Caracas → Maracaibo");
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
    // Nombra el viaje y su salida, para no confundirlo con otra reserva.
    expect(avisos[0]?.body).toContain("del viaje Caracas → Maracaibo, que sale el mar 15 sep a las 08:00");
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
    // AHORA es 08:00 en Caracas: sale mañana a las 04:00 y el plazo vence hoy a las 16:00.
    const limite = new Date(departsAt.getTime() - 12 * 3_600_000);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ kind: "RECONFIRMAR_PAGO_EN_SITIO", level: "alerta", at: limite });
    expect(avisos[0]?.title).toContain("taquilla");
    expect(avisos[0]?.body).toContain("sale mañana a las 04:00");
    expect(avisos[0]?.body).toContain("Tienes hasta hoy a las 16:00 para pagar en la taquilla");
    expect(`${avisos[0]?.title} ${avisos[0]?.body}`).not.toContain("Confirma");
  });

  it("pago en sitio con el plazo de 12 horas vencido ya no ofrece pagar", () => {
    const departsAt = new Date(AHORA.getTime() + 10 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGO_EN_SITIO", departsAt, reconfirmedAt: null })],
      },
      AHORA,
    );
    expect(avisos).toEqual([]);
  });

  it("pago en sitio a treinta horas de la salida: el plazo vence en 18 horas y ya es alerta", () => {
    const departsAt = new Date(AHORA.getTime() + 30 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGO_EN_SITIO", departsAt, reconfirmedAt: null })],
      },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      kind: "RECONFIRMAR_PAGO_EN_SITIO",
      level: "alerta",
      at: new Date(AHORA.getTime() + 18 * 3_600_000),
    });
  });

  it("pago en sitio a tres días avisa desde ya, en tono informativo y con la hora exacta", () => {
    // Sale el miércoles 16 a las 08:00 en Caracas; el plazo vence el martes 15 a las 20:00.
    const departsAt = new Date(AHORA.getTime() + 72 * 3_600_000);
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGO_EN_SITIO", departsAt, reconfirmedAt: null })],
      },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      kind: "RECONFIRMAR_PAGO_EN_SITIO",
      level: "info",
      at: new Date(AHORA.getTime() + 60 * 3_600_000),
    });
    expect(avisos[0]?.title).toBe("Recuerda pagar en la taquilla");
    expect(avisos[0]?.body).toBe(
      "Tu viaje Caracas → Maracaibo sale el mié 16 sep a las 08:00. Tienes hasta el mar 15 sep a las 20:00 para pagar en la taquilla; si no, tu puesto quedará libre.",
    );
  });

  it("pagada en parte y lejos de la salida: aviso informativo con lo que falta", () => {
    const avisos = buildNotices(
      { hasIdDocument: true, reservations: [reserva({ status: "ABONADA", balance: "$ 14,35" })] },
      AHORA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      kind: "SALDO_PENDIENTE",
      level: "info",
      href: "/mi/reservas/TR-0913-1PAX-AAAA",
    });
    expect(avisos[0]?.body).toBe(
      "Te faltan $ 14,35 para recibir tu ticket del viaje Caracas → Maracaibo, que sale el mar 15 sep a las 08:00.",
    );
    // Una reserva pagada en parte nunca pierde el puesto: el aviso no lo amenaza.
    expect(`${avisos[0]?.title} ${avisos[0]?.body}`).not.toContain("libre");
  });

  it("pagada en parte a menos de 24 horas de la salida: el aviso de saldo es alerta", () => {
    const departsAt = new Date(AHORA.getTime() + 20 * 3_600_000);
    const avisos = buildNotices(
      { hasIdDocument: true, reservations: [reserva({ status: "ABONADA", departsAt, balance: "$ 14,35" })] },
      AHORA,
    );
    expect(avisos[0]).toMatchObject({ kind: "SALDO_PENDIENTE", level: "alerta", at: departsAt });
    expect(avisos[0]?.body).toContain("que sale mañana a las 04:00");
  });

  it("pagada en parte sin el saldo calculado no inventa una cifra", () => {
    const [aviso] = buildNotices({ hasIdDocument: true, reservations: [reserva({ status: "ABONADA" })] }, AHORA);
    expect(aviso?.kind).toBe("SALDO_PENDIENTE");
    expect(aviso?.body).toContain("Te falta una parte del pago");
    expect(aviso?.body).not.toContain("$");
  });

  it("no hay aviso de saldo si el viaje ya salió ni si la reserva está pagada", () => {
    const yaSalio = reserva({ status: "ABONADA", balance: "$ 5,00", departsAt: new Date(AHORA.getTime() - 60_000) });
    const pagada = reserva({ code: "TR-0913-1PAX-ZZZZ", status: "PAGADA", balance: "$ 5,00" });
    const avisos = buildNotices({ hasIdDocument: true, reservations: [yaSalio, pagada] }, AHORA);
    expect(avisos.filter((a) => a.kind === "SALDO_PENDIENTE")).toEqual([]);
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
    expect(avisos[0]?.body).toContain("sale hoy a las 13:00");
  });

  it("un viaje de otro día dice el día de la semana, el día y el mes, como el detalle", () => {
    // 10:00Z del 1 de octubre son las 06:00 del jueves 1 de octubre en Caracas.
    const departsAt = new Date("2026-10-01T10:00:00.000Z");
    const avisos = buildNotices(
      {
        hasIdDocument: true,
        reservations: [reserva({ status: "PAGADA", departsAt, hasTicket: true })],
      },
      AHORA,
    );
    expect(avisos[0]?.body).toContain("sale el jue 1 oct a las 06:00");
    expect(avisos[0]?.body).not.toMatch(/\d{2}\/\d{2}/);
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
  it("escribe todos los avisos en lenguaje llano, sin jerga interna", () => {
    const avisos = buildNotices(
      {
        hasIdDocument: false,
        reservations: [
          reserva({
            code: "TR-0913-1PAX-EEEE",
            status: "PENDIENTE_PAGO",
            expiresAt: new Date(AHORA.getTime() + 30 * 60_000),
          }),
          reserva({
            code: "TR-0913-1PAX-FFFF",
            status: "EN_VALIDACION",
            latestProof: { status: "RECHAZADO", rejectionReason: null, createdAt: AHORA },
          }),
          reserva({
            code: "TR-0913-1PAX-GGGG",
            status: "PAGO_EN_SITIO",
            departsAt: new Date(AHORA.getTime() + 20 * 3_600_000),
          }),
          reserva({ code: "TR-0913-1PAX-HHHH", status: "PAGADA", hasTicket: true }),
          reserva({ code: "TR-0913-1PAX-JJJJ", status: "ABONADA", balance: "$ 14,35" }),
        ],
      },
      AHORA,
    );
    expect(new Set(avisos.map((a) => a.kind)).size).toBe(7);
    for (const aviso of avisos) {
      const texto = `${aviso.title} ${aviso.body}`.toLowerCase();
      for (const jerga of ["cupo", "en sitio", "validación", "validar", "reconfirma", "serial"]) {
        expect(texto).not.toContain(jerga);
      }
    }
  });
});
