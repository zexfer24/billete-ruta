# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Metodología de trabajo

Este proyecto se rige por la metodología Liminal Flows (`/liminalwork`). Todo cambio de diseño, lógica o código pasa por: contexto → Plan Mode → explicación al operador → tests propuestos → descomposición en tareas → aprobación → subagentes (uno por tarea) → reporte al orquestador → validación → tests en verde. El orquestador no implementa; coordina, delega y valida.

Idioma: comentarios, textos de interfaz y comunicación en español con acentos correctos. Identificadores de código, nombres de archivo y mensajes de commit en inglés.

## Documentos rectores

- `docs/superpowers/specs/2026-09-10-ticketruta-design.md` — especificación aprobada, revisión 2. Fuente de verdad para modelo de datos, estados, montos, jobs, reportes y privacidad.
- `docs/superpowers/plans/2026-09-10-ticketruta-mvp.md` — plan de implementación del MVP en doce tareas delegables.
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
- **Cupos sin sobreventa**: la creación de reserva bloquea la fila de la salida con `SELECT ... FOR UPDATE` y recalcula el disponible dentro de la transacción.
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

- Next.js 15 (App Router, TypeScript estricto) como monolito, con proceso `worker` aparte para jobs con pg-boss sobre PostgreSQL 16. Prisma. Tailwind. Vitest y Playwright. pnpm.
- WhatsApp detrás de la interfaz `WhatsAppProvider`. El MVP usa solo la implementación falsa, con bandeja de mensajes visible en el panel del admin. La Meta Cloud API queda documentada en `docs/whatsapp-templates.md` para después del MVP.
- Entrega inmediata: **MVP en localhost**, no Docker de la aplicación. Solo PostgreSQL en contenedor, puerto 5434 para desarrollo y 5435 para test. Los puertos 5432 y 5433 están ocupados en esta máquina.
- Módulos en `src/modules/*`, cada uno exporta su API pública desde `index.ts`. Nadie importa internos de otro módulo. Alias `@/` a `src/`.
- Dinero siempre con `Prisma.Decimal`, nunca `number`.
- **Interfaz del pasajero**: `/`, `/ingresar`, `/registro`, `/mi/*` y `/lista-espera/*` usan el lenguaje visual de app móvil (tokens `--marca`, `--ruta`, `--cta`, `--tinta`, `--lienzo` en `globals.css`, fuente Rubik, iconos SVG propios sin dependencias, barra inferior de navegación). Los paneles de operador y admin conservan los tokens `--acento` originales. La portada (`/`) muestra las próximas salidas sin necesidad de sesión, por tratarse de datos de catálogo (ruta, hora, precio, cupos), no personales.
- El panel del operador usa un menú agrupado (Operación, Flota y Reportes) y piezas de `src/components/panel-ui.tsx`. Las rutas viejas `/panel/pagos`, `/panel/vehiculos`, `/panel/choferes`, `/panel/recaudacion` y `/panel/movimientos` redirigen a sus páginas nuevas.

## Comandos

```
pnpm db:up / pnpm db:test:up     PostgreSQL en Docker (5434 y 5435)
pnpm prisma migrate deploy       aplicar migraciones
pnpm seed                        datos de demostración con credenciales impresas
pnpm dev                         http://localhost:3000
pnpm worker:dev                  jobs programados, en otra terminal
pnpm typecheck / pnpm lint
pnpm test                        unitarios
pnpm test:integration            requiere la base de test levantada
pnpm test:e2e
pnpm test -- tests/unit/booking/state-machine.test.ts    un solo archivo
```

## Glosario de módulos

Cada carpeta de `src/modules/` expone su API pública en `index.ts`. Nadie importa internos de otro módulo.

