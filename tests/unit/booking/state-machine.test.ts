import type { ReservationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  assertTransition,
  canTransition,
  occupiesSeat,
} from "@/modules/booking";

const TODOS: ReservationStatus[] = [
  "PENDIENTE_PAGO",
  "EN_VALIDACION",
  "ABONADA",
  "PAGADA",
  "PAGO_EN_SITIO",
  "LIBERADA",
  "CANCELADA",
  "ABORDADA",
  "NO_SHOW",
];

describe("occupiesSeat", () => {
  it("ocupan cupo los estados activos de la venta", () => {
    for (const estado of [
      "PENDIENTE_PAGO",
      "EN_VALIDACION",
      "ABONADA",
      "PAGADA",
      "PAGO_EN_SITIO",
      "ABORDADA",
    ] as const) {
      expect(occupiesSeat(estado)).toBe(true);
    }
  });

  it("liberan cupo los estados terminados sin viaje", () => {
    for (const estado of ["LIBERADA", "CANCELADA", "NO_SHOW"] as const) {
      expect(occupiesSeat(estado)).toBe(false);
    }
  });
});

describe("canTransition", () => {
  const validas: Array<[ReservationStatus, ReservationStatus]> = [
    ["PENDIENTE_PAGO", "EN_VALIDACION"],
    ["PENDIENTE_PAGO", "ABONADA"],
    ["PENDIENTE_PAGO", "PAGADA"],
    ["PENDIENTE_PAGO", "LIBERADA"],
    ["PENDIENTE_PAGO", "CANCELADA"],
    ["EN_VALIDACION", "ABONADA"],
    ["EN_VALIDACION", "PAGADA"],
    ["EN_VALIDACION", "PENDIENTE_PAGO"],
    ["EN_VALIDACION", "CANCELADA"],
    ["ABONADA", "EN_VALIDACION"],
    ["ABONADA", "PAGADA"],
    ["ABONADA", "CANCELADA"],
    ["PAGO_EN_SITIO", "PAGADA"],
    ["PAGO_EN_SITIO", "LIBERADA"],
    ["PAGO_EN_SITIO", "CANCELADA"],
    ["PAGO_EN_SITIO", "ABORDADA"],
    ["PAGADA", "ABORDADA"],
    ["PAGADA", "NO_SHOW"],
    ["PAGADA", "CANCELADA"],
  ];

  it.each(validas)("permite %s a %s", (desde, hacia) => {
    expect(canTransition(desde, hacia)).toBe(true);
  });

  const invalidas: Array<[ReservationStatus, ReservationStatus]> = [
    ["PENDIENTE_PAGO", "ABORDADA"],
    ["PENDIENTE_PAGO", "NO_SHOW"],
    ["PAGADA", "PENDIENTE_PAGO"],
    ["PAGADA", "ABONADA"],
    ["PAGADA", "EN_VALIDACION"],
    ["PAGO_EN_SITIO", "NO_SHOW"],
    ["ABONADA", "PENDIENTE_PAGO"],
    ["EN_VALIDACION", "LIBERADA"],
  ];

  it.each(invalidas)("rechaza %s a %s", (desde, hacia) => {
    expect(canTransition(desde, hacia)).toBe(false);
  });

  it("no permite salir de un estado final", () => {
    for (const final of ["LIBERADA", "CANCELADA", "ABORDADA", "NO_SHOW"] as const) {
      for (const destino of TODOS) {
        expect(canTransition(final, destino)).toBe(false);
      }
    }
  });

  it("no permite la transición a sí mismo", () => {
    for (const estado of TODOS) {
      expect(canTransition(estado, estado)).toBe(false);
    }
  });
});

describe("assertTransition", () => {
  it("lanza nombrando ambos estados", () => {
    expect(() => assertTransition("ABORDADA", "PAGADA")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("ABORDADA", "PAGADA")).toThrow(/ABORDADA.*PAGADA/);
  });

  it("no lanza en una transición válida", () => {
    expect(() => assertTransition("PAGO_EN_SITIO", "PAGADA")).not.toThrow();
  });
});
