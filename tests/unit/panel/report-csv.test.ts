import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { CSV_BOM, csvField, movementsCsv, reportFileName, revenueCsv } from "@/app/panel/reportes/csv";
import { describeReportRange } from "@/app/panel/reportes/range";

describe("CSV de reportes", () => {
  it("empieza con BOM y usa punto y coma y coma decimal", () => {
    const csv = revenueCsv([
      {
        routeId: "r1",
        routeName: "Mérida - Cúcuta",
        origin: "Mérida",
        destination: "Cúcuta",
        totalUsd: new Prisma.Decimal("1234.5"),
        payments: 3,
      },
    ]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const [cabecera, fila] = csv.slice(CSV_BOM.length).split("\r\n");
    expect(cabecera).toBe('"Ruta";"Origen";"Destino";"Total cobrado (USD)";"Pagos"');
    expect(fila).toBe('"Mérida - Cúcuta";"Mérida";"Cúcuta";"1234,50";"3"');
  });

  it("escapa comillas y neutraliza fórmulas", () => {
    expect(csvField('Ruta "A"')).toBe('"Ruta ""A"""');
    expect(csvField("=HYPERLINK()")).toBe("\"'=HYPERLINK()\"");
    expect(csvField("@SUM")).toBe("\"'@SUM\"");
  });

  it("los viajes llevan fecha y hora por separado", () => {
    const csv = movementsCsv([
      {
        tripLogId: "t1",
        driverName: "Juan Pérez",
        driverIdNumber: "V12345678",
        vehiclePlate: "AB123CD",
        routeName: "Caracas - Mérida",
        boardingStartedAt: new Date("2026-09-30T13:30:00Z"),
        departedAt: new Date("2026-09-30T14:00:00Z"),
        arrivedAt: new Date("2026-09-30T22:15:00Z"),
        durationMinutes: 495,
        passengerCount: 18,
      },
    ]);
    const fila = csv.slice(CSV_BOM.length).split("\r\n")[1];
    expect(fila).toBe(
      '"Juan Pérez";"V12345678";"AB123CD";"Caracas - Mérida";"30/09/2026";"09:30";"10:00";"30/09/2026";"18:15";"495";"18"',
    );
  });

  it("el nombre del archivo lleva la vista y el rango", () => {
    const range = {
      from: new Date("2026-09-24T04:00:00Z"),
      to: new Date("2026-09-30T18:00:00Z"),
      preset: "7d" as const,
    };
    expect(reportFileName("recaudacion", range)).toBe("recaudacion_2026-09-24_al_2026-09-30.csv");
    expect(reportFileName("movimientos", { ...range, from: new Date("2026-09-30T04:00:00Z") })).toBe(
      "viajes-de-choferes_2026-09-30.csv",
    );
  });
});

describe("describeReportRange", () => {
  const to = new Date("2026-09-30T18:32:00Z");

  it("dice el periodo en palabras", () => {
    expect(describeReportRange({ from: new Date("2026-09-30T04:00:00Z"), to, preset: "hoy" })).toBe(
      "Hoy, de 00:00 a 14:32",
    );
    expect(describeReportRange({ from: new Date("2026-09-24T04:00:00Z"), to, preset: "7d" })).toBe(
      "Últimos 7 días, del 24/09/2026 00:00 al 30/09/2026 14:32",
    );
    expect(describeReportRange({ from: new Date("2026-09-01T04:00:00Z"), to, preset: "30d" })).toBe(
      "Últimos 30 días, del 01/09/2026 00:00 al 30/09/2026 14:32",
    );
    expect(describeReportRange({ from: new Date("2026-09-10T12:00:00Z"), to, preset: "personalizado" })).toBe(
      "Del 10/09/2026 08:00 al 30/09/2026 14:32",
    );
  });
});
