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

**T5. Pasajero público.** `src/app/(portada)/page.tsx`, `portada-search.tsx`, `portada-sections.tsx`, `loading.tsx` (la portada vive en el grupo de rutas `(portada)`, que no cambia la URL `/`), `src/components/search-card.tsx`, `departure-board.tsx`, `departure-row.tsx`, `agency-badge.tsx`, `src/app/ingresar/**`, `src/app/registro/**`, `src/app/lista-espera/**` (con su `loading.tsx`). Propagación de `next` entre ingresar y registro. Auditoría: `audit-pasajero-publico.json`.

**T6. Pasajero autenticado.** `src/app/mi/**` salvo `layout.tsx` (cada ruta con `loading.tsx`), `src/components/ticket-card.tsx`, `notice-card.tsx`, `sticky-actions.tsx`, `details-view.tsx`, `src/lib/labels.ts` (solo agregar `PASSENGER_STATUS_LABELS` y `passengerStatusLabel` con tests en `tests/unit/lib/labels.test.ts`). Auditoría: `audit-pasajero-mi.json`.

**T7. Operador: operación.** `src/app/panel/(tablero)/page.tsx`, `loading.tsx` (el tablero vive en el grupo de rutas `(tablero)`, que no cambia la URL `/panel`), `_dashboard/**`, `pasajeros/**`, `taquilla/**`, `ingresar/**`. Corregir el 500 de `?salida=` no UUID en `/panel/pasajeros`. Auditoría: `audit-operador-operacion.json`.

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

## Resultado

Cierre: 2026-10-01. La rama `feat/brand-redesign` suma 8 commits sobre `feat/operator-panel` (367 archivos, +37 554 / −7 140 líneas en total). Sin cambios de esquema ni de migraciones.

### Commits de la rama

```
5b4d8ee fix: address the sixth quality round with row-locked payments, quiet skeleton controls and unified tabs
9313134 fix: address the fifth quality round with late-departure state, arrow routes and quiet worker logs
e0d2082 fix: address the fourth quality round with urgent-first home, local-currency cash amounts and richer messages
d1d4920 fix: address the third quality round with payment deadlines, scroll hints and clearer cash flow
44e5fdf fix: address the second quality round with page bands, info tone and full-screen boarding verdicts
2ab9f16 fix: address the first quality round across passenger, operator and admin screens
2d11726 chore: add a dev skeleton gallery, neutral panel loading, plain notices and mock images
82239bc feat: rebrand the three interfaces with the official logo, purple palette and skeletons
```

### Lo que hizo cada etapa

- **A. Fundación (T1), B. Kit y estructura (T2–T4) y C. Pantallas (T5–T9)**, juntas en `82239bc` (246 archivos): paleta derivada del morado `#601DBF` con acento sol `#FFC629`, neutros teñidos y cuatro tonos semánticos; Atkinson Hyperlegible Next en lugar de Rubik; logo vectorizado, isotipo e iconos de la app en `public/brand/` y `src/app/`; componentes `Logo`, `Isotipo`, `LogoLockup` y `Skeleton`; kit compartido (botones por tamaño, campos, `Alert`, `ConfirmDialog`, `Stepper`, `SubmitButton`, `FileField`, insignias unificadas); estructura de las tres interfaces con el logo (`AppHeader`, `BottomNav`, `PanelNav` con variantes de agencia y terminal, pie del panel); ticket PDF con la marca; pantallas rediseñadas del pasajero, del operador y del admin, con un `loading.tsx` por cada ruta con datos; páginas de error y 404 de marca. En esta etapa la portada pasó al grupo de rutas `(portada)` y el tablero del operador al grupo `(tablero)`, sin cambiar sus URL.
- **D. Compuerta (T10)**: en verde al cerrar la etapa C y después de cada ronda de calidad (ver abajo).
- **Preparación de la etapa E**, en `2d11726`: galería de skeletons en `/dev/esqueletos` (solo con `pnpm dev`, 404 en producción), carga neutra del panel, avisos en lenguaje llano y las imágenes de demostración de comprobantes y cédulas que escribe `pnpm mock` (`prisma/mock-assets/`).
- **E. Ciclos de calidad**, seis rondas (`2ab9f16` a `5b4d8ee`): capturas de Playwright a 375 y 1280 px de las pantallas de los tres roles y de los skeletons, revisores por lente (usabilidad para novatos, consistencia con la spec, accesibilidad, regresiones y contratos), verificación de cada hallazgo, un subagente de corrección por dueño de archivos y compuerta al final de cada ronda. Cambios de fondo que salieron de las rondas: el paso de salidas del asistente agrupado por día (r1); bandas de página del pasajero, foco que no queda bajo las barras fijas, taquilla usable en el teléfono y veredicto de abordaje a pantalla completa (r2); plazos de pago que respetan la hora de salida y cobros que no se repiten sobre una reserva pagada (r3); Inicio que pone primero el viaje más urgente y cobro en efectivo con el monto en la moneda elegida (r4); estado «Atrasado» en la flota y rutas «origen → destino» en todas partes (r5); bloqueo de la fila de la reserva en cobros y revisión de comprobantes, con pruebas de concurrencia, y controles quietos en los skeletons (r6).
- **F. Cierre**: este resultado, `README.md` (lista completa de módulos, identidad visual, galería de skeletons, imágenes del mock y base de pruebas en tmpfs), la limpieza de alias de tokens sin uso (spec 3.6: alias de `globals.css`, variante de botón `ruta`, variante `verde` de `SearchCard`, `DepartureRowSkeleton`, `SkeletonField` y nueve iconos sin uso) y `CLAUDE.md` reescrito cerca de 200 líneas, con lo retirado en `CLAUDE.archive.md`. Quedan a cargo del orquestador la memoria del proyecto y el commit de cierre.

