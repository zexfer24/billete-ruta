# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Metodología de trabajo

Este proyecto se rige por la metodología Liminal Flows (`/liminalwork`). Todo cambio de diseño, lógica o código pasa por: contexto → Plan Mode → explicación al operador → tests propuestos → descomposición en tareas → aprobación → subagentes (uno por tarea) → reporte al orquestador → validación → tests en verde. El orquestador no implementa; coordina, delega y valida.

Idioma: comentarios, textos de interfaz y comunicación en español con acentos correctos. Identificadores de código, nombres de archivo y mensajes de commit en inglés.

Este archivo se mantiene cerca de 200 líneas, con una línea por pieza en los glosarios. Lo retirado va a `CLAUDE.archive.md` (fuera del contexto automático; se lee a mano).

## Documentos rectores

- `docs/superpowers/specs/2026-09-10-ticketruta-design.md` — especificación funcional aprobada, revisión 2. Fuente de verdad para modelo de datos, estados, montos, jobs, reportes y privacidad.
- `docs/superpowers/specs/2026-09-30-brand-design-system.md` — sistema de diseño. Fuente de verdad visual: logo, paleta, tipografía, componentes, skeletons, experiencia por rol y glosario de textos de interfaz.
- `docs/superpowers/plans/2026-09-10-ticketruta-mvp.md` y `docs/superpowers/plans/2026-09-30-brand-redesign.md` — planes del MVP y del rediseño de marca.
- `Documentación/*.pdf` — documentos de negocio originales (glosario abajo).

## Qué es TicketRuta

Sistema para un **terminal de pasajeros terrestre** regulado por el Estado. El terminal aloja varias **agencias de viaje** que venden pasajes en sus propias rutas, con sus propios vehículos y choferes. Sustituye el registro en papel y el cobro informal por identidad verificada, pago con comprobante, ticket digital con QR, control de embarque y desembarque, y estadística en tiempo real.

Contexto geográfico: Venezuela y corredor hacia Colombia. Monedas: USD, VES, COP, USDT.

## Los tres actores

- **Pasajero**: cuenta propia con cédula como credencial de acceso. Aporta teléfono y año de nacimiento para reservar, y foto de cédula más permisos de viaje opcionales para concretar la venta. Puede abonar en partes.
- **Operador**: personal de una agencia. Confirma pagos, gestiona vehículos, choferes, salidas y pasajeros, y ve su recaudación por ruta. **Solo ve datos de su agencia.**
- **Admin**: administrador del terminal. Ve la tasa de salida recaudada en tiempo real, los recorridos, los usuarios nuevos y recurrentes, la base de datos de usuarios y los movimientos de todas las agencias. Supervisa, no vende.

## Reglas de negocio que no se negocian

- **Aislamiento por agencia**: toda consulta o acción de un operador filtra por el `agencyId` de su sesión. Nunca se acepta un `agencyId` que venga de un formulario.
- **Tasa de salida**: el terminal cobra una tasa por pasajero, separada de la tarifa de la agencia. Se guardan ambos montos por separado porque tienen destinatarios distintos.
- **Abonos parciales**: una reserva acumula pagos. El ticket se emite solo cuando el saldo llega a cero.
- **Cupos sin sobreventa**: la creación de reserva bloquea la fila de la salida con `SELECT ... FOR UPDATE` y recalcula el disponible dentro de la transacción. Los cobros también bloquean la fila de la reserva.
- **Liberación de cupo**: reserva sin ningún pago a las 2 horas de creada; reserva de pago en sitio no reconfirmada 12 horas antes de la salida. Una reserva pagada nunca se libera automáticamente.
- **Horas siempre en formato de 24 horas**, en hora de Caracas, con almacenamiento en UTC.
- **Sin borrado físico** de reservas, pasajeros, comprobantes, mensajes, viajes ni auditoría.
- **Auditoría de solo inserción**, garantizada por un disparador de base de datos.
- **Pagos en otra moneda**: se convierten con la tasa congelada de la reserva si la moneda coincide, y con la tasa vigente de esa moneda si no. USD y USDT van 1:1.
- **Venta en taquilla**: cuenta creada por el operador sin contraseña y activable desde `/registro` con teléfono y año de nacimiento; foto de cédula obligatoria; cobro completo en el acto, atómico.
- La base de datos de usuarios es información sensible: solo el admin la consulta y cada consulta queda auditada.

