# Plan — Rediseño de marca, interfaz y experiencia (ronda 5)

Fecha: 2026-09-30. Rama: `feat/brand-redesign`, creada desde `feat/operator-panel` (cb0518c). Metodología: Liminal Flows. El operador aprobó la ejecución autónoma con iteraciones y ciclos de revisión.

- Especificación: `docs/superpowers/specs/2026-09-30-brand-design-system.md` (fuente de verdad visual y de experiencia).
- Auditoría previa por área: `.superpowers/sdd/brand-redesign/audit-*.json` (ignorada por git). Cada subagente lee la de su área antes de empezar.
- Recursos del logo ya generados (vectorizados con potrace desde la imagen del operador): carpeta del scratchpad de la sesión, `vec/out/` (`logo-morado.svg`, `logo-blanco.svg`, `isotipo-morado.svg`, `icon.svg`, `apple-icon.png`, `icon-192.png`, `icon-512.png`, `logo-morado-1200.png`, `logo-blanco-1200.png`).

## Línea base (antes de tocar nada)

typecheck y lint limpios, 341 unitarios y 171 de integración en verde (2026-09-30 09:05).

## Objetivo

Paleta de marca derivada del morado del logo con secundarios y semánticos, estilo profesional y muy fácil para personas sin experiencia con sistemas, en las tres interfaces; logo en los sitios estratégicos; skeletons de carga en todas las rutas con datos; sin sobrecarga de información. Sin cambios de reglas de negocio ni de esquema.

## Reglas para todos los subagentes

1. Solo editas los archivos de tu tarea. Si necesitas cambiar un archivo ajeno, no lo tocas: lo construyes local en tu carpeta o lo reportas como pendiente. Excepción: agregar iconos al final de `src/components/icons.tsx` (releer justo antes de editar).
2. No haces commits, no levantas `pnpm dev`, no corres `pnpm build` ni `pnpm test:integration` (salvo T10). Otros subagentes trabajan en paralelo sobre el mismo árbol.
3. Verificación de tu tarea: `pnpm typecheck` (ignora errores en archivos que no son tuyos y repórtalos), `pnpm exec eslint <tus archivos>`, `pnpm test` (unitarios).
4. Contratos que no se rompen: parámetros de URL de las acciones (`?ok=`, `?error=`, `registrar=`, `vista=`, `crear=`, `editar=`, `reserva=`, `comprobante=`, `salida=`), orden y textos de `OPERATOR_NAV`, textos fijados por tests (lista en la sección 8 de la spec y en `audit-tests-y-base.json`, entradas `TEST:`).
5. Ningún componente nuevo usa hex, `bg-[var(--...)]` ni colores fijos de Tailwind. Solo utilidades de tokens.
6. Comentarios y textos en español con acentos; identificadores en inglés.
7. Reporte final compacto: qué hiciste, decisiones, archivos, resultado de verificación (líneas relevantes), pendientes y desvíos.

## Tareas

### Etapa A — Fundación (secuencial)

