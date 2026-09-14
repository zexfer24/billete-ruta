import Link from "next/link";
import { PanelFeedback } from "@/components/panel-feedback";
import { EmptyState, PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { createDepartureAction } from "@/app/panel/salidas/actions";

/** Horas de salida en formato de 24 horas, cada media hora. */
export const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export interface DepartureFormProps {
  routes: { id: string; name: string }[];
  vehicles: { id: string; plate: string; seatCount: number }[]; // solo activos
  drivers: { id: string; fullName: string }[]; // solo activos
  returnTo?: "tablero";
  error?: string;
}

/**
 * Formulario reutilizable de alta de salida. Lo usa el panel lateral de la
 * pantalla de salidas y, con `returnTo="tablero"`, el registro rápido del
 * tablero (R5). Sin al menos una ruta, un vehículo activo y un chofer activo
 * no hay con qué armar la salida, así que en su lugar se muestra el estado
 * vacío con el enlace a la flota.
 */
export function DepartureForm({ routes, vehicles, drivers, returnTo, error }: DepartureFormProps) {
  if (routes.length === 0 || vehicles.length === 0 || drivers.length === 0) {
    return (
      <EmptyState
        title="Faltan datos para crear una salida"
        description="Necesitas al menos un vehículo activo y un chofer activo para crear una salida."
        action={
          <Link href="/panel/flota" className={panelButtonClass("secundario", "sm")}>
            Ir a la flota
          </Link>
        }
      />
    );
  }

  return (
    <form action={createDepartureAction} className="flex flex-col gap-4">
      <PanelFeedback error={error} />
      {returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={PANEL_LABEL_CLASS}>
          Ruta
          <select name="routeId" required defaultValue="" className={panelInputClass()}>
            <option value="" disabled>
              Elige una ruta
            </option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className={PANEL_LABEL_CLASS}>
          Vehículo
          <select name="vehicleId" required defaultValue="" className={panelInputClass()}>
            <option value="" disabled>
              Elige un vehículo
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} · {v.seatCount} asientos
              </option>
            ))}
          </select>
        </label>

        <label className={PANEL_LABEL_CLASS}>
          Chofer
          <select name="driverId" required defaultValue="" className={panelInputClass()}>
            <option value="" disabled>
              Elige un chofer
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className={PANEL_LABEL_CLASS}>
          Fecha (hora de Caracas)
          <input type="date" name="fecha" required className={panelInputClass()} />
        </label>

        <label className={PANEL_LABEL_CLASS}>
          Hora de salida
          <select name="hora" required defaultValue="06:00" className={panelInputClass("tabular")}>
            {HORAS.map((hora) => (
              <option key={hora} value={hora}>
                {hora}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" className={panelButtonClass("primario")}>
        Crear salida
      </button>
    </form>
  );
}