## Estados de reserva

`PENDIENTE_PAGO` → `EN_VALIDACION` → `ABONADA` o `PAGADA`. `PENDIENTE_PAGO` también pasa directo a `ABONADA` o `PAGADA` con un cobro en efectivo del panel. En paralelo `PAGO_EN_SITIO` → `PAGADA` o `LIBERADA`. Estados finales: `LIBERADA`, `CANCELADA`, `ABORDADA`, `NO_SHOW`. Ocupan cupo todos menos los tres últimos de esa lista final. La tabla completa de transiciones está en la sección 8 de la spec y codificada en `src/modules/booking/state-machine.ts`.

## Stack y decisiones fijas

- Next.js 15 (App Router, TypeScript estricto) como monolito, con proceso `worker` aparte para jobs con pg-boss sobre PostgreSQL 16. Prisma. Tailwind 4. Vitest y Playwright. pnpm.
- WhatsApp detrás de la interfaz `WhatsAppProvider`. El MVP usa solo la implementación falsa, con bandeja de mensajes visible en el panel del admin. La Meta Cloud API queda para después del MVP; las plantillas viven en `src/modules/messaging/templates.ts` (el `docs/whatsapp-templates.md` que ese archivo cita aún no existe).
- Entrega inmediata: **MVP en localhost**, no Docker de la aplicación. Solo PostgreSQL en contenedor, puerto 5434 para desarrollo y 5435 para test. Los puertos 5432 y 5433 están ocupados en esta máquina.
- Módulos en `src/modules/*`, cada uno exporta su API pública desde `index.ts`. Nadie importa internos de otro módulo. Alias `@/` a `src/`.
- Dinero siempre con `Prisma.Decimal`, nunca `number`.
- `next.config.ts` sube `experimental.serverActions.bodySizeLimit` a `"12mb"` porque la taquilla y los documentos suben imágenes de hasta 5 MB.

## Lenguaje visual

- **Un solo lenguaje para las tres interfaces** (pasajero, agencia y terminal), definido en la spec 2026-09-30. Los tokens viven en `:root` de `src/app/globals.css` y se usan como utilidades de Tailwind (`bg-marca-600`, `text-tinta-suave`, `border-borde`): nunca hex, `bg-[var(--...)]` ni colores fijos de Tailwind.
- Paleta: escala `marca-50…950` (marca `#601DBF` = `marca-600`), `sol`/`sol-suave`/`sol-oscuro` (amarillo, relleno solo sobre morado), neutros `tinta`/`tinta-suave`/`tinta-tenue`, `borde`/`borde-control`, `lienzo`/`superficie`, y semánticos `exito`/`alerta`/`peligro`/`info` con su variante `-suave`. Radios `rounded-tarjeta`/`rounded-control`/`rounded-pastilla`, sombras `shadow-1`/`shadow-2`, foco `.foco`/`.foco-sobre-marca`, cifras `.tabular`, carga `.esqueleto`.
- Fuente única **Atkinson Hyperlegible Next** (`next/font/google`, variable `--font-atkinson`, en `src/app/layout.tsx`). Ya no existen Rubik ni los tokens `--acento`, `--cta`, `--ruta` ni los demás alias viejos; la variante de botón `acento` es el relleno `sol`, no un token.
- Logo en `public/brand/` (`logo-morado.svg`, `logo-blanco.svg`, `isotipo-*.svg`, PNG para el PDF e iconos de la app), servido por `Logo`, `Isotipo` y `LogoLockup` de `src/components/logo.tsx`. Iconos y metadatos: `src/app/icon.svg`, `apple-icon.png`, `opengraph-image.png`, `manifest.ts`.
- Colores de agencia: seis bloques con texto blanco (spec 3.5), por `agencyColor(agencyId)`. Estados: color + icono + texto, nunca solo color. Textos de interfaz según el glosario de la spec, sección 8.
- La portada (`/`) muestra las próximas salidas sin sesión, por ser datos de catálogo (ruta, hora, precio, cupos), no personales.

