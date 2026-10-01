import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listDrivers } from "@/modules/agencies";
import { agencyFleetStatus } from "@/modules/reports";
import { registerDeparture, startBoarding } from "@/modules/trips";
import {
  createAgencyFixture,
  createDepartureFixture,
  createDriverFixture,
  createPanelUserFixture,
  createRouteFixture,
  createVehicleFixture,
  seedRatesFixture,
} from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

/**
 * Una agencia con una unidad de cada estado posible: en ruta, asignada a una
 * salida de mañana, disponible sin ninguna salida, y fuera de servicio; más
 * otra agencia que nunca debe aparecer en los resultados.
 */
async function escenario() {
  const agencia = await createAgencyFixture();
  const ruta = await createRouteFixture(agencia.id);
  const operador = await createPanelUserFixture({ agencyId: agencia.id });

  const choferEnRuta = await createDriverFixture(agencia.id);
  const vehiculoEnRuta = await createVehicleFixture(agencia.id);
  const salidaEnRuta = await prisma.departure.create({
    data: {
      routeId: ruta.id,
      vehicleId: vehiculoEnRuta.id,
      driverId: choferEnRuta.id,
      departsAt: new Date(Date.now() + 2 * 3_600_000),
      capacity: 20,
    },
  });
  await startBoarding({
    departureId: salidaEnRuta.id,
    panelUserId: operador.id,
    agencyId: agencia.id,
  });
  await registerDeparture({
    departureId: salidaEnRuta.id,
    panelUserId: operador.id,
    agencyId: agencia.id,
  });

  const choferAsignado = await createDriverFixture(agencia.id);
  const vehiculoAsignado = await createVehicleFixture(agencia.id);
  const salidaManana = await prisma.departure.create({
    data: {
      routeId: ruta.id,
      vehicleId: vehiculoAsignado.id,
      driverId: choferAsignado.id,
      departsAt: new Date(Date.now() + 24 * 3_600_000),
      capacity: 20,
    },
  });

  const choferDisponible = await createDriverFixture(agencia.id);
  const vehiculoDisponible = await createVehicleFixture(agencia.id);

  const choferInactivo = await createDriverFixture(agencia.id);
  await prisma.driver.update({ where: { id: choferInactivo.id }, data: { active: false } });
  const vehiculoInactivo = await createVehicleFixture(agencia.id);
  await prisma.vehicle.update({ where: { id: vehiculoInactivo.id }, data: { active: false } });

  const {
    agencia: otraAgencia,
    chofer: choferOtro,
    vehiculo: vehiculoOtro,
  } = await createDepartureFixture({});

  return {
    agencia,
    operador,
    choferEnRuta,
    vehiculoEnRuta,
    salidaEnRuta,
    choferAsignado,
    vehiculoAsignado,
    salidaManana,
    choferDisponible,
    vehiculoDisponible,
    choferInactivo,
    vehiculoInactivo,
    otraAgencia,
    choferOtro,
    vehiculoOtro,
  };
}