### Rondas de calidad

Columnas tal como las registra el campo `counts` de cada resultado: «brutos» son los hallazgos que entregaron los revisores; «a verificar» es la lista tras unir duplicados con los pendientes arrastrados de la ronda anterior (por eso puede superar a los brutos); «confirmados» son los que pasaron la verificación, separados en graves, medios y menores. «Corregidos» y «aplazados» son las entradas que reportaron los subagentes de corrección.

| Ronda | Commit | Brutos | A verificar | Confirmados | Graves | Medios | Menores | Corregidos | Aplazados |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `2ab9f16` | 119 | 127 | 124 | 3 | 44 | 77 | 109 | 36 |
| 2 | `44e5fdf` | 105 | 126 | 121 | 4 | 37 | 80 | 108 | 33 |
| 3 | `d1d4920` | 94 | 107 | 106 | 1 | 28 | 77 | 91 | 24 |
| 4 | `e0d2082` | 80 | 91 | 88 | 2 | 23 | 63 | 72 | 22 |
| 5 | `9313134` | 69 | 79 | 78 | 0 | 16 | 62 | 64 | 19 |
| 6 | `5b4d8ee` | 77 | 90 | 90 | 0 | 19 | 71 | 80 | 20 |

Graves por ronda: r1, desbordamiento horizontal del tablero y de Pasajeros y pagos a 375 px (dos hallazgos) y un paso de salidas de unas 85 tarjetas sin agrupar; r2, botón «Continuar» de la taquilla tapado y desbordado en el teléfono (dos hallazgos), aviso de condiciones oculto bajo la barra fija, y una bandeja de mensajes de demostración que mostraba mensajes de otras personas; r3, plazos de pago que ignoraban la hora de salida; r4, viaje urgente relegado a un enlace pequeño en Inicio y cobro en bolívares o pesos sin el monto a pedir. Las rondas 5 y 6 cerraron sin graves, que es el criterio de salida de la etapa E (dos rondas seguidas sin graves).

Compuerta tras cada ronda (typecheck y lint siempre limpios):

| Ronda | Unitarios | Integración | Nota |
|---|---|---|---|
| Línea base | 341 | 171 | Antes de empezar |
| 1 | 567 (51 archivos) | 171 (18 archivos) | La integración falló entera hasta correr `pnpm db:test:deploy`: la base de test vive en tmpfs y se había borrado al reiniciar Docker. Sin cambio de código |
| 2 | 611 (56) | 172 (18) | Al primer intento |
| 3 | 653 (59) | 170 (18) | Al primer intento |
| 4 | 699 (62) | 185 (19) | Al primer intento |
| 5 | 724 (63) | 186 (19) | Un test nuevo del barrido de 24 h estaba mal planteado (creaba la reserva abonada con un método físico, que nace en `PAGO_EN_SITIO`); se corrigió el test, no el código |
| 6 | 748 (64) | 193 (20) | Al primer intento |

`pnpm build` no se corrió en las compuertas de ronda, porque había un servidor de desarrollo activo.

### Estado final de la compuerta

Corrida final sobre el árbol de cierre (2026-10-01, sin servidor de desarrollo activo):

| Paso | Resultado |
|---|---|
| `pnpm typecheck` | sin errores |
| `pnpm lint` | sin errores ni advertencias |
| `pnpm test` | 64 archivos, 747 tests en verde (la línea base era 341) |
| `pnpm test:integration` | 20 archivos, 193 tests en verde (la línea base era 171) |
| `pnpm build` | compilado sin errores, 39 páginas generadas; única advertencia: falta `metadataBase` para las URL absolutas de Open Graph, que se fija cuando haya dominio público |