| Módulo | Responsabilidad | API principal |
|---|---|---|
| `accounts` | Cuentas de pasajero y sus documentos | `registerAccount` (recibe `givenNames` y `surnames`, no `fullName`; también activa una cuenta creada en taquilla), `loginAccount`, `uploadDocument`, `missingDocuments`, `createCounterAccount` (cuenta de taquilla sin contraseña, actor PANEL), `createDocumentInTx` |
| `agencies` | Agencias, vehículos y choferes | `createAgencyWithOperator`, `listAgencies`, `createVehicle`, `listDrivers` (trae embarques y desembarques) |
| `audit` | Bitácora de solo inserción | `writeAudit` |
| `auth` | Dos ámbitos de sesión y matriz de permisos | `requirePanelUser`, `requirePassenger`, `requireAgencyScope`, `requireAgencyUser` (guarda de páginas de agencia que redirige al inicio del rol), `panelHomeFor`, `can` (incluye el permiso `sales.counter`, solo para OPERADOR), `hashPassword` |
| `booking` | Reservas, cupos, estados y lista de espera | `createReservation`, `createReservationInTx` (misma lógica dentro de una transacción ya abierta, usada por la venta en taquilla), `transitionReservation`, `getAvailability`, `processWaitlist`, `canTransition` |
| `catalog` | Rutas, salidas, tasas y precios | `listBookableDepartures`, `createDeparture`, `getManifest`, `computeAmounts`, `getCurrentDepartureTax` |
| `counter` | Venta de pasajes en la taquilla de la agencia | `lookupCounterHolder` (consulta auditada del titular por cédula), `listCounterOptions`, `quoteCounterSale`, `sellAtCounter` (cuenta, documentos, reserva y cobro en efectivo en una sola transacción; emite el ticket al terminar) |
| `messaging` | Canal de mensajes con proveedor intercambiable | `enqueueMessage`, `deliverPendingMessages`, `getWhatsAppProvider`, `renderPreview`, `renderStoredPreview` (texto de un mensaje ya guardado, nunca lanza), `listMessagesForPhone` (bandeja de mensajes del pasajero, texto ya renderizado) |
| `notices` | Avisos derivados del estado del pasajero | `buildNotices` (función pura de reglas: documento faltante, reserva por liberar, comprobante rechazado o en validación, pago en sitio por reconfirmar, ticket listo), `listNoticesForAccount` (avisos vigentes de una cuenta, consulta con Prisma) |
| `payments` | Abonos, comprobantes y cobros en efectivo | `submitProof`, `approveProof`, `rejectProof`, `registerCashPayment`, `registerCashPaymentInTx` (misma lógica dentro de una transacción ya abierta), `proofCoverage` (abono parcial, pago completo o excedente), `getProofReview` (comprobante, reserva, cobertura e historial, con aislamiento por agencia), `countPendingProofs` (comprobantes pendientes de la agencia, para la insignia del menú) |
| `reports` | Agregados de agencia y de terminal | `revenueByRoute`, `driverMovements`, `departureTaxRevenue`, `agencyMovements`, `listAccounts`, `listTerminalTrips` (recorridos del tablero), `listNewAccounts` (usuarios nuevos, escribe auditoría), `getTripDetail` (viaje con pasajeros a bordo, escribe auditoría), `listAgencyPassengers` (filtra por `paymentState` o por `view`), `paymentStateOf`, `paymentStateWhere`, `PAYMENT_STATES`, `agencyDashboard(agencyId, range, now)` (tablero del operador), `agencyFleetStatus`, `unitStateOf` (estado operativo de chofer o vehículo, función pura), `listRecentTickets`, `listAgencyActivity`, `describeActivity` (frase legible de una entrada de actividad, función pura), `listPendingProofQueue`, `getAgencyReservationDetail`, `countAgencyReservationViews`, `reservationViewFromSlug` |
| `scheduler` | Ventanas de tiempo de los barridos | `dueForReminder24h`, `dueForRelease12h`, `nextRetryDelayMinutes` |
| `tickets` | PDF con QR firmado | `issueTicket`, `signTicketCode`, `verifyTicketQr`, `renderQrDataUrl` (imagen PNG del QR como data URL, para mostrarlo en pantalla sin abrir el PDF) |
| `trips` | Embarque, desembarque y abordaje | `startBoarding`, `registerDeparture`, `registerArrival`, `findForBoarding`, `confirmBoarding`, `availableTripActions` (qué botones de embarque, salida y llegada aplican según el estado; función pura) |

