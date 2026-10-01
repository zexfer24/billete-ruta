import type { StatusTone } from "@/lib/labels";

/**
 * Clases y reglas puras del kit de componentes (spec 2026-09-30, sección 6).
 * Sin JSX ni React: las usan tanto los componentes de servidor como los de
 * cliente, y los tests unitarios las prueban sin montar nada. Solo usa
 * utilidades de tokens (bg-marca-600, text-tinta-suave…), nunca colores fijos.
 */

/** Une clases descartando los valores vacíos. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Botones del pasajero (forma de pastilla).
// ---------------------------------------------------------------------------

export type ButtonVariant =
  | "primario"
  | "secundario"
  | "fantasma"
  | "acento"
  | "sobre-marca"
  | "peligro";

export type ButtonSize = "sm" | "md" | "lg";

/** Estados comunes a todos los botones: transición de color de 150 ms, deshabilitado y cursor. */
const BUTTON_STATES =
  "cursor-pointer select-none transition duration-150 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const BUTTON_BASE = `inline-flex items-center justify-center gap-2 rounded-pastilla text-center font-semibold leading-tight ${BUTTON_STATES}`;

export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-12 px-6 py-2.5 text-base",
  lg: "min-h-14 px-7 py-3 text-lg",
};

const PRIMARY_BUTTON = "foco bg-marca-600 text-white hover:bg-marca-700 active:bg-marca-800";

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primario: PRIMARY_BUTTON,
  secundario:
    "foco border border-borde-control bg-superficie text-marca-700 hover:border-marca-600 hover:bg-marca-50 active:bg-marca-100",
  fantasma: "foco bg-transparent text-marca-700 hover:bg-marca-50 active:bg-marca-100",
  // Las dos variantes siguientes solo van sobre fondos morados: su foco es amarillo sol.
  acento: "foco-sobre-marca bg-sol text-marca-950 hover:brightness-95 active:brightness-90",
  "sobre-marca": "foco-sobre-marca bg-white text-marca-700 hover:bg-marca-50 active:bg-marca-100",
  peligro: "foco bg-peligro text-white hover:brightness-95 active:brightness-90",
};

/**
 * Clases de un botón del pasajero según variante y tamaño, listas para pegar
 * en un `button` o en un `Link`. El tamaño `md` (48 px) es el de siempre; `lg`
 * (56 px) es para la acción principal de un paso.
 */
export function buttonClass(variant: ButtonVariant, extra?: string, size: ButtonSize = "md"): string {
  return cx(BUTTON_BASE, BUTTON_SIZE_CLASSES[size], BUTTON_VARIANT_CLASSES[variant], extra);
}

// ---------------------------------------------------------------------------
// Botones del panel (radio de control, más compactos).
// ---------------------------------------------------------------------------

export type PanelButtonVariant = "primario" | "secundario" | "exito" | "peligro" | "fantasma";

/** `sm` solo dentro de tablas en escritorio; `md` es el tamaño normal; `lg`, la acción principal. */
export type PanelButtonSize = "sm" | "md" | "lg";

const PANEL_BUTTON_BASE = `foco inline-flex items-center justify-center gap-2 rounded-control text-center font-semibold leading-tight ${BUTTON_STATES}`;

export const PANEL_BUTTON_SIZE_CLASSES: Record<PanelButtonSize, string> = {
  sm: "min-h-10 px-3 py-1.5 text-sm",
  md: "min-h-11 px-4 py-2 text-[15px]",
  lg: "min-h-12 px-5 py-2.5 text-base",
};

export const PANEL_BUTTON_VARIANT_CLASSES: Record<PanelButtonVariant, string> = {
  primario: "bg-marca-600 text-white hover:bg-marca-700 active:bg-marca-800",
  secundario:
    "border border-borde-control bg-superficie text-tinta hover:border-marca-600 hover:bg-marca-50 hover:text-marca-800 active:bg-marca-100",
  exito: "bg-exito text-white hover:brightness-95 active:brightness-90",
  peligro: "bg-peligro text-white hover:brightness-95 active:brightness-90",
  fantasma: "bg-transparent text-marca-700 hover:bg-marca-50 active:bg-marca-100",
};

/** Clases de un botón del panel según variante y tamaño, listas para pegar en cualquier elemento clicable. */
export function panelButtonClass(
  variant: PanelButtonVariant,
  size: PanelButtonSize = "md",
  extra?: string,
): string {
  return cx(PANEL_BUTTON_BASE, PANEL_BUTTON_SIZE_CLASSES[size], PANEL_BUTTON_VARIANT_CLASSES[variant], extra);
}

// ---------------------------------------------------------------------------
// Campos de formulario.
// ---------------------------------------------------------------------------

/** Estados compartidos por los campos: borde de control, foco con anillo morado, error y deshabilitado. */
const INPUT_STATES =
  "foco w-full border bg-superficie text-base text-tinta placeholder:text-tinta-tenue transition-colors duration-150 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:bg-lienzo disabled:text-tinta-suave";

/** Clases del control de un campo del pasajero (48 px de alto), con o sin error. */
export function fieldControlClass(hasError: boolean, extra?: string): string {
  return cx(
    "min-h-12 rounded-control px-4 py-2.5",
    INPUT_STATES,
    hasError ? "border-peligro" : "border-borde-control hover:border-tinta-suave",
    extra,
  );
}

