import Link from "next/link";
import type { DriverMovementRow } from "@/modules/reports";
import { formatCaracas, formatCaracasDate, formatCaracasTime24, formatDuration } from "@/lib/time";
import { IconBus, IconClock, IconUsers } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  StatCard,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { ReportRangeLine } from "./report-range-line";
import type { ReportRange } from "./range";

/** Hora de un evento del viaje; con la fecha corta si cae en otro día que la salida. */
function horaRelativa(date: Date | null, referencia: Date | null): string {
  if (!date) return "—";
  if (referencia && formatCaracasDate(date) !== formatCaracasDate(referencia)) {
    return formatCaracas(date, "dd/MM HH:mm");
  }
  return formatCaracasTime24(date);
}

/** Promedio de minutos de los viajes con duración conocida, o `null` si no hay ninguno. */
function promedioMinutos(movimientos: readonly DriverMovementRow[]): number | null {
  const conDuracion = movimientos.filter((m) => m.durationMinutes !== null);
  if (conDuracion.length === 0) return null;
  const suma = conDuracion.reduce((acc, m) => acc + (m.durationMinutes ?? 0), 0);
  return Math.round(suma / conDuracion.length);
}

/**
 * Viajes de los choferes en el periodo: tres cifras (viajes, pasajeros y
 * duración promedio) y una fila por viaje con la fecha una sola vez y las
 * horas de salida y llegada.
 */
export function MovementsView({
  range,
  movimientos,
  downloadHref,
}: {
  range: ReportRange;
  movimientos: DriverMovementRow[];
  downloadHref: string;
}) {
  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ReportRangeLine range={range} />
        <EmptyState
          icon={<IconBus />}
          title="No hubo viajes en este periodo"
          description="Aquí aparece cada viaje que inició el embarque, con sus horas de salida y llegada. Prueba con un periodo más largo."
          action={
            range.preset !== "30d" ? (
              <Link href="/panel/reportes?vista=movimientos&periodo=30d" className={panelButtonClass("secundario")}>
                Ver los últimos 30 días
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  const pasajeros = movimientos.reduce((acc, m) => acc + m.passengerCount, 0);
  const promedio = promedioMinutos(movimientos);

  return (
    <div className="flex flex-col gap-6">
      <ReportRangeLine range={range} downloadHref={downloadHref} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Viajes" value={movimientos.length} detail="Con embarque, salida o llegada registrada" icon={<IconBus />} />
        <StatCard label="Pasajeros transportados" value={pasajeros} detail="Los que subieron al bus" icon={<IconUsers />} />
        <StatCard
          label="Duración promedio"
          value={promedio !== null ? formatDuration(promedio) : "—"}
          detail={promedio !== null ? "De los viajes que ya llegaron" : "Ningún viaje ha llegado todavía"}
          icon={<IconClock />}
        />
      </div>

      <TableShell
        mobile={
          <ul className="flex flex-col gap-3">
            {movimientos.map((m) => {
              const referencia = m.departedAt ?? m.boardingStartedAt;
              return (
                <MobileCard
                  key={m.tripLogId}
                  title={m.driverName}
                  subtitle={`${referencia ? formatCaracasDate(referencia) : "Sin fecha"} · ${m.routeName} · ${m.vehiclePlate}`}
                  details={[
                    { label: "Salió", value: horaRelativa(m.departedAt, referencia) },
                    { label: "Llegó", value: horaRelativa(m.arrivedAt, referencia) },
                    { label: "Duración", value: m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—" },
                    { label: "Pasajeros", value: m.passengerCount },
                  ]}
                />
              );
            })}
          </ul>
        }
      >
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-borde bg-lienzo">
            <tr>
              <th scope="col" className={PANEL_TH_CLASS}>Fecha</th>
              <th scope="col" className={PANEL_TH_CLASS}>Chofer y vehículo</th>
              <th scope="col" className={PANEL_TH_CLASS}>Ruta</th>
              <th scope="col" className={PANEL_TH_CLASS}>Salió</th>
              <th scope="col" className={PANEL_TH_CLASS}>Llegó</th>
              <th scope="col" className={PANEL_TH_CLASS}>Duración</th>
              <th scope="col" className={cx(PANEL_TH_CLASS, "text-right")}>Pasajeros</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => {
              const referencia = m.departedAt ?? m.boardingStartedAt;
              return (
                <tr key={m.tripLogId} className="border-b border-borde last:border-0">
                  <td className={cx(PANEL_TD_CLASS, "tabular")}>{referencia ? formatCaracasDate(referencia) : "—"}</td>
                  <td className={PANEL_TD_CLASS}>
                    <p className="font-semibold">{m.driverName}</p>
                    <p className="tabular text-sm text-tinta-suave">{m.vehiclePlate}</p>
                  </td>
                  <td className={PANEL_TD_CLASS}>{m.routeName}</td>
                  <td className={cx(PANEL_TD_CLASS, "tabular")}>
                    <p>{horaRelativa(m.departedAt, referencia)}</p>
                    {m.boardingStartedAt ? (
                      <p className="text-sm text-tinta-suave">
                        Embarque desde {horaRelativa(m.boardingStartedAt, referencia)}
                      </p>
                    ) : null}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "tabular")}>{horaRelativa(m.arrivedAt, referencia)}</td>
                  <td className={cx(PANEL_TD_CLASS, "tabular")}>
                    {m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—"}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "tabular text-right")}>{m.passengerCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
