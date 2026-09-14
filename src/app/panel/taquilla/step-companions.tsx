"use client";

import { isValidBirthYear, isValidIdNumber } from "@/lib/identity";
import { IconClose, IconPlus } from "@/components/icons";
import { TAQUILLA_LABEL_CLASS, taquillaButtonClass, taquillaInputClass } from "./step-payment";

export interface CompanionFormState {
  fullName: string;
  idNumber: string;
  birthYear: string;
}

export const MAX_COMPANIONS = 5;

export function emptyCompanion(): CompanionFormState {
  return { fullName: "", idNumber: "", birthYear: "" };
}

/** Un acompañante está completo si sus tres campos son válidos. */
export function companionIsValid(c: CompanionFormState): boolean {
  const year = Number.parseInt(c.birthYear.trim(), 10);
  return (
    c.fullName.trim().length >= 3 &&
    isValidIdNumber(c.idNumber) &&
    /^\d{4}$/.test(c.birthYear.trim()) &&
    isValidBirthYear(year)
  );
}

/** Paso 3 del asistente: acompañantes, permiso de viaje si hace falta y aceptación de políticas. */
export function StepCompanions({
  companions,
  onChangeCompanion,
  onAdd,
  onRemove,
  needsTravelPermitFile,
  hasTravelPermitFile,
  onChangeTravelPermitFile,
  policiesAccepted,
  onChangePoliciesAccepted,
}: {
  companions: CompanionFormState[];
  onChangeCompanion: (index: number, field: keyof CompanionFormState, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  needsTravelPermitFile: boolean;
  hasTravelPermitFile: boolean;
  onChangeTravelPermitFile: (file: File | null) => void;
  policiesAccepted: boolean;
  onChangePoliciesAccepted: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {companions.map((c, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Acompañante {i + 1}</p>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Quitar acompañante ${i + 1}`}
                className={taquillaButtonClass("fantasma")}
              >
                <IconClose className="h-4 w-4" />
                Quitar
              </button>
            </div>
            <label className={TAQUILLA_LABEL_CLASS}>
              Nombre completo
              <input
                type="text"
                value={c.fullName}
                onChange={(e) => onChangeCompanion(i, "fullName", e.target.value)}
                className={taquillaInputClass()}
              />
            </label>
            <label className={TAQUILLA_LABEL_CLASS}>
              Cédula
              <input
                type="text"
                inputMode="text"
                value={c.idNumber}
                onChange={(e) => onChangeCompanion(i, "idNumber", e.target.value.toUpperCase())}
                className={taquillaInputClass("uppercase")}
              />
            </label>
            <label className={TAQUILLA_LABEL_CLASS}>
              Año de nacimiento
              <input
                type="text"
                inputMode="numeric"
                value={c.birthYear}
                onChange={(e) => onChangeCompanion(i, "birthYear", e.target.value)}
                className={taquillaInputClass("w-28")}
              />
            </label>
          </div>
        ))}
      </div>

      {companions.length < MAX_COMPANIONS ? (
        <button type="button" onClick={onAdd} className={taquillaButtonClass("secundario", "w-fit")}>
          <IconPlus className="h-4 w-4" />
          Añadir acompañante
        </button>
      ) : null}

      {needsTravelPermitFile ? (
        <div className="flex flex-col gap-2">
          <label className={TAQUILLA_LABEL_CLASS}>
            Permiso de viaje (obligatorio)
            <input
              type="file"
              name="travelPermit"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => onChangeTravelPermitFile(e.target.files?.[0] ?? null)}
              className={taquillaInputClass("py-1.5")}
            />
          </label>
          <p className="text-sm text-[var(--color-texto-suave)]">
            Viaja un menor de edad: se requiere el permiso de viaje firmado.
          </p>
          {!hasTravelPermitFile ? (
            <p className="text-sm text-[var(--color-alerta)]">Falta la foto del permiso de viaje.</p>
          ) : null}
        </div>
      ) : null}

      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4 text-base">
        <input
          type="checkbox"
          checked={policiesAccepted}
          onChange={(e) => onChangePoliciesAccepted(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--color-acento)]"
        />
        El pasajero leyó y aceptó las políticas de viaje.
      </label>
    </div>
  );
}
