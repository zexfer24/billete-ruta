"use client";

import { isValidBirthYear, isValidIdNumber } from "@/lib/identity";
import { FieldError, FileField } from "@/components/ui";
import { Alert } from "@/components/alert";
import { panelButtonClass } from "@/components/panel-ui";
import { IconClose, IconPlus } from "@/components/icons";
import { CounterField } from "./counter-field";

export interface CompanionFormState {
  fullName: string;
  idNumber: string;
  birthYear: string;
}

export const MAX_COMPANIONS = 5;

export function emptyCompanion(): CompanionFormState {
  return { fullName: "", idNumber: "", birthYear: "" };
}

/** Errores de un acompañante, campo por campo; un campo sin error no aparece. */
export function companionErrors(c: CompanionFormState): Partial<Record<keyof CompanionFormState, string>> {
  const errores: Partial<Record<keyof CompanionFormState, string>> = {};
  if (c.fullName.trim().length < 3) {
    errores.fullName = "Escribe el nombre y el apellido.";
  }
  if (!isValidIdNumber(c.idNumber)) {
    errores.idNumber = "Revisa la cédula: debe tener de 5 a 12 números, con o sin la letra.";
  }
  const year = Number.parseInt(c.birthYear.trim(), 10);
  if (!/^\d{4}$/.test(c.birthYear.trim()) || !isValidBirthYear(year)) {
    errores.birthYear = "Escribe el año con cuatro números, por ejemplo 2015.";
  }
  return errores;
}

/** Un acompañante está completo si sus tres campos son válidos. */
export function companionIsValid(c: CompanionFormState): boolean {
  return Object.keys(companionErrors(c)).length === 0;
}

/**
 * Paso 3 del asistente: acompañantes (cada uno con su error debajo del campo),
 * el permiso de viaje cuando viaja un menor y la aceptación de las políticas,
 * con un resumen que el vendedor puede leerle al pasajero.
 */
