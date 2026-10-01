"use client";

import type { ChangeEvent } from "react";
import { IconChevronDown } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelInputClass } from "@/components/panel-ui";

/**
 * Lista de agencias del filtro de movimientos. Se aplica al elegir, igual que
 * las pestañas de periodo se aplican al tocarlas: así la agencia elegida y la
 * aplicada nunca difieren y cambiar luego el periodo no la pierde.
 * `requestSubmit` pasa por el `onSubmit` de `GetForm`, que muestra la espera.
 * Sin JavaScript, el botón "Filtrar" de `PeriodFilter` envía el formulario.
 */
export function AgencySelect({
  agencies,
  value,
}: {
  agencies: Array<{ id: string; name: string; active: boolean }>;
  value?: string;
}) {
  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <label className={`${PANEL_LABEL_CLASS} min-w-0 flex-1 basis-40 sm:flex-none`}>
      Agencia
      <span className="relative block">
        <select
          name="agency"
          defaultValue={value ?? ""}
          onChange={onChange}
          className={panelInputClass("cursor-pointer appearance-none pr-10 sm:w-64")}
        >
          <option value="">Todas las agencias</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.active ? "" : " (inactiva)"}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
      </span>
    </label>
  );
}
