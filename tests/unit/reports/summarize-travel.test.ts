import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { summarizeTravel } from "@/modules/reports/passenger-profile";
import type { SummaryTripInput } from "@/modules/reports/passenger-profile";

/** Construye una fila de viaje con valores por defecto: titular, pagada y con ticket. */
function fila(overrides: Partial<SummaryTripInput> = {}): SummaryTripInput {
  return {
    role: "TITULAR",
    status: "PAGADA",
    ticketIssued: true,
    traveled: false,
    paidUsd: new Prisma.Decimal("47.50"),
    origin: "Caracas",
    destination: "Mérida",
    agencyId: "ag-1",
    agencyName: "Agencia Uno",
    ...overrides,
  };
}

describe("summarizeTravel", () => {
  it("lista vacía da todo en cero", () => {
    const resumen = summarizeTravel([]);
    expect(resumen.paidTickets).toBe(0);
    expect(resumen.completedTrips).toBe(0);
    expect(resumen.totalReservations).toBe(0);
    expect(resumen.releasedOrCancelled).toBe(0);
    expect(resumen.noShows).toBe(0);
    expect(resumen.totalPaidUsd.toString()).toBe("0");
    expect(resumen.distinctDestinations).toBe(0);
    expect(resumen.distinctOrigins).toBe(0);
    expect(resumen.distinctAgencies).toBe(0);
    expect(resumen.topDestinations).toEqual([]);
    expect(resumen.topAgencies).toEqual([]);
  });

  it("cuenta con una mezcla de estados", () => {
    const resumen = summarizeTravel([
      fila({ status: "ABORDADA", traveled: true }),
      fila({ status: "PAGADA" }),
      fila({ status: "LIBERADA", ticketIssued: false, paidUsd: new Prisma.Decimal(0) }),
      fila({ status: "CANCELADA", ticketIssued: false, paidUsd: new Prisma.Decimal(0) }),
      fila({ status: "NO_SHOW" }),
      fila({ status: "PENDIENTE_PAGO", ticketIssued: false, paidUsd: new Prisma.Decimal(10) }),
    ]);
    expect(resumen.totalReservations).toBe(6);
    expect(resumen.paidTickets).toBe(3);
    expect(resumen.completedTrips).toBe(1);
    expect(resumen.releasedOrCancelled).toBe(2);
    expect(resumen.noShows).toBe(1);
  });

  it("un acompañante que no abordó no cuenta como viaje", () => {
    const resumen = summarizeTravel([
      fila({ role: "ACOMPANANTE", ticketIssued: true, traveled: false, paidUsd: new Prisma.Decimal(0), destination: "Cúcuta" }),
    ]);
    expect(resumen.completedTrips).toBe(0);
    expect(resumen.paidTickets).toBe(0);
    expect(resumen.totalReservations).toBe(0);
    expect(resumen.distinctDestinations).toBe(0);
    expect(resumen.topDestinations).toEqual([]);
  });

  it("un acompañante que abordó cuenta como viaje pero no como reserva ni pago", () => {
    const resumen = summarizeTravel([
      fila({ role: "ACOMPANANTE", traveled: true, paidUsd: new Prisma.Decimal(0), destination: "Cúcuta" }),
    ]);
    expect(resumen.completedTrips).toBe(1);
    expect(resumen.totalReservations).toBe(0);
    expect(resumen.totalPaidUsd.toString()).toBe("0");
    expect(resumen.distinctDestinations).toBe(1);
    expect(resumen.topDestinations).toEqual([{ name: "Cúcuta", count: 1 }]);
  });

  it("cuenta destinos, orígenes y agencias distintos sobre las filas que son viaje", () => {
    const resumen = summarizeTravel([
      fila({ destination: "Mérida", origin: "Caracas", agencyId: "a", agencyName: "A" }),
      fila({ destination: "Mérida", origin: "Valencia", agencyId: "b", agencyName: "B" }),
      fila({ destination: "Cúcuta", origin: "Caracas", agencyId: "a", agencyName: "A" }),
      // No es viaje: sin ticket y sin abordar.
      fila({
        status: "LIBERADA",
        ticketIssued: false,
        destination: "Maracaibo",
        origin: "Barquisimeto",
        agencyId: "c",
        agencyName: "C",
      }),
    ]);
    expect(resumen.distinctDestinations).toBe(2);
    expect(resumen.distinctOrigins).toBe(2);
    expect(resumen.distinctAgencies).toBe(2);
  });

  it("ordena los frecuentes por conteo y desempata por nombre", () => {
    const resumen = summarizeTravel([
      fila({ destination: "Zulia", agencyId: "z", agencyName: "Zeta" }),
      fila({ destination: "Zulia", agencyId: "z", agencyName: "Zeta" }),
      fila({ destination: "Mérida", agencyId: "m", agencyName: "Mar" }),
      fila({ destination: "Ábaco", agencyId: "a", agencyName: "Alfa" }),
    ]);
    expect(resumen.topDestinations).toEqual([
      { name: "Zulia", count: 2 },
      { name: "Ábaco", count: 1 },
      { name: "Mérida", count: 1 },
    ]);
    expect(resumen.topAgencies).toEqual([
      { id: "z", name: "Zeta", count: 2 },
      { id: "a", name: "Alfa", count: 1 },
      { id: "m", name: "Mar", count: 1 },
    ]);
  });

  it("limita los frecuentes a cinco", () => {
    const nombres = ["A", "B", "C", "D", "E", "F", "G"];
    const resumen = summarizeTravel(
      nombres.map((n) => fila({ destination: n, agencyId: n, agencyName: n })),
    );
    expect(resumen.distinctDestinations).toBe(7);
    expect(resumen.topDestinations).toHaveLength(5);
    expect(resumen.topAgencies).toHaveLength(5);
    expect(resumen.topDestinations.map((d) => d.name)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("suma el total pagado en Decimal sin error de punto flotante", () => {
    const resumen = summarizeTravel([
      fila({ paidUsd: new Prisma.Decimal("0.10") }),
      fila({ paidUsd: new Prisma.Decimal("0.20") }),
      fila({ paidUsd: new Prisma.Decimal("47.55") }),
      // El acompañante nunca suma.
      fila({ role: "ACOMPANANTE", traveled: true, paidUsd: new Prisma.Decimal("99.99") }),
    ]);
    expect(resumen.totalPaidUsd.toFixed(2)).toBe("47.85");
  });
});
