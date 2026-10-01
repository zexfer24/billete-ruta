import type { DepartureStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isOverdueDeparture, unitStateOf } from "@/modules/reports/fleet-status";
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

  describe("asignado solo con una salida hoy o en las próximas 12 horas", () => {
    // `now` es 2026-09-13 08:00 en Caracas: el día termina a las 00:00 del 14
    // (04:00 UTC), y las 12 horas llegan a las 20:00, así que manda el fin del día.
    it("una salida esta noche deja la unidad asignada", () => {
      const noche = salida({ id: "noche", status: "PROGRAMADA", departsAt: new Date("2026-09-14T03:30:00Z") });

      expect(unitStateOf({ active: true, departures: [noche] }, now).state).toBe("ASIGNADO");
    });

    it("con la próxima salida mañana a media mañana la unidad está disponible, y la salida sigue en upcoming", () => {
      const manana = salida({ id: "manana", status: "PROGRAMADA", departsAt: new Date(now.getTime() + DIA) });

      const resultado = unitStateOf({ active: true, departures: [manana] }, now);

      expect(resultado.state).toBe("DISPONIBLE");
      expect(resultado.upcoming.map((u) => u.id)).toEqual(["manana"]);
      expect(resultado.upcomingCount).toBe(1);
    });

    it("a las 23:00 cubre las 12 horas siguientes, aunque sean de mañana", () => {
      const tarde = new Date("2026-09-14T03:00:00Z"); // 23:00 del 13 en Caracas
      const temprano = salida({ id: "temprano", status: "PROGRAMADA", departsAt: new Date("2026-09-14T14:00:00Z") });
      const mediodia = salida({ id: "mediodia", status: "PROGRAMADA", departsAt: new Date("2026-09-14T16:00:00Z") });

      expect(unitStateOf({ active: true, departures: [temprano] }, tarde).state).toBe("ASIGNADO");
      expect(unitStateOf({ active: true, departures: [mediodia] }, tarde).state).toBe("DISPONIBLE");
    });
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

  it("una PROGRAMADA vencida es el viaje en curso: la unidad queda atrasada, no embarcando, y no cuenta como próxima", () => {
    const atrasada = salida({
      id: "atrasada",
      status: "PROGRAMADA",
      departsAt: new Date(now.getTime() - 2 * HORA),
    });
    const noche = salida({ id: "noche", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 7 * HORA) });

    const resultado = unitStateOf({ active: true, departures: [noche, atrasada] }, now);

    expect(resultado.state).toBe("ATRASADO");
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

  it("EN_RUTA y MANIFIESTO_CERRADO ganan a una PROGRAMADA atrasada, que queda sin marca: con el embarque abierto sigue embarcando", () => {
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

  it("una salida atrasada gana a la unidad inactiva, que queda atrasada", () => {
    const atrasada = salida({ id: "atrasada", status: "PROGRAMADA", departsAt: new Date(now.getTime() - HORA) });

    const resultado = unitStateOf({ active: false, departures: [atrasada] }, now);

    expect(resultado.state).toBe("ATRASADO");
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

    it("PROGRAMADA de hace 3 días: la unidad activa con una salida en unas horas queda asignada", () => {
      const vieja = salida({ id: "vieja", status: "PROGRAMADA", departsAt: hace3Dias });
      const proxima = salida({ id: "p1", status: "PROGRAMADA", departsAt: new Date(now.getTime() + 3 * HORA) });

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

      expect(resultado.state).toBe("ATRASADO");
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

  describe("manifiesto cerrado por el worker sin embarque iniciado", () => {
    const haceUnaHora = new Date(now.getTime() - HORA);

    it("una MANIFIESTO_CERRADO vencida sin boardingStartedAt está atrasada, no embarcando", () => {
      const cerradaPorWorker = salida({
        id: "worker",
        status: "MANIFIESTO_CERRADO",
        departsAt: haceUnaHora,
        boardingStartedAt: null,
      });

      const resultado = unitStateOf({ active: true, departures: [cerradaPorWorker] }, now);

      expect(resultado.state).toBe("ATRASADO");
      expect(resultado.current?.id).toBe("worker");
      expect(resultado.current?.overdue).toBe(true);
    });

    it("también deja atrasada a la unidad inactiva", () => {
      const cerradaPorWorker = salida({ id: "worker", status: "MANIFIESTO_CERRADO", departsAt: haceUnaHora });

      expect(unitStateOf({ active: false, departures: [cerradaPorWorker] }, now).state).toBe("ATRASADO");
    });

    it("con el embarque iniciado sigue embarcando aunque vaya tarde", () => {
      const embarcando = salida({
        id: "embarcando",
        status: "MANIFIESTO_CERRADO",
        departsAt: haceUnaHora,
        boardingStartedAt: new Date(now.getTime() - 2 * HORA),
      });

      const resultado = unitStateOf({ active: true, departures: [embarcando] }, now);

      expect(resultado.state).toBe("EMBARCANDO");
      expect(resultado.current?.overdue).toBeUndefined();
    });

    it("un embarque abierto gana a una salida atrasada, cerrada por el worker o todavía programada", () => {
      const embarcando = salida({
        id: "embarcando",
        status: "MANIFIESTO_CERRADO",
        departsAt: haceUnaHora,
        boardingStartedAt: haceUnaHora,
      });
      const cerradaPorWorker = salida({
        id: "worker",
        status: "MANIFIESTO_CERRADO",
        departsAt: new Date(now.getTime() - 3 * HORA),
      });
      const programada = salida({ id: "programada", status: "PROGRAMADA", departsAt: new Date(now.getTime() - 4 * HORA) });

      const resultado = unitStateOf(
        { active: true, departures: [cerradaPorWorker, programada, embarcando] },
        now,
      );

      expect(resultado.state).toBe("EMBARCANDO");
      expect(resultado.current?.id).toBe("embarcando");
    });

    it("entre una cerrada por el worker y una programada vencidas toma la más antigua", () => {
      const cerradaPorWorker = salida({
        id: "worker",
        status: "MANIFIESTO_CERRADO",
        departsAt: new Date(now.getTime() - 3 * HORA),
      });
      const programada = salida({ id: "programada", status: "PROGRAMADA", departsAt: haceUnaHora });

      const resultado = unitStateOf({ active: true, departures: [programada, cerradaPorWorker] }, now);

      expect(resultado.state).toBe("ATRASADO");
      expect(resultado.current?.id).toBe("worker");
    });

    it("más de 12 horas atrás ya no decide el estado", () => {
      const vieja = salida({
        id: "vieja",
        status: "MANIFIESTO_CERRADO",
        departsAt: new Date(now.getTime() - 13 * HORA),
      });

      const resultado = unitStateOf({ active: true, departures: [vieja] }, now);

      expect(resultado.state).toBe("DISPONIBLE");
      expect(resultado.current).toBeNull();
    });
  });
});

describe("isOverdueDeparture", () => {
  const now = new Date("2026-09-13T12:00:00Z");
  const antes = new Date(now.getTime() - HORA);
  const despues = new Date(now.getTime() + HORA);

  it("PROGRAMADA vencida sí, futura no", () => {
    expect(isOverdueDeparture({ status: "PROGRAMADA", departsAt: antes }, now)).toBe(true);
    expect(isOverdueDeparture({ status: "PROGRAMADA", departsAt: despues }, now)).toBe(false);
  });

  it("MANIFIESTO_CERRADO vencida solo si nadie inició el embarque", () => {
    expect(isOverdueDeparture({ status: "MANIFIESTO_CERRADO", departsAt: antes, boardingStartedAt: null }, now)).toBe(true);
    expect(isOverdueDeparture({ status: "MANIFIESTO_CERRADO", departsAt: antes }, now)).toBe(true);
    expect(
      isOverdueDeparture({ status: "MANIFIESTO_CERRADO", departsAt: antes, boardingStartedAt: antes }, now),
    ).toBe(false);
    expect(isOverdueDeparture({ status: "MANIFIESTO_CERRADO", departsAt: despues }, now)).toBe(false);
  });

  it("EN_RUTA, FINALIZADA y CANCELADA nunca están atrasadas", () => {
    for (const status of ["EN_RUTA", "FINALIZADA", "CANCELADA"] as const) {
      expect(isOverdueDeparture({ status, departsAt: antes }, now)).toBe(false);
    }
  });
});