describe("agencyFleetStatus", () => {
  it("chofer y vehículo con una salida en ruta quedan en estado EN_RUTA", async () => {
    const { agencia, choferEnRuta, vehiculoEnRuta, salidaEnRuta } = await escenario();

    const estado = await agencyFleetStatus(agencia.id);

    const filaChofer = estado.drivers.find((d) => d.id === choferEnRuta.id);
    const filaVehiculo = estado.vehicles.find((v) => v.id === vehiculoEnRuta.id);
    expect(filaChofer?.state).toBe("EN_RUTA");
    expect(filaChofer?.current?.id).toBe(salidaEnRuta.id);
    expect(filaVehiculo?.state).toBe("EN_RUTA");
    expect(filaVehiculo?.current?.departedAt).not.toBeNull();
  });

  it("un chofer con una salida programada para mañana queda asignado", async () => {
    const { agencia, choferAsignado, salidaManana } = await escenario();

    const estado = await agencyFleetStatus(agencia.id);

    const fila = estado.drivers.find((d) => d.id === choferAsignado.id);
    expect(fila?.state).toBe("ASIGNADO");
    expect(fila?.upcoming.map((u) => u.id)).toEqual([salidaManana.id]);
  });

  it("un chofer inactivo sin ninguna salida queda fuera de servicio", async () => {
    const { agencia, choferInactivo } = await escenario();

    const estado = await agencyFleetStatus(agencia.id);

    const fila = estado.drivers.find((d) => d.id === choferInactivo.id);
    expect(fila?.state).toBe("FUERA_DE_SERVICIO");
  });

  it("vehicleSummary trae las cinco claves aunque alguna valga cero, y suma el total de vehículos", async () => {
    const { agencia } = await escenario();

    const estado = await agencyFleetStatus(agencia.id);

    expect(Object.keys(estado.vehicleSummary).sort()).toEqual(
      ["ASIGNADO", "DISPONIBLE", "EMBARCANDO", "EN_RUTA", "FUERA_DE_SERVICIO"].sort(),
    );
    const suma = Object.values(estado.vehicleSummary).reduce((a, b) => a + b, 0);
    expect(suma).toBe(estado.vehicles.length);
    expect(estado.vehicleSummary.EN_RUTA).toBe(1);
    expect(estado.vehicleSummary.ASIGNADO).toBe(1);
    expect(estado.vehicleSummary.DISPONIBLE).toBe(1);
    expect(estado.vehicleSummary.FUERA_DE_SERVICIO).toBe(1);
    expect(estado.vehicleSummary.EMBARCANDO).toBe(0);
  });

  it("los contadores de embarque y desembarque de cada chofer coinciden con listDrivers", async () => {
    const { agencia } = await escenario();

    const estado = await agencyFleetStatus(agencia.id);
    const choferes = await listDrivers(agencia.id);

    for (const fila of estado.drivers) {
      const referencia = choferes.find((c) => c.id === fila.id);
      expect(fila.boardingCount).toBe(referencia?.boardingCount);
      expect(fila.arrivalCount).toBe(referencia?.arrivalCount);
    }
  });

  it("la consulta y unitStateOf usan el mismo corte de 12 horas para las salidas sin cerrar", async () => {
    const agencia = await createAgencyFixture();
    const ruta = await createRouteFixture(agencia.id);
    const now = new Date();
    const haceHoras = (horas: number) => new Date(now.getTime() - horas * 3_600_000);

    /** Un chofer y un vehículo propios con una sola salida en el estado y la hora dados. */
    async function unidadCon(status: "PROGRAMADA" | "MANIFIESTO_CERRADO" | "EN_RUTA", departsAt: Date) {
      const chofer = await createDriverFixture(agencia.id);
      const vehiculo = await createVehicleFixture(agencia.id);
      const salida = await prisma.departure.create({
        data: {
          routeId: ruta.id,
          vehicleId: vehiculo.id,
          driverId: chofer.id,
          departsAt,
          capacity: 20,
          status,
        },
      });
      return { chofer, vehiculo, salida };
    }

    const cerradaVieja = await unidadCon("MANIFIESTO_CERRADO", haceHoras(13));
    const programadaVieja = await unidadCon("PROGRAMADA", haceHoras(13));
    const enRutaVieja = await unidadCon("EN_RUTA", haceHoras(20));
    const cerradaReciente = await unidadCon("MANIFIESTO_CERRADO", haceHoras(11));

    const estado = await agencyFleetStatus(agencia.id, now);
    const chofer = (id: string) => estado.drivers.find((d) => d.id === id);
    const vehiculo = (id: string) => estado.vehicles.find((v) => v.id === id);

    // Más de 12 horas sin cerrar: ya no comprometen a la unidad.
    for (const unidad of [cerradaVieja, programadaVieja]) {
      expect(chofer(unidad.chofer.id)?.state).toBe("DISPONIBLE");
      expect(chofer(unidad.chofer.id)?.current).toBeNull();
      expect(vehiculo(unidad.vehiculo.id)?.state).toBe("DISPONIBLE");
      expect(vehiculo(unidad.vehiculo.id)?.current).toBeNull();
    }

    // EN_RUTA no tiene límite: un viaje que salió de verdad sigue en curso.
    expect(chofer(enRutaVieja.chofer.id)?.state).toBe("EN_RUTA");
    expect(chofer(enRutaVieja.chofer.id)?.current?.id).toBe(enRutaVieja.salida.id);
    expect(vehiculo(enRutaVieja.vehiculo.id)?.state).toBe("EN_RUTA");

    // Dentro de las 12 horas la consulta sí la trae: el corte no es más
    // estrecho en la base de datos que en la función pura.
    expect(chofer(cerradaReciente.chofer.id)?.state).toBe("EMBARCANDO");
    expect(chofer(cerradaReciente.chofer.id)?.current?.id).toBe(cerradaReciente.salida.id);
    expect(vehiculo(cerradaReciente.vehiculo.id)?.state).toBe("EMBARCANDO");
  });

  it("no incluye choferes ni vehículos de otra agencia", async () => {
    const { agencia, choferOtro, vehiculoOtro } = await escenario();

    const estado = await agencyFleetStatus(agencia.id);

    expect(estado.drivers.map((d) => d.id)).not.toContain(choferOtro.id);
    expect(estado.vehicles.map((v) => v.id)).not.toContain(vehiculoOtro.id);
  });
});