| Archivo de `src/lib/` | Para qué sirve |
|---|---|
| `prisma.ts` | Cliente único de base de datos |
| `env.ts` | Configuración validada con zod |
| `decimal.ts` | `toDecimal`, `round2`, `formatMoney`, `formatUsdString` |
| `time.ts` | Hora de Caracas y formato de 24 horas, duración de recorridos, ventanas por hora (`caracasHourStart`, `caracasHourEnd`, `caracasHourValue`), tiempo relativo de salida (`minutesUntil`, `formatRelativeDeparture`: "Sale ahora", "Sale en N min", "Sale a las HH:mm", "Salió"), periodos del tablero del operador (`caracasPeriodRange`, `caracasDayRange`, `periodFromSlug`) |
| `identity.ts` | Cédulas, teléfonos, edad, enmascarado y primer nombre o apellido (`firstNamePart`) |
| `storage.ts` | Archivos subidos, verificación por firma de bytes y borrado (`deleteUpload`, para deshacer un archivo ya guardado cuando falla la venta en taquilla que lo necesitaba) |
| `brand.ts` | Colores e iniciales de bloque de agencia: `agencyColor(agencyId)`, `agencyColorIndex(agencyId)`, `agencyInitials(name)`, `AGENCY_COLORS` (derivados del id, sin tocar el esquema de base de datos) |
| `labels.ts` | Traducciones y tonos de estado: `RESERVATION_STATUS_LABELS`, `reservationStatusLabel`, `reservationStatusTone`, `PROOF_STATUS_LABELS`, `MESSAGE_STATUS_LABELS`, `messageStatusTone`, `DEPARTURE_STATUS_LABELS`, `departureStatusLabel`, `departureStatusTone`, `UNIT_STATE_LABELS`, `unitStateTone` (estado operativo de una unidad), `SALES_CHANNEL_LABELS`, `salesChannelLabel`, tipo `StatusTone` |
| `panel-nav.ts` | Menú agrupado del panel y utilidades de navegación, puro (sin React): `OPERATOR_NAV`, `isActivePanelPath`, `parsePanelOrigin` (contrato de "registro rápido"), `legacyPanelRedirect` (traduce una ruta vieja del panel a la nueva) |
| `safe-next.ts` | `safeNext(value)`: valida una ruta de retorno interna tras ingresar o registrarse (rechaza vacío, `//`, `\` y URLs absolutas) |
| `reservations.ts` | `splitByDeparture(reservas, now)`: separa una lista de reservas en "próximas" y "pasadas" según `departure.departsAt`, para "Mis viajes" |

| Componente de `src/components/` | Para qué sirve |
|---|---|
| `side-panel.tsx` | `SidePanel`: panel lateral controlado por la URL |
| `close-on-escape.tsx` | `CloseOnEscape`: foco, bloqueo del desplazamiento y cierre con Escape |
| `clickable-row.tsx` | `ClickableRow`: fila de tabla que navega al hacer clic |
| `icons.tsx` | Set de 27 iconos SVG propios de trazo (componente de servidor), con `IconBase` interno para el estilo y la accesibilidad comunes; los del panel del operador son `IconCash`, `IconChart`, `IconList`, `IconPlus` e `IconStore` |
| `ui.tsx` | Piezas base de la app del pasajero: `buttonClass(variant, extra?)`, `Card`, `Field`, `Pill`, `SectionTitle` |
| `app-header.tsx` | `AppHeader`: cabecera azul de la app del pasajero, con botón de volver, título, subtítulo y acciones |
| `bottom-nav.tsx` | `BottomNav`: barra de navegación inferior de cuatro destinos, con contador de avisos pendientes |
| `search-card.tsx` | `SearchCard`: buscador de origen y destino con intercambio, variantes `azul` (portada) y `verde` (reservar) |
| `agency-badge.tsx` | `AgencyBadge`: bloque de color con las iniciales de la agencia |
| `departure-row.tsx` | `DepartureRow`: fila de salida en línea de tiempo, exporta `DepartureRowData` |
| `departure-board.tsx` | `DepartureBoard`: tablero de bloques de color por agencia para las próximas salidas |
| `notice-card.tsx` | `NoticeCard`: tarjeta de aviso por nivel (`alerta`, `info`, `exito`) |
| `ticket-card.tsx` | `TicketCard`: tarjeta de ticket compacta o grande, con QR en pantalla o barra de progreso de pago, exporta `TicketCardData` |
| `sticky-actions.tsx` | `StickyActions`: barra fija de botones de avance y retroceso del asistente de reserva |
| `details-view.tsx` | `DetailsView`: muestra un valor JSON arbitrario (datos de cobro de un método de pago) como pares clave-valor, exporta el tipo `JsonValue` |
| `panel-feedback.tsx` | `PanelFeedback`: aviso rojo o verde para las acciones del panel de agencia, según `error` u `ok` |
| `panel-ui.tsx` | Piezas base del panel del operador: `panelButtonClass(variant, size?, extra?)`, `panelInputClass(extra?)`, `PANEL_LABEL_CLASS`, `PanelPageHeader`, `StatCard` (etiqueta, cifra tabular, detalle, `href` opcional), `StatusBadge` (texto y tono, nunca solo color), `PanelTabs` (enlaces con `aria-current` y contador), `EmptyState`, `TableShell`, `SectionCard` |
| `panel-nav.tsx` | `PanelNav`: menú agrupado del panel del operador (cliente); barra lateral fija desde `lg` y menú plegable por debajo, con la insignia de comprobantes por revisar |

`src/worker/sweeps.ts` contiene los seis barridos programados y `src/worker/index.ts` el proceso que los ejecuta.

`src/app/panel/feedback.ts` (sin `"use server"`, porque ese archivo solo exporta funciones asíncronas) expone `userFacingMessage(error)` (traduce un error conocido del dominio a un mensaje en español, o devuelve `null` para que la acción lo relance; incluye `MissingDocumentsError`) y `panelFeedbackUrl(path, params)` (arma la URL de retorno omitiendo valores vacíos). Las acciones del panel de agencia (`pasajeros`, `salidas`, `flota`, `taquilla`) siguen el patrón: `safeParse` con mensajes en español, `try/catch` alrededor de la llamada al dominio, y `redirect` fuera del `try` hacia `?error=<mensaje>` o `?ok=<código corto>`; la página traduce el código de éxito a texto con un `Record` y muestra ambos con `<PanelFeedback>`.

Los formularios reutilizables de `src/app/panel/_forms/` (`cash-payment-form`, `departure-form`, `vehicle-form`, `driver-form`) aceptan la prop opcional `returnTo="tablero"`: con ella agregan `<input type="hidden" name="origen" value="tablero" />`, y la acción de servidor lee ese campo con `parsePanelOrigin(formData.get("origen"))` (`src/lib/panel-nav.ts`) para redirigir al tablero en vez de a su propia página. Es el contrato del "registro rápido" del tablero.

`next.config.ts` fija `experimental.serverActions.bodySizeLimit` en `"12mb"`, porque la venta en taquilla y los documentos del pasajero suben imágenes de hasta 5 MB cada una y el límite por defecto de las acciones de servidor es de solo 1 MB.

## Glosario de documentación (`Documentación/`)

| Archivo | Contenido |
|---|---|
| `ESTRUCTURA DE RESERVA Y CAPTACIÓN DE LEAD.pdf` | Las cinco fases del embudo: captación, registro, pago, emisión, recordatorios y abordaje |
| `ESTRUCTURA DE MÉTODOS DE PAGO EN EL FLUJO.pdf` | Pago digital con comprobante obligatorio, pago físico con reserva condicional y regla de reconfirmación |
| `SOLUCIONES A SUS PROBLEMAS GUBERNAMENTALES.pdf` | Justificación estatal: trazabilidad, transparencia financiera, inteligencia logística, seguridad ciudadana |
| `EN QUE AFECTA E INTERESES DEL ESTADO Y PAÍS.pdf` | Datos de movilidad terrestre y el equilibrio entre control estatal y privacidad |

## Notas operativas

- Los nombres de los PDF llevan acentos y la herramienta `Read` falla con ellos por normalización Unicode. Solución: copiarlos al scratchpad con nombres ASCII mediante PowerShell y leer la copia.
