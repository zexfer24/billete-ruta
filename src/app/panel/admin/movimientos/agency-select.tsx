"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { IconChevronDown, IconSpinner } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelInputClass } from "@/components/panel-ui";

/** Teclas que, con la lista cerrada, cambian la agencia elegida sin abrirla. */
const KEYBOARD_STEP_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);

/** Tope de la espera, por si la navegación no llega a cambiar la agencia aplicada. */
const MAX_PENDING_MS = 15_000;

/**
 * Lista de agencias del filtro de movimientos. Se aplica al elegir, igual que
 * las pestañas de periodo se aplican al tocarlas: así la agencia elegida y la
 * aplicada no difieren y cambiar luego el periodo no la pierde.
 *
 * - Con el puntero (o con la lista desplegada), se aplica al elegir.
 * - Con las flechas sobre la lista cerrada, cada flecha cambia el valor sin
 *   navegar; se aplica con Enter o al salir de la lista. Así recorrerla con el
 *   teclado no abre una página por agencia (WCAG 3.2.2).
 * - Es controlada y no se vuelve a montar al llegar la página nueva: el foco
 *   se queda en ella (WCAG 2.4.3). Si la agencia aplicada cambia por otro
 *   camino (atrás del navegador, "Ver todas las agencias"), la lista la toma.
 * - Navega ella misma (`router.push` con los campos del formulario), así una
 *   segunda elección durante la espera reemplaza a la primera en vez de
 *   perderse, y muestra su propia espera, visible y anunciada.
 *
 * Sin JavaScript, el botón "Filtrar" de `PeriodFilter` envía el formulario.
 */
export function AgencySelect({
  agencies,
  value,
}: {
  agencies: Array<{ id: string; name: string; active: boolean }>;
  /** Agencia aplicada (la de la URL, si existe). */
  value?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const applied = value ?? "";
  const [selected, setSelected] = useState(applied);
  const [lastApplied, setLastApplied] = useState(applied);
  const [requested, setRequested] = useState<string | null>(null);
  const fromKeyboard = useRef(false);

  // Llegó otra agencia aplicada: la lista la muestra y, si era la pedida, la
  // espera termina. Se ajusta al renderizar, no en un efecto, como `GetForm`.
  if (applied !== lastApplied) {
    setLastApplied(applied);
    if (requested === null || requested === applied) {
      setSelected(applied);
      setRequested(null);
    }
  }
  const pending = requested !== null;

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setRequested(null), MAX_PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  function apply(select: HTMLSelectElement, next: string) {
    if (next === (requested ?? applied)) return;
    const params = new URLSearchParams();
    if (select.form) {
      new FormData(select.form).forEach((field, name) => {
        if (typeof field === "string" && field !== "") params.append(name, field);
      });
    }
    params.delete("agency");
    if (next) params.set("agency", next);
    const query = params.toString();
    setRequested(next);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function onKeyDown(event: KeyboardEvent<HTMLSelectElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      apply(event.currentTarget, selected);
      return;
    }
    const typesLetter = event.key.length === 1 && event.key !== " ";
    fromKeyboard.current = (KEYBOARD_STEP_KEYS.has(event.key) || typesLetter) && !event.altKey;
  }

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.currentTarget.value;
    setSelected(next);
    const keyboardStep = fromKeyboard.current;
    fromKeyboard.current = false;
    if (!keyboardStep) apply(event.currentTarget, next);
  }

  return (
    <>
      <label className={`${PANEL_LABEL_CLASS} min-w-0 flex-1 basis-40 sm:flex-none`}>
        <span className="flex items-center justify-between gap-2">
          Agencia
          {pending ? (
            <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-sm font-normal text-tinta-suave">
              <IconSpinner className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
              Buscando…
            </span>
          ) : null}
        </span>
        <span className="relative block">
          <select
            name="agency"
            value={selected}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPointerDown={() => {
              fromKeyboard.current = false;
            }}
            onBlur={(event) => apply(event.currentTarget, selected)}
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
      {/* Fuera de la etiqueta, para no entrar en el nombre de la lista; siempre
          montada: una región viva que aparece junto con su texto no se anuncia
          de forma fiable. */}
      <span role="status" className="sr-only">
        {pending ? "Buscando…" : ""}
      </span>
    </>
  );
}
