import { describe, expect, it } from "vitest";
import { MAX_SEARCH_LENGTH, parsePasajerosFilters, uuidParam } from "@/app/panel/pasajeros/filters";
import { buildPassengersCsv, CSV_BOM } from "@/app/panel/pasajeros/csv";
import type { AgencyPassengerRow } from "@/modules/reports";

const UUID = "3f1c2b8e-9d4a-4c7e-8b21-5a6f0e9d1c34";

describe("parsePasajerosFilters", () => {
  it("acepta una salida UUID y descarta cualquier otra cosa (antes daba error 500)", () => {
    expect(parsePasajerosFilters({ salida: UUID }).salida).toBe(UUID);
    expect(parsePasajerosFilters({ salida: "abc" }).salida).toBeUndefined();
    expect(parsePasajerosFilters({ salida: "1 OR 1=1" }).salida).toBeUndefined();
    expect(parsePasajerosFilters({ salida: [UUID, UUID] }).salida).toBeUndefined();
  });

  it("valida la vista contra las cinco conocidas", () => {
    expect(parsePasajerosFilters({ vista: "pagadas" }).vista).toBe("pagadas");
    expect(parsePasajerosFilters({ vista: "constructor" }).vista).toBeUndefined();
    expect(parsePasajerosFilters({ vista: null }).vista).toBeUndefined();
  });

  it("recorta la búsqueda y trata la vacía como ausente", () => {
    expect(parsePasajerosFilters({ buscar: "  Ana  " }).buscar).toBe("Ana");
    expect(parsePasajerosFilters({ buscar: "   " }).buscar).toBeUndefined();
    expect(parsePasajerosFilters({ buscar: "x".repeat(200) }).buscar).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it("lleva la página a un entero válido", () => {
    expect(parsePasajerosFilters({ pagina: "3" }).pagina).toBe(3);
    expect(parsePasajerosFilters({}).pagina).toBe(1);
    expect(parsePasajerosFilters({ pagina: "0" }).pagina).toBe(1);
    expect(parsePasajerosFilters({ pagina: "abc" }).pagina).toBe(1);
    expect(parsePasajerosFilters({ pagina: "2.5" }).pagina).toBe(1);
    expect(parsePasajerosFilters({ pagina: "9".repeat(30) }).pagina).toBe(1);
  });
});

describe("uuidParam", () => {
  it("solo devuelve UUID válidos", () => {
    expect(uuidParam(UUID)).toBe(UUID);
    expect(uuidParam("no-es-uuid")).toBeUndefined();
    expect(uuidParam(undefined)).toBeUndefined();
  });
});

describe("buildPassengersCsv", () => {
  const fila: AgencyPassengerRow = {
    reservationId: UUID,
    code: "TR-0930-1PAX-AB12",
    holderName: 'Ana "La Negra" Pérez',
    holderIdNumber: "V12345678",
    routeName: "Mérida - Caracas",
    departsAt: new Date("2026-09-30T14:00:00Z"),
    passengerCount: 2,
    status: "ABONADA",
    totalUsd: "40.00",
    paidUsd: "20.00",
    balanceUsd: "20.00",
    paymentState: "Abonado",
    hasPendingProof: false,
    ticketIssuedAt: null,
    salesChannel: "TAQUILLA",
    departureStatus: "PROGRAMADA",
  };

  it("pone la cabecera en lenguaje llano y una fila por reserva", () => {
    const [cabecera, linea] = buildPassengersCsv([fila]).split("\r\n");
    expect(cabecera?.startsWith('"Código del ticket","Titular","Cédula"')).toBe(true);
    expect(linea).toContain('"TR-0930-1PAX-AB12"');
    expect(linea).toContain('"V*****678"');
    expect(linea).toContain('"30/09/2026 10:00"');
    expect(linea).toContain('"Taquilla"');
  });

  it("duplica las comillas de los valores", () => {
    expect(buildPassengersCsv([fila])).toContain('"Ana ""La Negra"" Pérez"');
  });

  it("sin filas deja solo la cabecera, y la marca BOM es la de UTF-8", () => {
    expect(buildPassengersCsv([]).split("\r\n")).toHaveLength(1);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });
});
