import type { DepartureStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { unitStateOf } from "@/modules/reports/fleet-status";
import type { UnitDeparture } from "@/modules/reports/fleet-status";

const HORA = 3_600_000;
const DIA = 24 * HORA;

/** Salida de prueba con valores por defecto razonables. */
function salida(
  overrides: Partial<UnitDeparture> & { id: string; status: DepartureStatus; departsAt: Date },
): UnitDeparture {
  return {
    routeName: "Ruta de prueba",
    origin: "Origen",
    destination: "Destino",
    vehiclePlate: "AA1234",
    driverName: "Chofer de prueba",
    departedAt: null,
    estimatedArrivalAt: null,
    ...overrides,
  };
}

describe("unitStateOf", () => {
  const now = new Date("2026-09-13T12:00:00Z");

  it("en ruta aunque la unidad esté inactiva: un viaje en curso gana", () => {
    const enRuta = salida({ id: "s1", status: "EN_RUTA", departsAt: new Date(now.getTime() - HORA) });

    const resultado = unitStateOf({ active: false, departures: [enRuta] }, now);

    expect(resultado.state).toBe("EN_RUTA");
    expect(resultado.current).toEqual(enRuta);
  });

  it("embarcando cuando la salida más antigua en curso está con el manifiesto cerrado", () => {
    const embarcando = salida({
      id: "s2",
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date(now.getTime() + HORA),
    });

    const resultado = unitStateOf({ active: true, departures: [embarcando] }, now);

    expect(resultado.state).toBe("EMBARCANDO");
    expect(resultado.current).toEqual(embarcando);
  });

  it("EN_RUTA gana a MANIFIESTO_CERRADO cuando hay ambos", () => {
    const enRuta = salida({ id: "s3", status: "EN_RUTA", departsAt: new Date(now.getTime() - HORA) });
    const embarcando = salida({
      id: "s4",
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date(now.getTime() - 2 * HORA),
    });

    const resultado = unitStateOf({ active: true, departures: [embarcando, enRuta] }, now);

    expect(resultado.state).toBe("EN_RUTA");
    expect(resultado.current).toEqual(enRuta);
  });

  it("asignado con próximas salidas: tope de 3, orden ascendente y ventana de 7 días", () => {
    const enOchoDias = salida({
      id: "ocho-dias",
      status: "PROGRAMADA",
      departsAt: new Date(now.getTime() + 8 * DIA),
    });
    const p1 = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 3 * DIA) });
    const p2 = salida({ id: "p2", status: "PROGRAMADA", departsAt: new Date(now.getTime() + HORA) });
    const p3 = salida({ id: "p3", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 2 * DIA) });
    const p4 = salida({ id: "p4", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 6 * DIA) });

    const resultado = unitStateOf(
      { active: true, departures: [enOchoDias, p1, p2, p3, p4] },
      now,
    );

    expect(resultado.state).toBe("ASIGNADO");
    expect(resultado.current).toBeNull();
    expect(resultado.upcoming.map((u) => u.id)).toEqual(["p2", "p3", "p1"]);
    expect(resultado.upcomingCount).toBe(4);
  });

  it("upcomingCount es el total real de los 7 días, aunque upcoming traiga solo 3", () => {
    const dentro = [1, 2, 3, 4, 5].map((n) =>
      salida({ id: `d${n}`, status: "PROGRAMADA", departsAt: new Date(now.getTime() + n * DIA) }),
    );
    const fuera = salida({ id: "fuera", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 8 * DIA) });

    const resultado = unitStateOf({ active: true, departures: [...dentro, fuera] }, now);

    expect(resultado.upcoming).toHaveLength(3);
    expect(resultado.upcomingCount).toBe(5);
  });

  it("disponible: activa, sin viaje en curso y sin próximas salidas", () => {
    const resultado = unitStateOf({ active: true, departures: [] }, now);

    expect(resultado.state).toBe("DISPONIBLE");
    expect(resultado.current).toBeNull();
    expect(resultado.upcoming).toEqual([]);
    expect(resultado.upcomingCount).toBe(0);
  });

  it("fuera de servicio: inactiva y sin viaje en curso, aunque tenga próximas salidas", () => {
    const proxima = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + DIA) });

    const resultado = unitStateOf({ active: false, departures: [proxima] }, now);

    expect(resultado.state).toBe("FUERA_DE_SERVICIO");
    expect(resultado.current).toBeNull();
  });

  it("upcoming se calcula también cuando la unidad está en ruta", () => {
    const enRuta = salida({ id: "s5", status: "EN_RUTA", departsAt: new Date(now.getTime() - HORA) });
    const proxima = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + DIA) });

    const resultado = unitStateOf({ active: true, departures: [enRuta, proxima] }, now);

    expect(resultado.state).toBe("EN_RUTA");
    expect(resultado.upcoming.map((u) => u.id)).toEqual(["p1"]);
  });

  it("una PROGRAMADA vencida es el viaje en curso, marcada como atrasada, y no cuenta como próxima", () => {
    const atrasada = salida({
      id: "atrasada",
      status: "PROGRAMADA",
      departsAt: new Date(now.getTime() - 2 * HORA),
    });
    const noche = salida({ id: "noche", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 7 * HORA) });

    const resultado = unitStateOf({ active: true, departures: [noche, atrasada] }, now);

    expect(resultado.state).toBe("EMBARCANDO");
    expect(resultado.current?.id).toBe("atrasada");
    expect(resultado.current?.overdue).toBe(true);
    expect(resultado.upcoming.map((u) => u.id)).toEqual(["noche"]);
    expect(resultado.upcomingCount).toBe(1);
    // No muta la salida recibida.
    expect(atrasada.overdue).toBeUndefined();
  });

  it("entre varias PROGRAMADA vencidas toma la más antigua", () => {
    const hace1 = salida({ id: "hace1", status: "PROGRAMADA", departsAt: new Date(now.getTime() - HORA) });
    const hace3 = salida({ id: "hace3", status: "PROGRAMADA", departsAt: new Date(now.getTime() - 3 * HORA) });

    const resultado = unitStateOf({ active: true, departures: [hace1, hace3] }, now);

    expect(resultado.current?.id).toBe("hace3");
  });

  it("EN_RUTA y MANIFIESTO_CERRADO ganan a una PROGRAMADA atrasada, que queda sin marca", () => {
    const atrasada = salida({ id: "atrasada", status: "PROGRAMADA", departsAt: new Date(now.getTime() - HORA) });
    const cerrada = salida({
      id: "cerrada",
      status: "MANIFIESTO_CERRADO",
      departsAt: new Date(now.getTime() + HORA),
    });

    const resultado = unitStateOf({ active: true, departures: [atrasada, cerrada] }, now);

    expect(resultado.state).toBe("EMBARCANDO");
    expect(resultado.current?.id).toBe("cerrada");
    expect(resultado.current?.overdue).toBeUndefined();
  });

  it("una salida atrasada gana a la unidad inactiva, igual que un manifiesto cerrado", () => {
    const atrasada = salida({ id: "atrasada", status: "PROGRAMADA", departsAt: new Date(now.getTime() - HORA) });

    const resultado = unitStateOf({ active: false, departures: [atrasada] }, now);

    expect(resultado.state).toBe("EMBARCANDO");
    expect(resultado.current?.overdue).toBe(true);
  });

  describe("una salida vieja que nadie cerró no decide el estado", () => {
    const hace3Dias = new Date(now.getTime() - 3 * DIA);

    it("PROGRAMADA de hace 3 días: la unidad inactiva queda fuera de servicio", () => {
      const vieja = salida({ id: "vieja", status: "PROGRAMADA", departsAt: hace3Dias });

      const resultado = unitStateOf({ active: false, departures: [vieja] }, now);

      expect(resultado.state).toBe("FUERA_DE_SERVICIO");
      expect(resultado.current).toBeNull();
    });

    it("PROGRAMADA de hace 3 días: la unidad activa con próximas queda asignada", () => {
      const vieja = salida({ id: "vieja", status: "PROGRAMADA", departsAt: hace3Dias });
      const proxima = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + DIA) });

      const resultado = unitStateOf({ active: true, departures: [vieja, proxima] }, now);

      expect(resultado.state).toBe("ASIGNADO");
      expect(resultado.current).toBeNull();
      expect(resultado.upcoming.map((u) => u.id)).toEqual(["p1"]);
    });

    it("PROGRAMADA de hace 3 días: la unidad activa sin próximas queda disponible", () => {
      const vieja = salida({ id: "vieja", status: "PROGRAMADA", departsAt: hace3Dias });

      const resultado = unitStateOf({ active: true, departures: [vieja] }, now);

      expect(resultado.state).toBe("DISPONIBLE");
      expect(resultado.current).toBeNull();
    });

    it("MANIFIESTO_CERRADO de hace 3 días tampoco", () => {
      const vieja = salida({ id: "vieja", status: "MANIFIESTO_CERRADO", departsAt: hace3Dias });

      const inactiva = unitStateOf({ active: false, departures: [vieja] }, now);
      const activa = unitStateOf({ active: true, departures: [vieja] }, now);

      expect(inactiva.state).toBe("FUERA_DE_SERVICIO");
      expect(activa.state).toBe("DISPONIBLE");
      expect(activa.current).toBeNull();
    });

    it("una vieja no tapa a una atrasada reciente, que sigue siendo el viaje en curso", () => {
      const vieja = salida({ id: "vieja", status: "PROGRAMADA", departsAt: hace3Dias });
      const reciente = salida({ id: "reciente", status: "PROGRAMADA", departsAt: new Date(now.getTime() - HORA) });

      const resultado = unitStateOf({ active: true, departures: [vieja, reciente] }, now);

      expect(resultado.state).toBe("EMBARCANDO");
      expect(resultado.current?.id).toBe("reciente");
      expect(resultado.current?.overdue).toBe(true);
    });

    it("EN_RUTA no tiene límite hacia atrás: el viaje salió de verdad", () => {
      const enRuta = salida({ id: "s1", status: "EN_RUTA", departsAt: hace3Dias });

      const resultado = unitStateOf({ active: false, departures: [enRuta] }, now);

      expect(resultado.state).toBe("EN_RUTA");
      expect(resultado.current?.id).toBe("s1");
    });
  });
});
