"use client";

import type { CounterHolderLookup } from "@/modules/counter";
import { StatusBadge } from "@/components/panel-ui";
import { TAQUILLA_LABEL_CLASS, taquillaButtonClass, taquillaInputClass } from "./step-payment";

const DOCUMENT_LABELS: Record<"CEDULA" | "PERMISO_VIAJE", string> = {
  CEDULA: "Cédula",
  PERMISO_VIAJE: "Permiso de viaje",
};

/** Paso 2 del asistente: busca al titular por cédula, o toma sus datos si no tiene cuenta. */
export function StepHolder({
  idNumber,
  onChangeIdNumber,
  onSearch,
  searching,
  searchError,
  result,
  needsCedulaFile,
  hasCedulaFile,
  onChangeCedulaFile,
  givenNames,
  onChangeGivenNames,
  surnames,
  onChangeSurnames,
  phone,
  onChangePhone,
  birthYear,
  onChangeBirthYear,
}: {
  idNumber: string;
  onChangeIdNumber: (value: string) => void;
  onSearch: () => void;
  searching: boolean;
  searchError: string | null;
  result: CounterHolderLookup | null;
  needsCedulaFile: boolean;
  hasCedulaFile: boolean;
  onChangeCedulaFile: (file: File | null) => void;
  givenNames: string;
  onChangeGivenNames: (value: string) => void;
  surnames: string;
  onChangeSurnames: (value: string) => void;
  phone: string;
  onChangePhone: (value: string) => void;
  birthYear: string;
  onChangeBirthYear: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <label className={`flex-1 ${TAQUILLA_LABEL_CLASS}`}>
          Cédula del titular
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            value={idNumber}
            onChange={(e) => onChangeIdNumber(e.target.value.toUpperCase())}
            className={taquillaInputClass("uppercase")}
            aria-describedby={searchError ? "error-busqueda-titular" : undefined}
          />
        </label>
        <button
          type="button"
          onClick={onSearch}
          disabled={searching || idNumber.trim().length === 0}
          className={taquillaButtonClass("secundario")}
        >
          {searching ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {searchError ? (
        <p id="error-busqueda-titular" role="alert" className="text-sm font-medium text-[var(--color-peligro)]">
          {searchError}
        </p>
      ) : null}

      {result?.found ? (
        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{result.fullName}</p>
            <StatusBadge
              label={result.activated ? "Cuenta activa" : "Cuenta sin activar"}
              tone={result.activated ? "exito" : "neutro"}
            />
          </div>
          <dl className="mt-3 flex flex-col gap-1 text-sm">
            {(["CEDULA", "PERMISO_VIAJE"] as const).map((tipo) => {
              const cargado = tipo === "CEDULA" ? result.hasCedula : result.hasTravelPermit;
              return (
                <div key={tipo} className="flex items-center justify-between gap-2">
                  <dt className="text-[var(--color-texto-suave)]">{DOCUMENT_LABELS[tipo]}</dt>
                  <dd>
                    <StatusBadge label={cargado ? "Cargado" : "Falta"} tone={cargado ? "exito" : "alerta"} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}

      {result && !result.found ? (
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
          <p className="text-sm text-[var(--color-texto-suave)]">
            No hay cuenta con esta cédula. Regístrala con los datos del pasajero.
          </p>
          <label className={TAQUILLA_LABEL_CLASS}>
            Nombres
            <input
              type="text"
              value={givenNames}
              onChange={(e) => onChangeGivenNames(e.target.value)}
              required
              className={taquillaInputClass()}
            />
          </label>
          <label className={TAQUILLA_LABEL_CLASS}>
            Apellidos
            <input
              type="text"
              value={surnames}
              onChange={(e) => onChangeSurnames(e.target.value)}
              required
              className={taquillaInputClass()}
            />
          </label>
          <label className={TAQUILLA_LABEL_CLASS}>
            Teléfono
            <input
              type="text"
              inputMode="tel"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
              required
              className={taquillaInputClass()}
            />
          </label>
          <label className={TAQUILLA_LABEL_CLASS}>
            Año de nacimiento
            <input
              type="text"
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => onChangeBirthYear(e.target.value)}
              required
              className={taquillaInputClass("w-28")}
            />
          </label>
        </div>
      ) : null}

      <label className={TAQUILLA_LABEL_CLASS}>
        Foto de la cédula{needsCedulaFile ? " (obligatoria)" : ""}
        <input
          type="file"
          name="cedula"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => onChangeCedulaFile(e.target.files?.[0] ?? null)}
          className={taquillaInputClass("py-1.5")}
        />
      </label>
      <p className="-mt-2 text-sm text-[var(--color-texto-suave)]">
        Toma la foto de la cédula del titular. JPG, PNG o WebP, máximo 5 MB.
      </p>
      {needsCedulaFile && !hasCedulaFile ? (
        <p className="text-sm text-[var(--color-alerta)]">Falta la foto de la cédula.</p>
      ) : null}
    </div>
  );
}