## Estructura de rutas

- `src/app/(portada)/` — la portada `/` en grupo propio, para que su `loading.tsx` no afecte a otras rutas. `src/app/panel/(tablero)/` — el tablero de la agencia en `/panel`, mismo motivo.
- `src/app/_publico/` — piezas privadas de las pantallas públicas (ingresar, registro, lista de espera): `PublicShell`, enlaces con `safeNext`, campo de contraseña, errores de formulario, foco al primer error y `form-skeleton`.
- `src/app/mi/*` — app del pasajero (con `_components/`); `src/app/panel/*` — agencia, con `_dashboard/`, `_forms/` y `_shared/`; `src/app/panel/admin/*` — terminal, con `admin/_shared/`.
- Cada ruta con datos tiene su `loading.tsx` que reproduce la silueta real con las piezas de `skeleton.tsx` y los kits `mi/_components/skeletons.tsx`, `panel/_shared/skeletons.tsx`, `panel/_dashboard/skeletons.tsx` y `panel/admin/_shared/skeletons.tsx`. Los layouts ponen sus consultas lentas en `<Suspense>`.
- Errores y 404: `src/app/error.tsx`, `global-error.tsx` y `not-found.tsx`, más versiones propias en `mi/error.tsx`, `panel/error.tsx`, `panel/not-found.tsx`, `lista-espera/not-found.tsx` y `mi/reservas/[code]/not-found.tsx`.
- `src/app/dev/esqueletos/` — galería de skeletons, **solo en desarrollo** (`notFound()` fuera de `NODE_ENV=development`).
- Descargas CSV: `panel/pasajeros/exportar`, `panel/reportes/descargar` y `panel/admin/movimientos/descargar` (rutas `route.ts`).
- Las rutas viejas `/panel/pagos`, `/panel/vehiculos`, `/panel/choferes`, `/panel/recaudacion` y `/panel/movimientos` redirigen a sus páginas nuevas con `legacyPanelRedirect`.

## Comandos

```
pnpm db:up / pnpm db:test:up     PostgreSQL en Docker (5434 y 5435)
pnpm db:deploy                   aplicar migraciones (prisma migrate deploy)
pnpm db:test:deploy              migraciones en la base de test (tmpfs: rehacer tras reiniciar Docker)
pnpm seed                        datos de demostración con credenciales impresas
pnpm mock                        volumen realista sobre la semilla (--reset lo regenera)
pnpm dev                         http://localhost:3000
pnpm worker:dev                  jobs programados, en otra terminal
pnpm typecheck / pnpm lint
pnpm test                        unitarios
pnpm test:integration            requiere la base de test levantada
pnpm test:e2e                    script definido, sin playwright.config ni pruebas e2e en el repo
pnpm test -- tests/unit/booking/state-machine.test.ts    un solo archivo
```

## Glosario de módulos

Cada carpeta de `src/modules/` expone su API pública en `index.ts`. Nadie importa internos de otro módulo. Detalle completo de `reports`, `notices` y `messaging` en `CLAUDE.archive.md`.

