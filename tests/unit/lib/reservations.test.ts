import { describe, expect, it } from "vitest";
import { splitByDeparture } from "@/lib/reservations";

interface ReservaDePrueba {
  code: string;
  departure: { departsAt: Date };
}

function reserva(code: string, departsAt: string): ReservaDePrueba {
  return { code, departure: { departsAt: new Date(departsAt) } };
}

describe("splitByDeparture", () => {
  const now = new Date("2026-09-13T12:00:00Z");

  it("separa próximas (>= ahora) de pasadas (< ahora)", () => {
    const reservas = [
      reserva("FUTURA", "2026-09-13T18:00:00Z"),
      reserva("PASADA", "2026-09-12T18:00:00Z"),
    ];

    const { proximas, pasadas } = splitByDeparture(reservas, now);

    expect(proximas.map((r) => r.code)).toEqual(["FUTURA"]);
    expect(pasadas.map((r) => r.code)).toEqual(["PASADA"]);
  });

  it("una salida exactamente en `now` cuenta como próxima", () => {
    const reservas = [reserva("JUSTO_AHORA", "2026-09-13T12:00:00Z")];

    const { proximas, pasadas } = splitByDeparture(reservas, now);

    expect(proximas.map((r) => r.code)).toEqual(["JUSTO_AHORA"]);
    expect(pasadas).toEqual([]);
  });

  it("conserva el orden original dentro de cada grupo", () => {
    const reservas = [
      reserva("A", "2026-09-14T00:00:00Z"),
      reserva("B", "2026-09-11T00:00:00Z"),
      reserva("C", "2026-09-15T00:00:00Z"),
      reserva("D", "2026-09-10T00:00:00Z"),
    ];

    const { proximas, pasadas } = splitByDeparture(reservas, now);

    expect(proximas.map((r) => r.code)).toEqual(["A", "C"]);
    expect(pasadas.map((r) => r.code)).toEqual(["B", "D"]);
  });

  it("listas vacías devuelven ambos grupos vacíos", () => {
    expect(splitByDeparture([], now)).toEqual({ proximas: [], pasadas: [] });
  });
});
