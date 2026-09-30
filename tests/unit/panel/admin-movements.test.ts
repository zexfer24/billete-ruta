import { describe, expect, it } from "vitest";
import type { AgencyMovementRow } from "@/modules/reports";
import { resolveAdminRange } from "@/app/panel/admin/_shared/period";
import {
  csvCell,
  movementsCsv,
  movementsCsvHref,
  movementsHref,
  parseMovementsParams,
  tripStatus,
} from "@/app/panel/admin/movimientos/movements";

const NOW = new Date("2026-09-30T14:30:00Z");
const AGENCY = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("parseMovementsParams", () => {
  it("ignora una agencia o un viaje que no son UUID, sin lanzar", () => {
    expect(parseMovementsParams({ agency: "xyz", viaje: "123", from: "abc" })).toEqual({
      agency: undefined,
      viaje: undefined,
      from: undefined,
      to: undefined,
      periodo: undefined,
    });
  });

  it("conserva los valores válidos", () => {
    expect(parseMovementsParams({ agency: AGENCY, periodo: "7d" })).toMatchObject({ agency: AGENCY, periodo: "7d" });
  });
});

describe("enlaces", () => {
  it("arman la lista, el viaje abierto y la descarga con los mismos filtros", () => {
    const range = resolveAdminRange({ periodo: "7d" }, NOW);
    expect(movementsHref(range, AGENCY)).toBe(`/panel/admin/movimientos?periodo=7d&agency=${AGENCY}`);
    expect(movementsHref(range, undefined, "v1")).toBe("/panel/admin/movimientos?periodo=7d&viaje=v1");
    expect(movementsCsvHref(resolveAdminRange({}, NOW), undefined)).toBe("/panel/admin/movimientos/descargar");
  });
});

describe("tripStatus", () => {
  const at = new Date();
  it("usa las claves de DEPARTURE_STATUS_LABELS", () => {
    expect(tripStatus({ departedAt: null, arrivedAt: null })).toBe("MANIFIESTO_CERRADO");
    expect(tripStatus({ departedAt: at, arrivedAt: null })).toBe("EN_RUTA");
    expect(tripStatus({ departedAt: at, arrivedAt: at })).toBe("FINALIZADA");
  });
});

describe("CSV", () => {
  it("escapa separadores y comillas, y neutraliza fórmulas", () => {
    expect(csvCell("Caracas")).toBe("Caracas");
    expect(csvCell("Ruta; norte")).toBe('"Ruta; norte"');
    expect(csvCell('Dice "hola"')).toBe('"Dice ""hola"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5")).toBe("'-5");
  });

  it("empieza con la marca UTF-8 y usa punto y coma", () => {
    const row: AgencyMovementRow = {
      tripLogId: "t1",
      agencyName: "Expresos Ávila",
      routeName: "Caracas - Valencia",
      origin: "Caracas",
      destination: "Valencia",
      driverName: "José Pérez",
      vehiclePlate: "AB123CD",
      boardingStartedAt: new Date("2026-09-30T12:00:00Z"),
      departedAt: new Date("2026-09-30T12:30:00Z"),
      arrivedAt: null,
      durationMinutes: null,
      passengerCount: 12,
    };
    const csv = movementsCsv([row]);
    expect(csv.startsWith("\uFEFFAgencia;Ruta;Origen;")).toBe(true);
    expect(csv).toContain("Expresos Ávila;Caracas - Valencia;Caracas;Valencia;José Pérez;AB123CD;");
    expect(csv).toContain("30/09/2026 08:00;30/09/2026 08:30;;;12\r\n");
  });
});