| Módulo | Responsabilidad | API principal |
|---|---|---|
| `accounts` | Cuentas de pasajero y sus documentos | `registerAccount` (`givenNames` y `surnames`; también activa una cuenta de taquilla), `loginAccount`, `uploadDocument`, `missingDocuments`, `createCounterAccount`, `createDocumentInTx` |
| `agencies` | Agencias, vehículos y choferes | `createAgencyWithOperator`, `listAgencies`, `createVehicle`, `listDrivers` (trae embarques y desembarques) |
| `audit` | Bitácora de solo inserción | `writeAudit` |
| `auth` | Dos ámbitos de sesión y matriz de permisos | `requirePanelUser`, `requirePassenger`, `requireAgencyScope`, `requireAgencyUser`, `panelHomeFor`, `can` (incluye `sales.counter`), `hashPassword`, `createPanelSession`/`createPassengerSession` (cookies `tr_panel`/`tr_pax`); la sesión se resuelve una vez por render con `cache` |
| `booking` | Reservas, cupos, estados y lista de espera | `createReservation`, `createReservationInTx`, `transitionReservation`, `getAvailability`, `processWaitlist`, `canTransition` |
| `catalog` | Rutas, salidas, tasas y precios | `listBookableDepartures`, `createDeparture`, `getManifest`, `computeAmounts`, `getCurrentDepartureTax`, `balanceUsd` |
| `counter` | Venta en la taquilla de la agencia | `lookupCounterHolder` (auditada), `listCounterOptions`, `quoteCounterSale`, `sellAtCounter` (cuenta, documentos, reserva y cobro en una transacción; emite el ticket) |
| `messaging` | Mensajes con proveedor intercambiable | `enqueueMessage`, `deliverPendingMessages`, `getWhatsAppProvider`, `renderPreview`, `renderStoredPreview`, `listMessagesForPhone`, `messageRoute` ("Caracas → Mérida"), `reminderRecommendations` |
| `notices` | Avisos derivados del estado del pasajero | `buildNotices` (pura; incluye `SALDO_PENDIENTE`), `listNoticesForAccount` |
| `payments` | Abonos, comprobantes y efectivo | `submitProof`, `approveProof`, `rejectProof`, `registerCashPayment`, `registerCashPaymentInTx` (bloquea la reserva), `ALREADY_PAID_CASH_MESSAGE`, `proofCoverage`, `getProofReview`, `countPendingProofs` |
| `reports` | Agregados de agencia y de terminal | `agencyDashboard`, `agencyFleetStatus`, `unitStateOf` (incluye `ATRASADO`), `isOverdueDeparture`, `listAgencyPassengers`, `listTerminalTrips` (por llegada), `listNewAccounts` y `getTripDetail` (auditadas), `describeActivity`, `listPendingProofQueue`, y más |
| `scheduler` | Ventanas y plazos | `dueForReminder24h`, `dueForRelease12h`, `dueForConfirmation2h`, `nextRetryDelayMinutes`, `paymentDeadline` y `cashCounterDeadline` (única fuente de la hora límite de pago para app, avisos y mensajes) |
| `tickets` | PDF con QR firmado | `issueTicket` (PDF con el logo `public/brand/logo-morado-1200.png`, degrada sin él), `signTicketCode`, `verifyTicketQr`, `renderQrDataUrl` |
| `trips` | Embarque, desembarque y abordaje | `startBoarding`, `registerDeparture`, `registerArrival`, `findForBoarding`, `confirmBoarding`, `availableTripActions` |

| Archivo de `src/lib/` | Para qué sirve |
|---|---|
| `prisma.ts` / `env.ts` | Cliente único de base de datos / configuración validada con zod |
| `decimal.ts` | `toDecimal`, `round2`, `formatMoney`, `formatUsdString`; el prefijo va pegado con `MONEY_SPACE` (U+00A0) para que un monto no se parta |
| `time.ts` | Hora de Caracas en 24 horas, duraciones, ventanas por hora, `formatRelativeDeparture`, periodos del tablero (`caracasPeriodRange`, `periodFromSlug`) |
| `identity.ts` | Cédulas, teléfonos, edad, enmascarado y `firstNamePart` |
| `storage.ts` | Archivos subidos, verificación por firma de bytes y `deleteUpload` |
| `brand.ts` | `agencyColor`, `agencyColorIndex`, `agencyInitials`, `AGENCY_COLORS` (paleta de la spec 3.5, contraste probado) |
| `labels.ts` | Etiquetas y tonos de estado; `StatusTone` incluye `info` (`EN_VALIDACION`); `passengerStatusLabel` y `PASSENGER_STATUS_LABELS` (lenguaje del pasajero); `UNIT_STATE_LABELS` con `ATRASADO` |
| `panel-nav.ts` | Menús `OPERATOR_NAV` y `ADMIN_NAV`, `panelNavHomeHref`, `panelHomeForPath`, `isActivePanelPath`, `parsePanelOrigin`, `legacyPanelRedirect` (puro) |
| `safe-next.ts` | `safeNext(value)`: ruta de retorno interna segura tras ingresar o registrarse |
| `reservations.ts` | `splitByDeparture(reservas, now)`: próximas y pasadas, para "Mis viajes" |

