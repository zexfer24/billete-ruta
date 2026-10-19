import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  accountStatusBadges,
  birthYearText,
  documentStatus,
  initialsOf,
  routeText,
  paidOfTotalText,
  paymentKindLabel,
  paymentStatusView,
  previousDocumentsLabel,
  registrationOriginText,
  timeWithDay,
  topCountText,
} from "@/app/panel/admin/usuarios/[accountId]/profile-format";

const dec = (value: string) => new Prisma.Decimal(value);

describe("initialsOf", () => {
  it("toma la inicial del primer nombre y del primer apellido", () => {
    expect(initialsOf("María José", "Pérez Gómez")).toBe("MP");
  });

  it("pasa a mayúsculas y respeta las tildes", () => {
    expect(initialsOf("ángel", "ñáñez")).toBe("ÁÑ");
  });

  it("usa solo lo que haya y cae en un signo de interrogación si no hay nada", () => {
    expect(initialsOf("Ana", "")).toBe("A");
    expect(initialsOf("", "Rojas")).toBe("R");
    expect(initialsOf("  ", "  ")).toBe("?");
  });
});

describe("birthYearText", () => {
  it("junta el año con la edad", () => {
    expect(birthYearText(1990, 35)).toBe("1990 (35 años)");
  });

  it("usa el singular con 1 año", () => {
    expect(birthYearText(2025, 1)).toBe("2025 (1 año)");
  });

  it("dice menos de un año con 0", () => {
    expect(birthYearText(2026, 0)).toBe("2026 (menos de 1 año)");
  });
});

describe("registrationOriginText", () => {
  it("distingue el registro por su cuenta del de taquilla", () => {
    expect(registrationOriginText("APP", null)).toBe("Por su cuenta en la app");
    expect(registrationOriginText("TAQUILLA", "Luis Mora")).toBe("En taquilla por Luis Mora");
  });

  it("no inventa un nombre si no se conoce quién lo registró", () => {
    expect(registrationOriginText("TAQUILLA", null)).toBe("En taquilla");
  });
});

describe("accountStatusBadges", () => {
  const base = { active: true, activated: true };

  it("una cuenta activa y con contraseña va como activada", () => {
    expect(accountStatusBadges(base)).toEqual([{ label: "Cuenta activada", tone: "exito" }]);
  });

  it("una cuenta de taquilla sin contraseña va como sin activar", () => {
    expect(accountStatusBadges({ active: true, activated: false })).toEqual([
      { label: "Sin activar · creada en taquilla", tone: "alerta" },
    ]);
  });

  it("una cuenta inactiva lo dice en peligro", () => {
    expect(accountStatusBadges({ active: false, activated: true })).toEqual([
      { label: "Cuenta inactiva", tone: "peligro" },
    ]);
  });

  it("una cuenta inactiva y sin activar muestra las dos señales", () => {
    expect(accountStatusBadges({ active: false, activated: false }).map((b) => b.label)).toEqual([
      "Cuenta inactiva",
      "Sin activar · creada en taquilla",
    ]);
  });
});

describe("previousDocumentsLabel", () => {
  it("usa el singular y el plural", () => {
    expect(previousDocumentsLabel(1)).toBe("Ver 1 anterior");
    expect(previousDocumentsLabel(2)).toBe("Ver 2 anteriores");
    expect(previousDocumentsLabel(12)).toBe("Ver 12 anteriores");
  });
});

describe("documentStatus", () => {
  it("un documento con fecha de verificación está verificado", () => {
    expect(documentStatus(new Date("2026-10-01T12:00:00Z"))).toEqual({ label: "Verificada", tone: "exito" });
  });

  it("sin fecha queda sin verificar, en neutro", () => {
    expect(documentStatus(null)).toEqual({ label: "Sin verificar", tone: "neutro" });
  });
});

describe("paymentStatusView", () => {
  it("traduce cada estado con su tono y su icono", () => {
    expect(paymentStatusView("APROBADO")).toEqual({ label: "Aprobado", tone: "exito", icon: "check" });
    expect(paymentStatusView("RECHAZADO")).toEqual({ label: "Rechazado", tone: "peligro", icon: "x" });
    expect(paymentStatusView("PENDIENTE")).toEqual({ label: "Pendiente", tone: "alerta", icon: "clock" });
    expect(paymentStatusView("COBRADO")).toEqual({ label: "Cobrado", tone: "exito", icon: "check" });
  });
});

describe("paymentKindLabel", () => {
  it("nombra el tipo de pago", () => {
    expect(paymentKindLabel("COMPROBANTE")).toBe("Comprobante");
    expect(paymentKindLabel("EFECTIVO")).toBe("Efectivo");
  });
});

describe("paidOfTotalText", () => {
  it("escribe lo pagado de lo que cuesta, en dólares", () => {
    expect(paidOfTotalText(dec("30"), dec("47.5"))).toBe("$ 30,00 de $ 47,50");
  });

  it("con nada pagado muestra cero", () => {
    expect(paidOfTotalText(dec("0"), dec("1234.5"))).toBe("$ 0,00 de $ 1.234,50");
  });
});

describe("routeText", () => {
  it("escribe la ruta con flecha", () => {
    expect(routeText("Caracas", "Mérida")).toBe("Caracas → Mérida");
  });
});

describe("topCountText", () => {
  it("usa el singular solo con 1 viaje", () => {
    expect(topCountText(1)).toBe("1 viaje");
    expect(topCountText(4)).toBe("4 viajes");
  });
});

describe("timeWithDay", () => {
  // 2026-10-20 14:25 en Caracas (UTC-4) = 18:25 UTC
  const reference = new Date("2026-10-20T18:25:00Z");

  it("sin fecha da una raya", () => {
    expect(timeWithDay(null, reference)).toBe("—");
  });

  it("el mismo día de la referencia muestra solo la hora de 24 horas", () => {
    expect(timeWithDay(new Date("2026-10-21T01:10:00Z"), reference)).toBe("21:10");
  });

  it("otro día agrega la fecha", () => {
    expect(timeWithDay(new Date("2026-10-21T14:18:00Z"), reference)).toBe("10:18 · 21/10/2026");
  });
});