/**
 * Clases de un campo del panel (44 px de alto); el error se marca con
 * `aria-invalid="true"`. La marca `campo-panel` hace que un `<select>` con
 * estas clases cambie la flecha nativa del navegador por el chevron de la
 * marca (regla en `globals.css`), sin que cada pantalla tenga que dibujarlo.
 */
export function panelInputClass(extra?: string): string {
  return cx(
    "campo-panel min-h-11 rounded-control px-3 py-2",
    INPUT_STATES,
    "border-borde-control hover:border-tinta-suave aria-[invalid=true]:border-peligro",
    extra,
  );
}

/** Clases de la etiqueta de un campo del panel, que envuelve al control. */
export const PANEL_LABEL_CLASS = "flex flex-col gap-1.5 text-sm font-semibold text-tinta";

// ---------------------------------------------------------------------------
// Pestañas del panel.
// ---------------------------------------------------------------------------

/**
 * Pestaña activa del panel: fondo marca-50, texto marca-800 y una barra
 * inferior de 3 px en marca-600 (8,7:1 sobre blanco y sobre marca-50). La
 * barra es la señal que no depende del tono (WCAG 1.4.1 y 1.4.11); va en un
 * pseudoelemento absoluto, así no cambia la caja ni mueve a las vecinas, y no
 * se confunde con el anillo de foco. El peso de la letra es el mismo que el de
 * la inactiva para que el ancho no salte al cambiar de pestaña. La comparten
 * `PanelTabs`, las pestañas propias de pasajeros y del terminal y sus skeletons.
 */
export const PANEL_TAB_ACTIVE_CLASS =
  "relative bg-marca-50 text-marca-800 after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0.5 after:h-[3px] after:rounded-pastilla after:bg-marca-600";

/** Pestaña inactiva del panel: texto secundario sobre la superficie, con fondo lienzo al pasar el puntero. */
export const PANEL_TAB_INACTIVE_CLASS = "text-tinta-suave hover:bg-lienzo hover:text-tinta";

// ---------------------------------------------------------------------------
// Tonos de estado (Pill, StatusBadge, Alert, ProgressBar).
// ---------------------------------------------------------------------------

/** Tonos de una pastilla de estado: los mismos de `labels.ts`, que ya incluyen `info`. */
export type PillTone = StatusTone;

export const PILL_TONE_CLASSES: Record<PillTone, string> = {
  marca: "bg-marca-100 text-marca-800",
  exito: "bg-exito-suave text-exito",
  alerta: "bg-alerta-suave text-alerta",
  peligro: "bg-peligro-suave text-peligro",
  info: "bg-info-suave text-info",
  neutro: "border border-borde bg-lienzo text-tinta-suave",
};

/** Clases de una pastilla de estado: texto de 14 px que se parte en líneas en vez de desbordarse. */
export function pillClass(tone: PillTone): string {
  return cx(
    "inline-flex w-fit max-w-full items-center gap-1.5 whitespace-normal break-words rounded-pastilla px-2.5 py-0.5 text-sm font-medium leading-snug",
    PILL_TONE_CLASSES[tone],
  );
}

export type AlertTone = "exito" | "peligro" | "alerta" | "info";

/** Rol accesible de un aviso: los errores y advertencias interrumpen; el resto se anuncia con cortesía. */
export function alertRole(tone: AlertTone): "alert" | "status" {
  return tone === "peligro" || tone === "alerta" ? "alert" : "status";
}

export const ALERT_TONE_CLASSES: Record<AlertTone, { box: string; icon: string; title: string }> = {
  exito: { box: "border-exito/30 bg-exito-suave", icon: "text-exito", title: "text-exito" },
  peligro: { box: "border-peligro/30 bg-peligro-suave", icon: "text-peligro", title: "text-peligro" },
  alerta: { box: "border-alerta/30 bg-alerta-suave", icon: "text-alerta", title: "text-alerta" },
  info: { box: "border-info/30 bg-info-suave", icon: "text-info", title: "text-info" },
};

export type ProgressTone = "marca" | "exito" | "alerta" | "peligro";

export const PROGRESS_TONE_CLASSES: Record<ProgressTone, string> = {
  marca: "bg-marca-600",
  exito: "bg-exito",
  alerta: "bg-alerta",
  peligro: "bg-peligro",
};

/** Porcentaje entero de avance entre 0 y 100; un máximo de cero o inválido da 0. */
export function progressPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  const percent = Math.round((value / max) * 100);
  return Math.min(100, Math.max(0, percent));
}

// ---------------------------------------------------------------------------
// Stepper.
// ---------------------------------------------------------------------------

export type StepState = "hecho" | "actual" | "pendiente";

/**
 * Estado de un paso del `Stepper`. `step` y `current` empiezan en 1, como el
 * texto "Paso 2 de 4" que ve el usuario.
 */
export function stepState(step: number, current: number): StepState {
  if (step < current) return "hecho";
  if (step === current) return "actual";
  return "pendiente";
}

/** Texto para lectores de pantalla de un paso, por ejemplo "Paso 1 de 4, hecho: Salida". */
export function stepDescription(step: number, total: number, label: string, current: number): string {
  const state = stepState(step, current);
  const suffix = state === "hecho" ? ", hecho" : state === "actual" ? ", paso actual" : "";
  return `Paso ${step} de ${total}${suffix}: ${label}`;
}

// ---------------------------------------------------------------------------
// Archivos.
// ---------------------------------------------------------------------------

/** Tamaño de un archivo en palabras cortas con coma decimal: "850 KB", "1,2 MB", "5 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  const text = mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  return `${text} MB`;
}