## Glosario de componentes (`src/components/`)

| Componente | Para qué sirve |
|---|---|
| `ui-classes.ts` | Clases puras y probadas: `cx`, `buttonClass`, `panelButtonClass`, `fieldControlClass`, `panelInputClass`, `pillClass`, tonos de alerta y progreso, `stepState`, `formatFileSize` |
| `ui.tsx` | Piezas base: `Card`, `Field`, `Select`, `FieldHint`, `FieldError`, `FieldErrorSlot`, `Pill`, `SectionTitle`, `EmptyState`, `ProgressBar`; reexporta `buttonClass` y `FileField` |
| `panel-ui.tsx` | Piezas del panel: `PanelPageHeader`, `StatCard`, `StatusBadge`, `PanelTabs`, `TableShell` (con `mobile`), `MobileCard`, `SectionCard`, `PANEL_TH_CLASS`/`PANEL_TD_CLASS`; reexporta clases de `ui-classes.ts` |
| `logo.tsx` | `Logo` (completo, mínimo 64 px), `Isotipo` y `LogoLockup`, en tono morado o blanco |
| `skeleton.tsx` | `Skeleton`, `SkeletonText`, `SkeletonCircle`, `SkeletonButton` (control quieto) y `SkeletonScreen` (anuncia la carga) |
| `submit-button.tsx` | `SubmitButton`: envío de formulario de servidor con `pendingLabel`, `aria-disabled` y sin doble envío |
| `alert.tsx` | `Alert`: aviso por tono (`exito`, `alerta`, `peligro`, `info`) con icono, título, texto y acción |
| `confirm-dialog.tsx` | `ConfirmDialog`: confirmación con `<dialog>` nativo, foco en "Cancelar" y no se cierra mientras la acción corre |
| `file-field.tsx` | `FileField`: subida con zona grande, cámara opcional, nombre, peso, vista previa y error propio |
| `stepper.tsx` | `Stepper`: pasos numerados con `aria-current="step"` (asistente de reserva y taquilla) |
| `panel-footer.tsx` | `PanelFooter`: pie del panel con la única nota de horas en 24 horas, hora de Caracas |
| `panel-nav.tsx` | `PanelNav` (variantes `agencia` y `terminal`; barra lateral desde `lg`, menú plegable por debajo), `PanelNavBadge`, `PanelSkipLink` |
| `panel-feedback.tsx` | `PanelFeedback`: `Alert` de `?error=` u `?ok=` en el panel |
| `clear-feedback-params.tsx` | `ClearFeedbackParams`: quita `?ok=` y `?error=` de la URL tras mostrarlos |
| `app-header.tsx` | `AppHeader`: banda morada de página del pasajero con `LogoLockup`, volver, título, subtítulo, `compact` y `titleOnlyAt`; `AppHeaderAction` con estado activo |
| `bottom-nav.tsx` | `BottomNav`: cuatro destinos fijos abajo (tarjeta centrada desde `md`), `BottomNavBadge` de avisos |
| `sticky-actions.tsx` | `StickyActions`: barra fija del asistente; oculta `BottomNav` y reserva su alto para que el foco no quede tapado |
| `side-panel.tsx` | `SidePanel`: panel lateral controlado por la URL, con foco atrapado y barra de acciones pegada al pie |
| `close-on-escape.tsx` | `CloseOnEscape`: foco, bloqueo del desplazamiento, cierre con Escape y retorno del foco |
| `clickable-row.tsx` | `ClickableRow`: fila de tabla que navega al hacer clic |
| `icons.tsx` | 47 iconos SVG propios de trazo (servidor) con `IconBase` interno; se agregan solo al final del archivo |
| `search-card.tsx` | `SearchCard`: origen y destino con intercambio; `SearchCardPreview` para skeletons |
| `agency-badge.tsx` | `AgencyBadge`: bloque de color con las iniciales de la agencia |
| `departure-format.ts` | Reglas puras de presentación de salidas: puestos, urgencia, día, duración y tarifa |
| `departure-row.tsx` | `DepartureRow` (ya no se pinta en ninguna pantalla) y el tipo `DepartureRowData`, que sí usan la portada, `/mi`, el asistente y la lista de espera |
| `departure-board.tsx` | `DepartureBoard`, `DepartureCard`, `DeparturePriceNote` y `DepartureBoardSkeleton` (portada y lista de espera) |
| `notice-card.tsx` | `NoticeCard`: tarjeta de aviso por nivel (`alerta`, `info`, `exito`) |
| `ticket-card.tsx` | `TicketCard`: ticket con cabecera morada e isotipo, QR o barra de pago, apagado si ya no sirve |
| `passenger-copy.ts` | Textos y reglas puras de la app del pasajero: tonos, acción siguiente, plazos de pago, frases de hora, avisos del inicio |
| `details-view.tsx` | `DetailsView`: datos de cobro (JSON) como pares clave-valor, exporta `JsonValue` |

