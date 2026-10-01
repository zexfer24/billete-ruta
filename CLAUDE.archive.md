# CLAUDE.archive.md

Archivo de lo retirado de `CLAUDE.md` para mantenerlo cerca de 200 líneas. **No se carga en el contexto automático**: se consulta a mano cuando hace falta el detalle histórico. Lo vigente manda siempre: `CLAUDE.md`, la spec funcional `docs/superpowers/specs/2026-09-10-ticketruta-design.md` y la spec visual `docs/superpowers/specs/2026-09-30-brand-design-system.md`.

## Retirado el 2026-10-01 (cierre de la ronda 5, rediseño de marca)

### Lenguaje visual anterior (rondas 2 a 4), ya no existe

> **Interfaz del pasajero**: `/`, `/ingresar`, `/registro`, `/mi/*` y `/lista-espera/*` usan el lenguaje visual de app móvil (tokens `--marca`, `--ruta`, `--cta`, `--tinta`, `--lienzo` en `globals.css`, fuente Rubik, iconos SVG propios sin dependencias, barra inferior de navegación). Los paneles de operador y admin conservan los tokens `--acento` originales.

Lo reemplazó en la ronda 5 un solo lenguaje para las tres interfaces (escala `marca-50…950`, `sol`, neutros `tinta`/`lienzo` y semánticos `exito`/`alerta`/`peligro`/`info`, fuente Atkinson Hyperlegible Next). Los alias de compatibilidad de la spec 3.6 (`--acento`, `--cta`, `--ruta`, `--fondo`, `--texto`…) se eliminaron de `globals.css` en el cierre. La variante de botón `ruta` y las variantes `azul`/`verde` de `SearchCard` tampoco existen ya. La paleta de agencia anterior (`#d41f1f`, `#0b62b5`, `#2e8b3a`, `#d9581d`, `#6b3fa0`, `#0e8a8a`, "estilo Transit") se cambió por la de la spec 3.5.

### Entradas del glosario de componentes anteriores a la ronda 5

| Componente | Descripción vieja |
|---|---|
| `icons.tsx` | Set de 27 iconos SVG propios de trazo (hoy son 47) |
| `ui.tsx` | `buttonClass(variant, extra?)`, `Card`, `Field`, `Pill`, `SectionTitle` (hoy las clases puras viven en `ui-classes.ts`) |
| `app-header.tsx` | Cabecera azul de la app del pasajero (hoy morada con logo) |
| `search-card.tsx` | Variantes `azul` (portada) y `verde` (reservar) (hoy una sola) |
| `panel-ui.tsx` | `panelButtonClass`, `panelInputClass`, `PANEL_LABEL_CLASS`, `PanelPageHeader`, `StatCard`, `StatusBadge`, `PanelTabs`, `EmptyState`, `TableShell`, `SectionCard` (hoy las clases salen de `ui-classes.ts` y se reexportan, `EmptyState` y `ProgressBar` se reexportan de `ui.tsx`, y se sumaron `MobileCard`, `PANEL_TH_CLASS` y `PANEL_TD_CLASS`) |
| `panel-nav.tsx` | Menú del operador solamente (hoy variantes `agencia` y `terminal`) |
| `src/app/mi/reservar/step-indicator.tsx` | Indicador de pasos del asistente, reemplazado por `Stepper` |

### Detalle largo de la API de módulos (versión completa)

- `reports`: `revenueByRoute`, `driverMovements`, `departureTaxRevenue`, `agencyMovements`, `listAccounts`, `listTerminalTrips` (recorridos del tablero), `listNewAccounts` (usuarios nuevos, escribe auditoría), `getTripDetail` (viaje con pasajeros a bordo, escribe auditoría), `listAgencyPassengers` (filtra por `paymentState` o por `view`), `paymentStateOf`, `paymentStateWhere`, `PAYMENT_STATES`, `agencyDashboard(agencyId, range, now)` (tablero del operador), `agencyFleetStatus`, `unitStateOf` (estado operativo de chofer o vehículo, función pura), `listRecentTickets`, `listAgencyActivity`, `describeActivity` (frase legible de una entrada de actividad, función pura), `listPendingProofQueue`, `getAgencyReservationDetail`, `countAgencyReservationViews`, `reservationViewFromSlug`. Desde la ronda 5 también `isOverdueDeparture` (salida atrasada, estado `ATRASADO`), y `listTerminalTrips` cuenta y ordena por la llegada (`arrivedAt`).
- `notices`: `buildNotices` cubre documento faltante, reserva por liberar, comprobante rechazado o en validación, pago en sitio por reconfirmar, saldo pendiente (`SALDO_PENDIENTE`, nuevo en la ronda 5) y ticket listo.
- `messaging`: además de lo listado en `CLAUDE.md`, exporta `DEFAULT_TRAVEL_TIPS`, `ONCE_PER_RESERVATION_TEMPLATES`, `TEMPLATE_KEYS`, `STORED_TEXT_KEY`, `isTemplateKey`, `templateButtons`.

Filas originales que `CLAUDE.md` acortó:

- `accounts`: `registerAccount` (recibe `givenNames` y `surnames`, no `fullName`; también activa una cuenta creada en taquilla), `createCounterAccount` (cuenta de taquilla sin contraseña, actor PANEL).
- `auth`: `requireAgencyUser` (guarda de páginas de agencia que redirige al inicio del rol), `can` (incluye el permiso `sales.counter`, solo para OPERADOR).
- `booking`: `createReservationInTx` (misma lógica dentro de una transacción ya abierta, usada por la venta en taquilla).
- `counter`: `lookupCounterHolder` (consulta auditada del titular por cédula), `sellAtCounter` (cuenta, documentos, reserva y cobro en efectivo en una sola transacción; emite el ticket al terminar).
- `messaging`: `renderStoredPreview` (texto de un mensaje ya guardado, nunca lanza), `listMessagesForPhone` (bandeja de mensajes del pasajero, texto ya renderizado).
- `notices`: `listNoticesForAccount` (avisos vigentes de una cuenta, consulta con Prisma).
- `payments`: `registerCashPaymentInTx` (misma lógica dentro de una transacción ya abierta), `proofCoverage` (abono parcial, pago completo o excedente), `getProofReview` (comprobante, reserva, cobertura e historial, con aislamiento por agencia), `countPendingProofs` (comprobantes pendientes de la agencia, para la insignia del menú).
- `tickets`: `renderQrDataUrl` (imagen PNG del QR como data URL, para mostrarlo en pantalla sin abrir el PDF).
- `trips`: `availableTripActions` (qué botones de embarque, salida y llegada aplican según el estado; función pura).
- `time.ts`: hora de Caracas y formato de 24 horas, duración de recorridos, ventanas por hora (`caracasHourStart`, `caracasHourEnd`, `caracasHourValue`), tiempo relativo de salida (`minutesUntil`, `formatRelativeDeparture`: "Sale ahora", "Sale en N min", "Sale a las HH:mm", "Salió"), periodos del tablero del operador (`caracasPeriodRange`, `caracasDayRange`, `periodFromSlug`).
- `labels.ts`: `RESERVATION_STATUS_LABELS`, `reservationStatusLabel`, `reservationStatusTone`, `PROOF_STATUS_LABELS`, `MESSAGE_STATUS_LABELS`, `messageStatusTone`, `DEPARTURE_STATUS_LABELS`, `departureStatusLabel`, `departureStatusTone`, `UNIT_STATE_LABELS`, `unitStateTone`, `SALES_CHANNEL_LABELS`, `salesChannelLabel`, tipo `StatusTone`.
- `panel-nav.ts`: menú agrupado del panel y utilidades de navegación, puro (sin React); `parsePanelOrigin` es el contrato de "registro rápido"; `legacyPanelRedirect` traduce una ruta vieja del panel a la nueva.
- `safe-next.ts`: rechaza vacío, `//`, `\` y URLs absolutas.
- `storage.ts`: `deleteUpload` sirve para deshacer un archivo ya guardado cuando falla la venta en taquilla que lo necesitaba.
- `brand.ts`: colores e iniciales derivados del id, sin tocar el esquema de base de datos.

### Patrón de acciones del panel (texto completo)

`src/app/panel/feedback.ts` (sin `"use server"`, porque ese archivo solo exporta funciones asíncronas) expone `userFacingMessage(error)` (traduce un error conocido del dominio a un mensaje en español, o devuelve `null` para que la acción lo relance; incluye `MissingDocumentsError`) y `panelFeedbackUrl(path, params)` (arma la URL de retorno omitiendo valores vacíos). Las acciones del panel de agencia (`pasajeros`, `salidas`, `flota`, `taquilla`) siguen el patrón: `safeParse` con mensajes en español, `try/catch` alrededor de la llamada al dominio, y `redirect` fuera del `try` hacia `?error=<mensaje>` o `?ok=<código corto>`; la página traduce el código de éxito a texto con un `Record` y muestra ambos con `<PanelFeedback>`.

Los formularios reutilizables de `src/app/panel/_forms/` (`cash-payment-form`, `departure-form`, `vehicle-form`, `driver-form`) aceptan la prop opcional `returnTo="tablero"`: con ella agregan `<input type="hidden" name="origen" value="tablero" />`, y la acción de servidor lee ese campo con `parsePanelOrigin(formData.get("origen"))` (`src/lib/panel-nav.ts`) para redirigir al tablero en vez de a su propia página. Es el contrato del "registro rápido" del tablero.

`next.config.ts` fija `experimental.serverActions.bodySizeLimit` en `"12mb"`, porque la venta en taquilla y los documentos del pasajero suben imágenes de hasta 5 MB cada una y el límite por defecto de las acciones de servidor es de solo 1 MB.

### Rondas anteriores

- Rondas 1 a 4 (paneles, app del pasajero, fallas de uso, panel del operador): sus pendientes viven en la memoria del proyecto (`ronda-1-paneles`, `ronda-2-app-pasajero`, `ronda-3-fallas-uso`, `ronda-4-panel-operador`).
- Ronda 5 (2026-09-30 y 2026-10-01, rama `feat/brand-redesign`): commit del rediseño `82239bc`, preparación `2d11726` y seis rondas de calidad (`2ab9f16`, `44e5fdf`, `d1d4920`, `e0d2082`, `9313134`, `5b4d8ee`). Hallazgos graves por ronda: 3, 4, 1, 2, 0, 0; se cerró tras dos rondas seguidas sin graves. El plan con su resultado está en `docs/superpowers/plans/2026-09-30-brand-redesign.md`.