export function StepCompanions({
  companions,
  onChangeCompanion,
  onAdd,
  onRemove,
  needsTravelPermitFile,
  hasTravelPermitAlready,
  travelPermitMissing,
  onChangeTravelPermitFile,
  policiesAccepted,
  onChangePoliciesAccepted,
  policiesMissing,
  showErrors,
}: {
  companions: CompanionFormState[];
  onChangeCompanion: (index: number, field: keyof CompanionFormState, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  needsTravelPermitFile: boolean;
  /** El titular ya tiene un permiso de viaje cargado y viaja un menor. */
  hasTravelPermitAlready: boolean;
  /** Se intentó continuar sin la foto del permiso. */
  travelPermitMissing: boolean;
  onChangeTravelPermitFile: (file: File | null) => void;
  policiesAccepted: boolean;
  onChangePoliciesAccepted: (value: boolean) => void;
  /** Se intentó continuar sin aceptar las políticas. */
  policiesMissing: boolean;
  /** Se intentó continuar: los campos vacíos también muestran su error. */
  showErrors: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="acompanantes-titulo" className="flex flex-col gap-4">
        <div>
          <h3 id="acompanantes-titulo" className="text-base font-semibold text-tinta">
            Acompañantes
          </h3>
          <p className="text-[15px] text-tinta-suave">
            Agrega a cada persona que viaja con el titular. Si viaja solo, sigue al paso siguiente.
          </p>
        </div>

        {companions.map((c, i) => {
          const errores = companionErrors(c);
          // Un campo vacío no se marca hasta que se intenta continuar; uno con texto, en cuanto está mal.
          const errorDe = (campo: keyof CompanionFormState) =>
            showErrors || c[campo].trim() !== "" ? errores[campo] : undefined;
          return (
            <fieldset
              key={i}
              className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1"
            >
              <legend className="sr-only">Acompañante {i + 1}</legend>
              <p aria-hidden="true" className="text-base font-semibold text-tinta">
                Acompañante {i + 1}
              </p>
              <CounterField
                id={`taquilla-acompanante-${i}-nombre`}
                label="Nombre y apellido"
                autoComplete="off"
                value={c.fullName}
                onChange={(e) => onChangeCompanion(i, "fullName", e.target.value)}
                error={errorDe("fullName")}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CounterField
                  id={`taquilla-acompanante-${i}-cedula`}
                  label="Cédula"
                  hint="Con su letra y sin puntos, por ejemplo V12345678."
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={c.idNumber}
                  onChange={(e) => onChangeCompanion(i, "idNumber", e.target.value.toUpperCase())}
                  error={errorDe("idNumber")}
                  inputClassName="tabular uppercase"
                />
                <CounterField
                  id={`taquilla-acompanante-${i}-nacimiento`}
                  inputMode="numeric"
                  label="Año de nacimiento"
                  maxLength={4}
                  autoComplete="off"
                  value={c.birthYear}
                  onChange={(e) => onChangeCompanion(i, "birthYear", e.target.value)}
                  error={errorDe("birthYear")}
                  inputClassName="tabular max-w-40"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className={panelButtonClass("secundario", "md", "w-fit self-end")}
              >
                <IconClose className="size-5" />
                Quitar al acompañante {i + 1}
              </button>
            </fieldset>
          );
        })}

        {companions.length < MAX_COMPANIONS ? (
          <button type="button" onClick={onAdd} className={panelButtonClass("secundario", "lg", "w-full sm:w-fit")}>
            <IconPlus className="size-5" />
            {companions.length === 0 ? "Agregar un acompañante" : "Agregar otro acompañante"}
          </button>
        ) : (
          <p className="text-[15px] text-tinta-suave">
            Llegaste al máximo de {MAX_COMPANIONS} acompañantes por venta.
          </p>
        )}
      </section>

      {needsTravelPermitFile ? (
        <section className="flex flex-col gap-3">
          <Alert tone="info" role="none" title="Viaja un menor de edad">
            Toma la foto del permiso de viaje firmado. Sin ese permiso no se puede vender el pasaje.
          </Alert>
          <FileField
            name="travelPermit"
            label="Foto del permiso de viaje"
            hint="JPG, PNG o WebP, hasta 5 MB."
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            maxSizeMb={5}
            buttonLabel="Tomar o elegir la foto"
            onChange={(e) => onChangeTravelPermitFile(e.currentTarget.files?.[0] ?? null)}
          />
          {travelPermitMissing ? (
            <FieldError id="taquilla-permiso-error" afterSubmit>
              Falta la foto del permiso de viaje.
            </FieldError>
          ) : null}
        </section>
      ) : hasTravelPermitAlready ? (
        <Alert tone="info" role="none" title="Viaja un menor de edad">
          El titular ya tiene un permiso de viaje cargado. No hace falta tomar otra foto.
        </Alert>
      ) : null}

      <section
        aria-labelledby="politicas-titulo"
        className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1"
      >
        <div>
          <h3 id="politicas-titulo" className="text-base font-semibold text-tinta">
            Políticas de viaje
          </h3>
          <p className="text-[15px] text-tinta-suave">Léeselas al pasajero antes de marcar la casilla.</p>
        </div>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-tinta">
          <li>El pasaje se paga completo ahora y el ticket se entrega en el acto.</li>
          <li>Los menores de edad viajan con su permiso de viaje firmado.</li>
          <li>
            Los datos del pasajero y de sus acompañantes se usan solo para este viaje y para verificar su identidad
            en el terminal.
          </li>
        </ul>
        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-borde-control px-4 py-3 hover:border-marca-600">
          <input
            type="checkbox"
            checked={policiesAccepted}
            onChange={(e) => onChangePoliciesAccepted(e.target.checked)}
            aria-invalid={policiesMissing ? true : undefined}
            aria-describedby={policiesMissing ? "taquilla-politicas-error" : undefined}
            className="foco mt-0.5 size-6 shrink-0 accent-marca-600"
          />
          <span className="text-base font-medium text-tinta">El pasajero leyó y aceptó las políticas de viaje.</span>
        </label>
        {policiesMissing ? (
          <FieldError id="taquilla-politicas-error" afterSubmit>
            Marca la casilla cuando el pasajero acepte las políticas.
          </FieldError>
        ) : null}
      </section>
    </div>
  );
}