## Patrones del panel

- Acciones de servidor (`pasajeros`, `salidas`, `flota`, `taquilla`, admin): `safeParse` con mensajes en español, `try/catch` alrededor del dominio con `userFacingMessage(error)` de `src/app/panel/feedback.ts`, y `redirect` fuera del `try` a `?error=<mensaje>` u `?ok=<código>` con `panelFeedbackUrl`; la página traduce el código con un `Record` y lo muestra con `<PanelFeedback>`.
- "Registro rápido" del tablero: los formularios de `src/app/panel/_forms/` aceptan `returnTo="tablero"` y la acción lo lee con `parsePanelOrigin(formData.get("origen"))`.
- Todo `<form action={...}>` de servidor envía con `SubmitButton`; lo irreversible pasa por `ConfirmDialog`.

## Verificación visual

- El arnés de capturas de Playwright vive **fuera del repo**, en el scratchpad de la sesión (`qa/shoot.cjs`, `qa/shoot-extra.cjs`, a 375, 820 y 1280 px). Sus sesiones se crean por script (`qa/make-sessions.ts` con `tsx --tsconfig tsconfig.json`) llamando a `createPanelSession` y `createPassengerSession` de `@/modules/auth`, y se inyectan como cookies `tr_panel` y `tr_pax`: nunca se escriben contraseñas.
- Las siluetas de carga se revisan en `/dev/esqueletos` con `pnpm dev`.

## Glosario de documentación (`Documentación/`)

| Archivo | Contenido |
|---|---|
| `ESTRUCTURA DE RESERVA Y CAPTACIÓN DE LEAD.pdf` | Las cinco fases del embudo: captación, registro, pago, emisión, recordatorios y abordaje |
| `ESTRUCTURA DE MÉTODOS DE PAGO EN EL FLUJO.pdf` | Pago digital con comprobante obligatorio, pago físico con reserva condicional y regla de reconfirmación |
| `SOLUCIONES A SUS PROBLEMAS GUBERNAMENTALES.pdf` | Justificación estatal: trazabilidad, transparencia financiera, inteligencia logística, seguridad ciudadana |
| `EN QUE AFECTA E INTERESES DEL ESTADO Y PAÍS.pdf` | Datos de movilidad terrestre y el equilibrio entre control estatal y privacidad |

## Notas operativas

- Los nombres de los PDF llevan acentos y la herramienta `Read` falla con ellos por normalización Unicode. Solución: copiarlos al scratchpad con nombres ASCII mediante PowerShell y leer la copia.
- `src/worker/sweeps.ts` contiene los seis barridos programados y `src/worker/index.ts` el proceso que los ejecuta. `pnpm worker:dev` no siempre recarga: reinícialo tras cambiar el dominio o los barridos.
- Clases de Tailwind nuevas pueden exigir reiniciar `pnpm dev` con `.next` limpio.