**T1. Tokens, tipografía, metadatos, recursos del logo, `Logo` y `Skeleton`.**
Archivos: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/manifest.ts`, `src/app/opengraph-image.png`, `src/app/favicon.ico` (eliminar), `public/brand/*` (nuevo), `public/{file,globe,next,vercel,window}.svg` (eliminar), `src/components/logo.tsx`, `src/components/skeleton.tsx`, `src/lib/brand.ts`, `tests/unit/lib/brand.test.ts`, `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/global-error.tsx`.
- Paleta completa de la spec §3 en `:root` y `@theme inline` (escala `marca-50…950`, `sol`, neutros, semánticos, `info`), alias de compatibilidad §3.6, radios, sombras (`--shadow-1`, `--shadow-2` para las utilidades `shadow-1`/`shadow-2`), `.tabular`, `.foco`, `.foco-sobre-marca`, `.esqueleto` con brillo y regla global de movimiento reducido. `body` con `bg-lienzo text-tinta`.
- Atkinson Hyperlegible Next en `layout.tsx`; `metadata` con `title.template: "%s · TicketRuta"`, descripción llana, `applicationName`; `themeColor: "#601DBF"`.
- Colores de agencia de la spec §3.5 y test que verifique contraste ≥ 4.5:1 con blanco para cada uno.
- Páginas de error y 404 de marca (spec §6.6).
Verificación: typecheck, lint, unitarios (brand con contraste).

### Etapa B — Kit y estructura (en paralelo)

**T2. Kit de componentes compartidos.**
Archivos: `src/components/ui.tsx`, `panel-ui.tsx`, `submit-button.tsx`, `alert.tsx`, `confirm-dialog.tsx`, `file-field.tsx`, `stepper.tsx`, `panel-feedback.tsx`, `side-panel.tsx`, `close-on-escape.tsx`, `clickable-row.tsx`, `icons.tsx`, y tests unitarios de funciones puras nuevas en `tests/unit/components/`.
- Todo lo de la spec §6.1–6.4 que no es estructura: botones con tamaños, `Field`/`Select`/`FileField`, `Alert`, `StatusBadge`/`Pill` unificados, `EmptyState` con icono, `ConfirmDialog`, `ProgressBar`, `Stepper`, `SubmitButton`, `PanelFeedback` con limpieza de parámetros, `SidePanel` con botón "Cerrar" de 44 px y foco visible.
- Migrar `panel-ui.tsx` de `bg-[var(--color-*)]` a utilidades.
- Iconos nuevos que la auditoría pide (flecha atrás, información, búsqueda, subir, cámara, escudo, usuario, menú, teléfono, alerta circular, verificación circular, imprimir, descargar, ojo, candado, tarjeta, puerta de salida, chevron izquierdo).
Verificación: typecheck, lint, unitarios.

**T3. Estructura de las tres interfaces (shells).**
Archivos: `src/components/app-header.tsx`, `bottom-nav.tsx`, `panel-nav.tsx`, `src/lib/panel-nav.ts`, `tests/unit/panel/nav.test.ts`, `src/app/mi/layout.tsx`, `src/app/panel/layout.tsx`, `src/app/panel/admin/layout.tsx`, `src/components/panel-footer.tsx` (nuevo).
- `AppHeader` y `BottomNav` según spec §6.4 y §2.2; `/mi/layout.tsx` con el contador de avisos dentro de `<Suspense>`.
- `PanelNav` con variantes `agencia` y `terminal`, logo en la banda superior, `ADMIN_NAV` en `lib/panel-nav.ts` con tests; `panel/layout.tsx` con la insignia de comprobantes en `<Suspense>`; `admin/layout.tsx` usa `PanelNav variant="terminal"` (se elimina el menú superior de texto).
- Pie del panel con la nota única de "Horas en formato de 24 horas, hora de Caracas".
Verificación: typecheck, lint, unitarios (nav).

**T4. Ticket PDF con la marca.**
Archivos: `src/modules/tickets/pdf.ts` y sus tests.
- Logo morado (PNG embebido con pdf-lib) en la cabecera, acento morado `#601DBF` en lugar del azul, sin tocar datos ni la firma del QR.
Verificación: typecheck, lint, unitarios de tickets.

### Etapa C — Pantallas (en paralelo, cada una con sus `loading.tsx`)

**T5. Pasajero público.** `src/app/page.tsx`, `portada-search.tsx`, `loading.tsx`, `src/components/search-card.tsx`, `departure-board.tsx`, `departure-row.tsx`, `agency-badge.tsx`, `src/app/ingresar/**`, `src/app/registro/**`, `src/app/lista-espera/**` (con su `loading.tsx`). Propagación de `next` entre ingresar y registro. Auditoría: `audit-pasajero-publico.json`.

**T6. Pasajero autenticado.** `src/app/mi/**` salvo `layout.tsx` (cada ruta con `loading.tsx`), `src/components/ticket-card.tsx`, `notice-card.tsx`, `sticky-actions.tsx`, `details-view.tsx`, `src/lib/labels.ts` (solo agregar `PASSENGER_STATUS_LABELS` y `passengerStatusLabel` con tests en `tests/unit/lib/labels.test.ts`). Auditoría: `audit-pasajero-mi.json`.

**T7. Operador: operación.** `src/app/panel/page.tsx`, `loading.tsx`, `_dashboard/**`, `pasajeros/**`, `taquilla/**`, `ingresar/**`. Corregir el 500 de `?salida=` no UUID en `/panel/pasajeros`. Auditoría: `audit-operador-operacion.json`.

**T8. Operador: flota, salidas y reportes.** `src/app/panel/salidas/**`, `abordaje/**`, `flota/**`, `reportes/**`, `_forms/**`, `_shared/**` (cada ruta con `loading.tsx`). `abordaje/actions.ts` pasa por `userFacingMessage`. Auditoría: `audit-operador-flota.json`.

**T9. Administrador del terminal.** `src/app/panel/admin/**` salvo `layout.tsx` (cada ruta con `loading.tsx`). Migrar a las piezas de `panel-ui.tsx`, `ConfirmDialog` para desactivar agencia y cambiar tasas, `searchParams` con `safeParse`, mensajes con `labels.ts`. Auditoría: `audit-admin.json`.

### Etapa D — Compuerta

**T10.** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration` y `pnpm build` (sin dev server activo). Corrige lo que falle con el cambio mínimo y lo reporta.

### Etapa E — Ciclos de calidad (iterativos, hasta dos rondas seguidas sin hallazgos graves)

- Revisión visual con capturas de Playwright a 375 y 1280 px de cada pantalla de los tres roles (sesiones creadas por script, sin escribir contraseñas), incluida una galería de skeletons.
- Revisores con lentes distintas: usabilidad para novatos y sobrecarga, consistencia visual con la spec, accesibilidad, regresiones de código y contratos.
- Cada hallazgo confirmado va a un subagente de corrección con dueño de archivo; compuerta T10 después de cada ronda.

### Etapa F — Cierre

Eliminar alias de tokens sin uso, actualizar `CLAUDE.md` (glosario de componentes nuevos, lenguaje visual unificado), `README.md` (módulos que faltan), memoria del proyecto, y commits por etapa.

## Tests propuestos

- Unitarios nuevos: contraste de `AGENCY_COLORS`; `ADMIN_NAV` e `isActivePanelPath` para rutas del admin; `passengerStatusLabel` para los nueve estados; funciones puras nuevas del kit (clases de botón por tamaño y variante, estado del `Stepper`).
- Existentes que deben seguir en verde sin cambios: todos los unitarios y de integración (textos, contratos de URL, frases de actividad).
- Verificación visual: capturas de cada pantalla y cada skeleton, revisadas contra la spec.
- Criterio de terminado: compuerta T10 en verde, dos rondas de revisión sin hallazgos graves, capturas finales de los tres roles.
