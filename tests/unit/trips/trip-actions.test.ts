import type { DepartureStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { availableTripActions } from "@/modules/trips";

interface Caso {
  nombre: string;
  status: DepartureStatus;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
  esperado: { startBoarding: boolean; registerDeparture: boolean; registerArrival: boolean };
}

const AHORA = new Date("2026-09-13T12:00:00.000Z");

const casos: Caso[] = [
  {
    nombre: "PROGRAMADA sin tripLog: embarque y salida sí, llegada no",
    status: "PROGRAMADA",
    boardingStartedAt: null,
    departedAt: null,
    arrivedAt: null,
    esperado: { startBoarding: true, registerDeparture: true, registerArrival: false },
  },
  {
    nombre: "MANIFIESTO_CERRADO con embarque iniciado: embarque no, salida sí, llegada no",
    status: "MANIFIESTO_CERRADO",
    boardingStartedAt: AHORA,
    departedAt: null,
    arrivedAt: null,
    esperado: { startBoarding: false, registerDeparture: true, registerArrival: false },
  },
  {
    nombre: "EN_RUTA con departedAt: solo llegada",
    status: "EN_RUTA",
    boardingStartedAt: AHORA,
    departedAt: AHORA,
    arrivedAt: null,
    esperado: { startBoarding: false, registerDeparture: false, registerArrival: true },
  },
  {
    nombre: "FINALIZADA con arrivedAt: ninguna",
    status: "FINALIZADA",
    boardingStartedAt: AHORA,
    departedAt: AHORA,
    arrivedAt: AHORA,
    esperado: { startBoarding: false, registerDeparture: false, registerArrival: false },
  },
  {
    nombre: "CANCELADA: ninguna",
    status: "CANCELADA",
    boardingStartedAt: null,
    departedAt: null,
    arrivedAt: null,
    esperado: { startBoarding: false, registerDeparture: false, registerArrival: false },
  },
  {
    nombre: "PROGRAMADA con departedAt pero sin arrivedAt, datos raros: las reglas se aplican tal cual",
    status: "PROGRAMADA",
    boardingStartedAt: null,
    departedAt: AHORA,
    arrivedAt: null,
    esperado: { startBoarding: true, registerDeparture: false, registerArrival: true },
  },
];

describe("availableTripActions", () => {
  it.each(casos)("$nombre", ({ status, boardingStartedAt, departedAt, arrivedAt, esperado }) => {
    expect(
      availableTripActions({ status, boardingStartedAt, departedAt, arrivedAt }),
    ).toEqual(esperado);
  });
});