Entorno de demostración: `.env` apunta a la base nueva `ticketruta_demo` (semilla y mock actuales, salidas desde hoy sin solapes). La base original `ticketruta` quedó intacta; la copia del `.env` anterior está en `.superpowers/sdd/brand-redesign/db-backup/env-before-demo-db.bak`.

### Pendientes

Deuda técnica conocida, ninguna grave:

1. **Carrera entre el barrido de 12 h y un cobro simultáneo.** Los cobros y los comprobantes ya bloquean la fila de la reserva, pero `transitionReservation` (`src/modules/booking`) no la bloquea: el barrido que libera puede escribir `LIBERADA` sobre una reserva que acaba de quedar `PAGADA`. Arreglo sugerido: `lockReservation`, o un `updateMany` condicionado al estado de origen que falle con 0 filas.
2. **Texto de una salida atrasada sin embarque abierto.** `src/app/panel/_shared/departure-notice.ts` dice «Embarque abierto · debía salir…» para toda salida `MANIFIESTO_CERRADO`, aunque nadie haya iniciado el embarque; debería decir «Debía salir…». Además, `isOverdue` de `src/app/panel/_dashboard/attention.ts` todavía considera solo `PROGRAMADA` y debe alinearse con `isOverdueDeparture`.
3. **Skeletons que no coinciden del todo con la página.** Los botones de `_dashboard/skeletons.tsx`, `pasajeros/skeletons.tsx` y `salidas/departures-skeleton.tsx` ya son `SkeletonButton`. Quedan con aspecto vivo el enlace de volver de `SkeletonPageHeader` (`_shared/skeletons.tsx`, texto morado sin `.esqueleto`) y el de `mi/reservas/[code]/loading.tsx` (`buttonClass("fantasma")`), y los campos blancos de `SearchCardPreview`; las siluetas de `StatCard` (`_shared/skeletons.tsx` y `_dashboard/skeletons.tsx`) pintan una franja gris (`h-1 bg-borde`) que la tarjeta neutra real no tiene.
4. **Consultas redundantes.** `src/app/panel/admin/tablero/period-data.tsx` repite la lectura de llegadas y el orden que ya hace `listTerminalTrips`; el conteo por agencia de `src/app/panel/admin/agencias/agencies-list.tsx` debería vivir en un módulo.
5. **Filtro por salida en «Por revisar».** Para que la alerta de una salida enlace a `?vista=por-revisar&salida=` falta el filtro en `listPendingProofQueue` y su indicador en la pestaña.
6. **Detalles de interfaz.** Pestañas en tres filas en Mensajes del admin a 375 px; un `div` sobrante alrededor de `GetForm` en `pasajeros/page.tsx`; un comentario obsoleto en `_shared/route-text.ts`; el desempate de `agencyFleetStatus` se resolvió en `FleetBlock` y no en el módulo.
7. **Documentación.** Resuelto en el cierre: `CLAUDE.md` ya recoge el lenguaje visual nuevo, que `listTerminalTrips` ordena por llegada, `isOverdueDeparture` y el bloqueo de la fila de la reserva en los cobros. Queda `docs/whatsapp-templates.md`, que `src/modules/messaging/templates.ts` cita y no existe.
8. **Demo.** Para ver en la demo los cambios de datos de la ronda 6 hay que correr `pnpm mock --reset`. Las reservas y comprobantes del pasajero pueden caer de noche a propósito, porque se puede reservar en línea a cualquier hora.

Decisiones para el operador:

1. **`DepartureRow`** ya no se pinta en ninguna pantalla (solo se usa su tipo `DepartureRowData`; su skeleton se eliminó en el cierre): eliminar el componente y mover el tipo, o conservarlo.
2. **Abono parcial con pago en sitio.** Una reserva `PAGO_EN_SITIO` sigue en ese estado tras un abono parcial y no pasa a `ABONADA`, como dice la spec. Mostrarla como abonada sería un cambio de diseño de la máquina de estados.
3. **Periodo por defecto.** Los reportes de agencia usan «Hoy» (día de calendario de Caracas) y el tablero del admin «Últimas 24 horas» (ventana móvil). Son ventanas distintas a propósito; falta confirmar que se quieren así.
4. **Búsqueda de mensajes del admin** por `q=` con cédula o nombre en la URL, igual que Usuarios y auditada en cada consulta. Se aceptó así; la alternativa es `?cuenta=<id>`.
5. **Paso previo a la integración.** Agregar `pnpm db:test:deploy` como `pretest:integration` para que un reinicio de Docker no deje la suite en rojo, o dejarlo solo documentado en `README.md`, como está ahora.
