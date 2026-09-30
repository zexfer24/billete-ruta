"use client";

import type { KeyboardEvent } from "react";
import type { CounterHolderLookup } from "@/modules/counter";
import { FieldError, FileField, Pill } from "@/components/ui";
import { Alert } from "@/components/alert";
import { panelButtonClass } from "@/components/panel-ui";
import { IconAlertCircle, IconCheckCircle, IconSearch, IconSpinner, IconUser } from "@/components/icons";
import { CounterField } from "./counter-field";

/** Errores de los datos de un titular nuevo, campo por campo (vacío si está bien). */
export interface NewHolderErrors {
  givenNames?: string;
  surnames?: string;
  phone?: string;
  birthYear?: string;
}

/** Estado de un documento del titular, con icono y texto (nunca solo color). */
function DocumentStatus({ label, loaded }: { label: string; loaded: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[15px]">
      {loaded ? (
        <IconCheckCircle className="size-5 shrink-0 text-exito" />
      ) : (
        <IconAlertCircle className="size-5 shrink-0 text-alerta" />
      )}
      <span className="text-tinta">
        {label}: <span className="font-semibold">{loaded ? "ya la tenemos" : "no está cargada"}</span>
      </span>
    </li>
  );
}

/**
 * Paso 2 del asistente: busca al titular por su cédula (con el botón o con
 * Enter). Si ya tiene cuenta muestra sus datos y documentos; si no, pide los
 * datos para crearle una. La foto de la cédula solo se pide cuando hace falta.
 */
export function StepHolder({
  idNumber,
  onChangeIdNumber,
  onSearch,
  searching,
  searchError,
  result,
  showCedulaField,
  cedulaMissing,
  onChangeCedulaFile,
  givenNames,
  onChangeGivenNames,
  surnames,
  onChangeSurnames,
  phone,
  onChangePhone,
  birthYear,
  onChangeBirthYear,
  errors,
  missingSearch,
}: {
  idNumber: string;
  onChangeIdNumber: (value: string) => void;
  onSearch: () => void;
  searching: boolean;
  searchError: string | null;
  result: CounterHolderLookup | null;
  showCedulaField: boolean;
  /** Se intentó continuar sin la foto de la cédula. */
  cedulaMissing: boolean;
  onChangeCedulaFile: (file: File | null) => void;
  givenNames: string;
  onChangeGivenNames: (value: string) => void;
  surnames: string;
  onChangeSurnames: (value: string) => void;
  phone: string;
  onChangePhone: (value: string) => void;
  birthYear: string;
  onChangeBirthYear: (value: string) => void;
  errors: NewHolderErrors;
  /** Se intentó continuar sin buscar la cédula. */
  missingSearch: boolean;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch();
    }
  }

  const errorBusqueda =
    searchError ?? (missingSearch ? "Escribe la cédula y pulsa «Buscar» para continuar." : undefined);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <CounterField
          id="taquilla-cedula"
          label="Cédula del titular"
          hint="Con su letra y sin puntos, por ejemplo V12345678. Pulsa Enter o «Buscar»."
          error={errorBusqueda}
          errorAfterSubmit
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={idNumber}
          onChange={(e) => onChangeIdNumber(e.target.value.toUpperCase())}
          onKeyDown={onKeyDown}
          className="flex-1"
          inputClassName="tabular uppercase"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={searching || idNumber.trim().length === 0}
          aria-disabled={searching || idNumber.trim().length === 0 ? true : undefined}
          className={panelButtonClass("secundario", "lg", "min-h-12 sm:mt-[26px]")}
        >
          {searching ? (
            <>
              <IconSpinner className="size-5 animate-spin motion-reduce:animate-none" />
              Buscando…
            </>
          ) : (
            <>
              <IconSearch className="size-5" />
              Buscar
            </>
          )}
        </button>
      </div>
      <span className="sr-only" role="status">
        {searching ? "Buscando al titular…" : ""}
      </span>

      {result?.found ? (
        <div className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
          <div className="flex flex-wrap items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
            >
              <IconUser className="size-6" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-lg font-semibold text-tinta">{result.fullName}</p>
              <Pill tone={result.activated ? "exito" : "neutro"}>
                {result.activated ? "Cuenta activa" : "Todavía no activa su cuenta"}
              </Pill>
            </div>
          </div>
          {!result.activated ? (
            <p className="text-[15px] text-tinta-suave">
              No hace falta para vender. Puede activarla cuando quiera en la página de registro de TicketRuta con su
              cédula, su teléfono y su año de nacimiento.
            </p>
          ) : null}
          <ul className="flex flex-col gap-2">
            <DocumentStatus label="Foto de la cédula" loaded={result.hasCedula} />
            <DocumentStatus label="Permiso de viaje" loaded={result.hasTravelPermit} />
          </ul>
        </div>
      ) : null}

      {result && !result.found ? (
        <div className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
          <Alert tone="info" role="none" title="Esta cédula no tiene cuenta">
            Escribe los datos del pasajero y le crearemos una al cobrar.
          </Alert>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CounterField
              id="taquilla-nombres"
              label="Nombres"
              autoComplete="off"
              aria-required="true"
              value={givenNames}
              onChange={(e) => onChangeGivenNames(e.target.value)}
              error={errors.givenNames}
            />
            <CounterField
              id="taquilla-apellidos"
              label="Apellidos"
              autoComplete="off"
              aria-required="true"
              value={surnames}
              onChange={(e) => onChangeSurnames(e.target.value)}
              error={errors.surnames}
            />
            <CounterField
              id="taquilla-telefono"
              type="tel"
              inputMode="tel"
              label="Teléfono"
              hint="Por ejemplo 0414 123 4567."
              autoComplete="off"
              aria-required="true"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
              error={errors.phone}
              inputClassName="tabular"
            />
            <CounterField
              id="taquilla-nacimiento"
              inputMode="numeric"
              label="Año de nacimiento"
              hint="Cuatro números, por ejemplo 1990."
              autoComplete="off"
              aria-required="true"
              maxLength={4}
              value={birthYear}
              onChange={(e) => onChangeBirthYear(e.target.value)}
              error={errors.birthYear}
              inputClassName="tabular max-w-40"
            />
          </div>
        </div>
      ) : null}

      {showCedulaField ? (
        <div className="flex flex-col gap-2">
          <FileField
            name="cedula"
            label="Foto de la cédula del titular"
            hint="Toma la foto con la cámara o elige una imagen. JPG, PNG o WebP, hasta 5 MB."
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            maxSizeMb={5}
            buttonLabel="Tomar o elegir la foto"
            onChange={(e) => onChangeCedulaFile(e.currentTarget.files?.[0] ?? null)}
          />
          {cedulaMissing ? (
            <FieldError id="taquilla-cedula-foto-error" afterSubmit>
              Falta la foto de la cédula: es obligatoria para vender.
            </FieldError>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
