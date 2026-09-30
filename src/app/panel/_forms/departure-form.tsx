import Link from "next/link";
import { PanelFeedback } from "@/components/panel-feedback";
import { SubmitButton } from "@/components/submit-button";
import { IconBus, IconRoute, IconUser } from "@/components/icons";
import { EmptyState, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { caracasDayInputValue } from "@/lib/time";
import { createDepartureAction } from "@/app/panel/salidas/actions";
import { PanelField, errorFieldFor, panelFieldAria } from "./panel-field";

/** Horas de salida en formato de 24 horas, cada media hora. */
export const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

/** Campos del formulario, en el orden en que se muestran (para ubicar el error de `?campo=`). */
const CAMPOS = ["routeId", "vehicleId", "driverId", "fecha", "hora"] as const;

export interface DepartureFormProps {
  /** Rutas de la agencia; las que traen `active: false` no se ofrecen. */
  routes: { id: string; name: string; active?: boolean }[];
  vehicles: { id: string; plate: string; seatCount: number }[]; // solo activos
  drivers: { id: string; fullName: string }[]; // solo activos
  returnTo?: "tablero";
  error?: string;
  /** Campo al que corresponde `error` (`?campo=`), para marcarlo en rojo. */
  errorField?: string;
}

/** Lo que falta para poder crear una salida, cada cosa con su salida. */
function MissingData({
  sinRutas,
  sinVehiculos,
  sinChoferes,
}: {
  sinRutas: boolean;
  sinVehiculos: boolean;
  sinChoferes: boolean;
}) {
  const icon = sinRutas ? <IconRoute /> : sinVehiculos ? <IconBus /> : <IconUser />;
  return (
    <EmptyState
      icon={icon}
      title="Todavía no puedes crear una salida"
      description={
        <span className="flex flex-col gap-1">
          {sinRutas ? (
            <span>
              Tu agencia no tiene rutas activas. Las rutas las registra la administración del terminal:
              pídeles que agreguen la que necesitas.
            </span>
          ) : null}
          {sinVehiculos ? <span>Necesitas al menos un vehículo disponible.</span> : null}
          {sinChoferes ? <span>Necesitas al menos un chofer disponible.</span> : null}
        </span>
      }
      action={
        sinVehiculos || sinChoferes ? (
          <>
            {sinVehiculos ? (
              <Link
                href="/panel/flota?vista=vehiculos&registrar=vehiculo"
                className={panelButtonClass("secundario")}
              >
                Registrar un vehículo
              </Link>
            ) : null}
            {sinChoferes ? (
              <Link
                href="/panel/flota?vista=choferes&registrar=chofer"
                className={panelButtonClass("secundario")}
              >
                Registrar un chofer
              </Link>
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}

/**
 * Formulario reutilizable de alta de salida. Lo usa el panel lateral de la
 * pantalla de salidas y, con `returnTo="tablero"`, el registro rápido del
 * tablero. Sin una ruta activa, un vehículo disponible y un chofer disponible
 * no hay con qué armar la salida: en su lugar dice qué falta y cómo
 * conseguirlo.
 */
export function DepartureForm({ routes, vehicles, drivers, returnTo, error, errorField }: DepartureFormProps) {
  const rutasActivas = routes.filter((r) => r.active !== false);
  if (rutasActivas.length === 0 || vehicles.length === 0 || drivers.length === 0) {
    return (
      <MissingData
        sinRutas={rutasActivas.length === 0}
        sinVehiculos={vehicles.length === 0}
        sinChoferes={drivers.length === 0}
      />
    );
  }

  const campoConError = errorFieldFor(error, errorField, CAMPOS);
  const errorDe = (campo: (typeof CAMPOS)[number]) => (campoConError === campo ? error : undefined);
  const hoy = caracasDayInputValue(new Date());
  const ayudaHora = "Formato de 24 horas, hora de Caracas. Por ejemplo, 14:30 son las 2:30 de la tarde.";

  return (
    <form action={createDepartureAction} className="flex flex-col gap-5">
      <PanelFeedback error={error} />
      {returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}

      <PanelField id="salida-ruta" label="Ruta" error={errorDe("routeId")}>
        <select
          name="routeId"
          required
          defaultValue=""
          className={panelInputClass()}
          {...panelFieldAria("salida-ruta", undefined, errorDe("routeId"))}
        >
          <option value="" disabled>
            Elige una ruta
          </option>
          {rutasActivas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </PanelField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PanelField id="salida-vehiculo" label="Vehículo" error={errorDe("vehicleId")}>
          <select
            name="vehicleId"
            required
            defaultValue=""
            className={panelInputClass()}
            {...panelFieldAria("salida-vehiculo", undefined, errorDe("vehicleId"))}
          >
            <option value="" disabled>
              Elige un vehículo
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} · {v.seatCount} puestos
              </option>
            ))}
          </select>
        </PanelField>

        <PanelField id="salida-chofer" label="Chofer" error={errorDe("driverId")}>
          <select
            name="driverId"
            required
            defaultValue=""
            className={panelInputClass()}
            {...panelFieldAria("salida-chofer", undefined, errorDe("driverId"))}
          >
            <option value="" disabled>
              Elige un chofer
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </PanelField>

        <PanelField id="salida-fecha" label="Fecha de salida" error={errorDe("fecha")}>
          <input
            type="date"
            name="fecha"
            required
            min={hoy}
            defaultValue={hoy}
            className={panelInputClass("tabular")}
            {...panelFieldAria("salida-fecha", undefined, errorDe("fecha"))}
          />
        </PanelField>

        <PanelField id="salida-hora" label="Hora de salida" hint={ayudaHora} error={errorDe("hora")}>
          <select
            name="hora"
            required
            defaultValue=""
            className={panelInputClass("tabular")}
            {...panelFieldAria("salida-hora", ayudaHora, errorDe("hora"))}
          >
            <option value="" disabled>
              Elige la hora
            </option>
            {HORAS.map((hora) => (
              <option key={hora} value={hora}>
                {hora}
              </option>
            ))}
          </select>
        </PanelField>
      </div>

      <SubmitButton pendingLabel="Creando salida…" className={panelButtonClass("primario", "lg", "w-full sm:w-fit")}>
        Crear salida
      </SubmitButton>
    </form>
  );
}
