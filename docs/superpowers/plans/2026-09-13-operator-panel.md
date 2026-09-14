# Plan: panel del operador de agencia (ronda 3)

## Contexto

El operador pidió rediseñar el panel de agencia (`/panel/*`) con la skill `ui-ux-pro-max` y estos criterios:

- Un tablero con **Tickets pendientes**, **Total de salidas** y **Total de recaudación**.
- Un panel con **choferes activos**, **estado del vehículo**, **ruta en curso o próximas**, **resumen de tickets nuevos** y **sistema de registro**.
- **Agrupar Pagos y Pasajeros**, porque Pasajeros muestra las reservas que generaron un ticket y Pagos no las refleja.
- Agrupar y mejorar la experiencia del operador en general.

### Estado actual (explorado el 2026-09-13 sobre `feat/passenger-app-ui`)

- **Menú**: `src/app/panel/layout.tsx` tiene ocho enlaces planos, sin agrupar, sin iconos y sin marcar la página activa.
- **Resumen**: `src/app/panel/page.tsx` muestra cuatro tarjetas mudas (comprobantes pendientes, salidas en 48 h, recaudación en 24 h y mensajes fallidos). No tienen enlaces ni periodo.
- **Pagos**: `src/app/panel/pagos/page.tsx` solo lista comprobantes `PENDIENTE`. Una reserva sin comprobante (`PENDIENTE_PAGO`, `PAGO_EN_SITIO`), una ya pagada o un ticket emitido no aparecen ahí. El cobro en efectivo obliga a escribir el serial a mano.
- **Pasajeros**: `src/app/panel/pasajeros/page.tsx` lista todas las reservas, pero sin detalle y sin acciones.
- **Estados en crudo**: las tablas muestran los nombres técnicos (`EN_VALIDACION`, `PROGRAMADA`).
- **Flota**: vehículos y choferes muestran solo "Activo o Inactivo", sin estado operativo.

### Hallazgos de dominio encontrados al explorar (se corrigen en esta ronda)

1. **Conversión de moneda errónea** en `registerCashPayment` y `submitProof` (`src/modules/payments/record-payment.ts:50` y `:341`). Convierten con `reserva.exchangeRateUsed` aunque la moneda del pago sea otra. Ejemplo: en una reserva en USD (tasa 1), un cobro de 400 VES suma 400 US$.
2. **Cobro en efectivo imposible** sobre una reserva `PENDIENTE_PAGO`. La máquina de estados no permite `PENDIENTE_PAGO → ABONADA | PAGADA`, así que la acción falla con "La reserva ya no admite este cambio".

### Decisiones del operador (2026-09-13)

- **Rama**: se commitea la ronda 2 en `feat/passenger-app-ui` y se crea `feat/operator-panel` desde ahí.
- **Sistema de registro**: son cuatro piezas a la vez: bitácora de actividad, registro rápido, embarques y desembarques del día, y venta en taquilla.
- **Periodo del tablero**: hoy en hora de Caracas, con selector Hoy / 7 días / 30 días.
- **Agrupación del menú**:
  - Operación: Tablero, Taquilla, Pasajeros y pagos, Salidas.
  - Flota: vehículos y choferes en una sola página con pestañas.
  - Reportes: recaudación y movimientos en una sola página con pestañas.
  - Las URL viejas redirigen a las nuevas.
- **Venta en taquilla**:
  - **Cuenta**: si el pasajero no tiene cuenta, la crea el operador, sin contraseña y marcada como creada en taquilla. El pasajero la activa después en `/registro` con su cédula.
  - **Documentos**: el operador sube la foto de la cédula si falta, y el permiso de viaje si viaja un menor.
  - **Pago**: efectivo completo en el acto, en una sola operación atómica. La reserva nace `PAGADA` y el ticket se emite.

## Dirección visual (ui-ux-pro-max)

Se consultaron `--design-system` (densidad 8, movimiento 2, variación 3) y los dominios `ux` y `chart`. Se adopta el estilo **minimalismo suizo denso para tableros**: rejilla estricta, jerarquía tipográfica clara, sombras mínimas y cifras tabulares. Se descartan la paleta oscura y la tipografía Fira que propuso la herramienta, porque contradicen dos decisiones fijas de `CLAUDE.md`: los paneles conservan los tokens `--acento` y la fuente Rubik es global. Por eso no se persiste `design-system/`.

**Reglas aplicadas en todas las pantallas del panel:**

- **Estados**: siempre con texto y color a la vez, nunca solo color. Se implementa con `StatusBadge`.
- **Navegación**: el elemento activo lleva `aria-current="page"` y resaltado, y los grupos llevan encabezado.
- **Estados vacíos**: explican qué pasa y ofrecen una acción ("No hay salidas hoy. Crear salida").
- **Acciones irreversibles**: registrar salida y cobrar en taquilla piden confirmación explícita.
- **Confirmación de éxito**: se usa `PanelFeedback`, que ya existe.
- **Foco y movimiento**: foco visible con `focus-visible:outline-2` en el color de acento, transiciones de color de 150 ms y `motion-reduce` en toda animación.
- **Tipografía**: `h1` de 24 px, secciones de 16 a 18 px y tablas densas de 14 px. Los formularios de taquilla y abordaje usan 16 px y controles de 44 px porque se operan en el móvil del mostrador.
- **Tablas**: siempre dentro de `overflow-x-auto`. Nada provoca desplazamiento horizontal de la página a 375 px.
- **Tokens nuevos** (aditivos) en `src/app/globals.css`: `--exito-suave`, `--alerta-suave` y `--peligro-suave`, para el fondo de las pastillas con contraste de 4.5:1.

## Mapa del panel

### Menú (`src/components/panel-nav.tsx`, cliente)

- **Estructura**: tres grupos con icono SVG propio. En la sección Operación, "Pasajeros y pagos" lleva un contador de comprobantes por revisar.
- **Anchos**: desde `lg` es una barra lateral de 256 px. Por debajo, una cabecera con el nombre de la agencia y un menú plegable (`<details>`).
- **Página activa**: la detecta `isActivePanelPath(pathname, href)`, una función pura con test.

| Grupo | Entrada | Ruta | Redirecciones desde |
|---|---|---|---|
| Operación | Tablero | `/panel` | — |
| Operación | Taquilla | `/panel/taquilla` (nueva) | — |
| Operación | Pasajeros y pagos | `/panel/pasajeros` | `/panel/pagos` → `?vista=por-revisar` (conserva `comprobante`) |
| Operación | Salidas | `/panel/salidas` | — |
| Flota | Vehículos y choferes | `/panel/flota?vista=vehiculos\|choferes` | `/panel/vehiculos` y `/panel/choferes` |
| Reportes | Recaudación y movimientos | `/panel/reportes?vista=recaudacion\|movimientos` | `/panel/recaudacion` y `/panel/movimientos` (conservan filtros) |

### 1. Tablero `/panel`

- **Cabecera**: "Tablero de {agencia}" con un selector segmentado Hoy / 7 días / 30 días (`?periodo=hoy|7d|30d`) y la leyenda "Hora de Caracas".
- **Registro rápido**: una fila de botones:
  - "Vender en taquilla" (principal), que lleva a `/panel/taquilla`.
  - "Registrar cobro", "Crear salida", "Registrar vehículo" y "Registrar chofer", que abren un `SidePanel` en el mismo tablero (`?registrar=cobro|salida|vehiculo|chofer`).
  - Cada formulario reutiliza su acción de servidor con un campo oculto `origen=tablero`, validado con `z.enum` para que no haya redirección abierta.
- **Tres indicadores clicables**:
  - **Tickets pendientes** (en vivo, no depende del periodo): reservas abiertas (`PENDIENTE_PAGO`, `EN_VALIDACION`, `ABONADA`, `PAGO_EN_SITIO`) de salidas `PROGRAMADA` o `MANIFIESTO_CERRADO`. Detalle: "N comprobantes por revisar · N pago en sitio". Lleva a `/panel/pasajeros?vista=por-cobrar`.
  - **Total de salidas** del periodo, sin contar las canceladas. Detalle: "N programadas · N en ruta · N finalizadas". Lleva a `/panel/salidas`.
  - **Total de recaudación** del periodo, con la misma métrica que Reportes (comprobantes aprobados más cobros en efectivo, en USD). Detalle: "N pagos". Lleva a `/panel/reportes?vista=recaudacion` con el mismo rango.
- **Aviso de mensajes fallidos**: aparece solo si hay alguno.
- **Rejilla de dos columnas** (una en móvil):
  - **Flota en operación**: fila por chofer activo con su unidad (placa y estado), la ruta en curso (salida `EN_RUTA`, hora de salida y llegada estimada = `departedAt + estimatedMinutes`) o sus próximas salidas (hasta 3 en 7 días). Arriba, un resumen de unidades: en ruta, embarcando, asignadas, disponibles y fuera de servicio.
  - **Tickets nuevos**: los últimos 10 emitidos en el periodo, con serial, titular, ruta y salida, hora de emisión y canal (App o Taquilla). Lleva a `?vista=pagadas`.
  - **Embarques y desembarques de hoy**: salidas del día de Caracas con inicio de embarque, salida y llegada. Cada una enlaza a su manifiesto.
  - **Actividad reciente**: bitácora de la agencia, en frases legibles ("María Pérez aprobó el pago de TR-0913-2PAX-K4D1 por US$ 20,00", "El sistema liberó TR-… por falta de pago"). Sin datos personales del pasajero más allá del serial.

### 2. Pasajeros y pagos `/panel/pasajeros`

- **Pestañas con contador** (`?vista=`):
  - **Por revisar**: cola de comprobantes `PENDIENTE`, del más viejo al más nuevo. Es la vista por defecto si hay alguno.
  - **Por cobrar**: estado de pago Pendiente o Abonado. La fila marca "comprobante en revisión" si tiene uno pendiente.
  - **Pagadas**: estado Confirmado, con la hora de emisión del ticket.
  - **Sin efecto**.
  - **Todas**.
- **Filtros**: salida y búsqueda (serial, nombre o cédula). CSV como hoy.
- **Panel lateral de reserva** (`?reserva=<id>`), al hacer clic en una fila:
  - Titular con la cédula enmascarada, canal, salida, pasajeros con cédula enmascarada, y total, abonado y saldo (tarifa y tasa de salida por separado).
  - Estado legible, ticket (hora de emisión y enlace al PDF por `/api/archivos`) e historial de pagos (comprobantes y efectivo).
  - **Acciones**: revisar cada comprobante pendiente, con la imagen y los botones aprobar o rechazar (el contenido de hoy, extraído a un componente), y registrar un cobro en efectivo con la reserva ya fijada: monto sugerido = saldo y equivalente en la moneda elegida con la tasa vigente. Solo aparece en los estados que admiten cobro.
- **Enlace directo** `?comprobante=<id>`: se conserva, porque las filas de "Por revisar" abren el comprobante.

### 3. Taquilla `/panel/taquilla` (permiso nuevo `sales.counter`, solo OPERADOR)

Asistente de cuatro pasos, con diseño móvil primero, indicador "Paso N de 4" y una barra fija de avance:

1. **Salida**: salidas `PROGRAMADA` futuras de la agencia con cupo. Muestra ruta, hora de 24 h, cupos y precio por pasajero.
2. **Titular**: cédula y botón "Buscar". Es una consulta auditada (`CONSULTA_TITULAR_TAQUILLA`) que devuelve si existe la cuenta, su nombre y qué documentos le faltan.
   - Si no existe, se piden nombres, apellidos, teléfono y año de nacimiento.
   - Si falta la foto de la cédula, se pide con `accept="image/*" capture="environment"`.
3. **Acompañantes** (0 a 5): nombre, cédula y año de nacimiento. Si viaja un menor y la cuenta no tiene permiso de viaje, se pide el archivo.
4. **Cobro**: método de efectivo activo (USD, VES, COP o USDT), total en esa moneda con la tasa vigente y un campo opcional "Recibido" que calcula el vuelto en el cliente. Confirmación "Cobrar y emitir ticket".

**Resultado**: tarjeta con serial, QR en pantalla (`renderQrDataUrl`), enlace al PDF y botón "Nueva venta".

### 4. Salidas `/panel/salidas` y manifiesto

- **Listado**: estados en español con `StatusBadge`, barra de ocupación y "Crear salida" en un panel lateral (`?crear=1`), con el mismo formulario del registro rápido.
- **Manifiesto** (`/panel/salidas/[id]`): tres pasos (iniciar embarque, registrar salida y registrar llegada). Muestra cuáles están hechos y a qué hora, y habilita solo el siguiente válido según `status`. Botón destacado "Abrir abordaje" y estados de reserva en español.

### 5. Flota `/panel/flota`

- **Pestañas**: Vehículos y Choferes.
- **Vehículos**: placa, marca y modelo, asientos, estado operativo (En ruta, Embarcando, Asignado, Disponible o Fuera de servicio) y próxima salida.
- **Choferes**: nombre, C.I. completa (regla de la spec), estado operativo, ruta en curso o próxima, embarques y desembarques.
- **Formularios**: alta y edición en paneles laterales (`?registrar=`, `?editar=`).

### 6. Reportes `/panel/reportes`

- **Pestañas**: Recaudación (filtros de fecha y hora de hoy más accesos Hoy / 7 días / 30 días) y Movimientos (filtro de fechas).
- **Presentación**: estados legibles y exportación CSV como hoy.

## Cambios de dominio y datos

### Migración `operator_counter_sales` (Prisma)

- **`PassengerAccount`**:
  - `passwordHash String?`: nulo mientras la cuenta de taquilla no se activa.
  - `createdByPanelUserId String? @db.Uuid`.
- **`Reservation`**:
  - `salesChannel SalesChannel @default(APP)`, con el enum `SalesChannel { APP TAQUILLA }`.
  - `soldByPanelUserId String? @db.Uuid`.
- **Sin borrado físico y sin cambios en la auditoría.**

### Cambio de regla (spec, sección 8)

- **Transiciones nuevas**: `PENDIENTE_PAGO → ABONADA` y `PENDIENTE_PAGO → PAGADA`, solo por cobro en efectivo del panel. `transition.ts` ya limpia `expiresAt` al salir de `PENDIENTE_PAGO`; se verifica con un test. El barrido de 2 h solo toca `PENDIENTE_PAGO`, así que una reserva abonada nunca se libera.
- **Conversión de pagos**: si la moneda del pago coincide con la de la reserva, se usa `exchangeRateUsed` (el precio quedó fijado a esa tasa). Si no coincide, se usa `getCurrentExchangeRate(moneda, ahora, tx)` (`src/modules/catalog/rates.ts`). USD y USDT van 1:1. Sin tasa vigente, lanza `ValidationError`.

### Cuentas (`src/modules/accounts`)

- **`createCounterAccount(tx, input)`**: crea la cuenta sin contraseña y audita `CUENTA_CREADA_EN_TAQUILLA` con actor PANEL.
- **`loginAccount`**: devuelve `null` si `passwordHash` es nulo.
- **`registerAccount`**:
  - **Activación**: si la cédula existe y la cuenta no tiene contraseña, la activa solo si coinciden el teléfono normalizado y el año de nacimiento. Audita `CUENTA_ACTIVADA`.
  - **Datos que no coinciden**: lanza `ValidationError("Esta cédula tiene una cuenta creada en taquilla y los datos no coinciden. Acércate a la taquilla de tu agencia.")`.
- **`src/app/registro/page.tsx`**: se añade una línea de ayuda que explica la activación.

### Módulo nuevo `src/modules/counter` (taquilla)

- **`lookupCounterHolder(idNumber, panelUser)`**: consulta auditada.
- **`sellAtCounter(input)`**: orquesta la venta completa en **una sola transacción**.
  - **Archivos**: se guardan en `storage` antes de la transacción. Si esta falla, se borran en el `catch`.
  - Dentro de la transacción:
    1. Busca la cuenta o la crea con `createCounterAccount`.
    2. Crea las filas de documento.
    3. Llama a `createReservationInTx(tx, input, { channel: "TAQUILLA", panelUserId, agencyId })`, que conserva el `FOR UPDATE`, exige la salida de la agencia de la sesión, omite la regla de 12 h y el mensaje de reserva condicional, y audita con actor PANEL.
    4. Llama a `registerCashPaymentInTx` por el total exacto: `amount = amountInCurrency`, `amountUsd = totalUsd`, para que el saldo quede en cero sin error de redondeo. Eso deja la reserva en `PAGADA`.
  - **Después de la transacción**: `issueTicket`.
- **Refactor sin cambio de comportamiento**:
  - `createReservation` pasa a envolver `createReservationInTx`.
  - `registerCashPayment` pasa a envolver `registerCashPaymentInTx`.
  - Ambas funciones nuevas se exportan desde el `index.ts` de su módulo, que es la API pública.
- **Datos de demostración**: `prisma/seed.ts` y `prisma/mock.ts` añaden métodos de pago físico en COP ("Pesos en efectivo") y USDT ("USDT en taquilla") y dos ventas de taquilla de ejemplo.

### Consultas nuevas (`src/modules/reports`, solo lectura, todas filtran por `agencyId` de la sesión)

- **`agencyDashboard(agencyId, range, now)`** (reescrita): tickets pendientes con su desglose, salidas por estado, recaudación y mensajes fallidos.
- **`agencyFleetStatus(agencyId, now)`**: choferes y vehículos con su estado. Usa la función pura `unitStateOf({ active, departures }, now)` en `fleet-status.ts`.
- **`listRecentTickets(agencyId, { from, to, limit })`**.
- **`listAgencyActivity(agencyId, { from, to, limit })`**:
  - **Fuentes**: auditoría de los usuarios de panel de la agencia, más los eventos sobre reservas de la agencia (del pasajero y del sistema).
  - **Texto**: la función pura `describeActivity(entry, lookups)` en `activity.ts` arma la frase. Una acción desconocida muestra un texto genérico.
- **`listAgencyPassengers`**: gana el filtro `view` (`por-revisar`, `por-cobrar`, `pagadas`, `sin-efecto` o `todas`) y los campos `hasPendingProof`, `ticketIssuedAt` y `salesChannel`. Se añade `countAgencyReservationViews`.
- **`getAgencyReservationDetail(reservationId, agencyId)`**: lanza `ForbiddenError` si la reserva es de otra agencia. Reutiliza `proofCoverage`.
- **`AgencyDepartureRow`** (`src/modules/catalog/departures.ts`) gana `boardingStartedAt`. `listAgencyDepartures` se reutiliza para los embarques del día.

### Utilidades (`src/lib`)

- **`time.ts`**: `caracasPeriodRange(periodo, now)` y `periodFromSlug(slug)`. "Hoy" va de las 00:00 de Caracas a ahora; 7 y 30 días empiezan a las 00:00 de 6 y 29 días atrás.
- **`labels.ts`**: `departureStatusLabel/Tone`, `unitStateLabel/Tone` y `salesChannelLabel`.

### Permisos

- **`src/modules/auth/permissions.ts`**: `sales.counter` solo para OPERADOR.

## Componentes nuevos

| Archivo | Contenido |
|---|---|
| `src/components/panel-ui.tsx` | `PanelPageHeader`, `StatCard` (etiqueta, cifra tabular, detalle, `href`), `StatusBadge` (texto y tono), `PanelTabs` (enlaces con `aria-current` y contador), `EmptyState` (mensaje y acción), `panelButtonClass(variant)`, `TableShell` |
| `src/components/panel-nav.tsx` | Menú agrupado del panel (cliente) e `isActivePanelPath` |
| `src/components/icons.tsx` | Se añaden `IconCash`, `IconChart`, `IconList`, `IconPlus` e `IconStore` al set existente |
| `src/app/panel/_forms/*.tsx` | `cash-payment-form`, `departure-form`, `vehicle-form` y `driver-form`, compartidos entre página y registro rápido |
| `src/app/panel/pasajeros/reservation-detail.tsx`, `proof-review.tsx` | Contenido de los paneles laterales |
| `src/app/panel/taquilla/counter-sale-form.tsx` | Asistente de venta (cliente) |

## Tests propuestos

**Unitarios** (`pnpm test`):

- `tests/unit/booking/state-machine.test.ts`: dos transiciones nuevas permitidas; `PENDIENTE_PAGO → NO_SHOW` sigue prohibida.
- `tests/unit/lib/time.test.ts`: `caracasPeriodRange` en los tres periodos, con el borde de medianoche en Caracas (UTC−4), y `periodFromSlug` con valores inválidos.
- `tests/unit/lib/labels.test.ts`: etiquetas y tonos nuevos, y el caso desconocido.
- `tests/unit/reports/fleet-status.test.ts`: `unitStateOf` en cinco estados.
  - Precedencia: EN_RUTA > MANIFIESTO_CERRADO > próxima PROGRAMADA > disponible.
  - Inactivo gana a todo menos a un viaje en curso.
- `tests/unit/reports/activity.test.ts`: `describeActivity` en cada acción conocida y en una desconocida. Nunca incluye la cédula.
- `tests/unit/panel/nav.test.ts`: `isActivePanelPath`.
  - `/panel` solo coincide consigo mismo.
  - `/panel/salidas/abc` activa Salidas.
- `tests/unit/auth/permissions.test.ts`: `sales.counter` para OPERADOR y no para ADMIN.

**Integración** (`pnpm test:integration`, secuenciales porque comparten la base):

- `tests/integration/payments/installments.test.ts`:
  - Cobro en VES sobre una reserva en USD convierte con la tasa vigente.
  - Sin tasa vigente lanza `ValidationError`.
  - Cobro completo sobre `PENDIENTE_PAGO` deja `PAGADA` y `shouldIssueTicket`.
  - Cobro parcial deja `ABONADA` con `expiresAt` nulo y el barrido de liberación no la toca.
  - Comprobante en VES sobre una reserva en USD convierte bien.
- `tests/integration/accounts/register.test.ts`:
  - Activar una cuenta de taquilla con los datos correctos permite ingresar.
  - Con datos que no coinciden lanza `ValidationError` y la cuenta sigue sin contraseña.
  - `loginAccount` de una cuenta sin activar devuelve `null`.
- `tests/integration/counter/sell-at-counter.test.ts` (nuevo):
  - Venta con cuenta nueva: `PAGADA`, ticket emitido, `salesChannel = TAQUILLA`, auditoría con actor PANEL y cuenta sin contraseña.
  - Venta a una cuenta existente, sin duplicarla.
  - Sin foto de cédula lanza `MissingDocumentsError`.
  - Menor sin permiso de viaje se rechaza.
  - Salida de otra agencia lanza `ForbiddenError`.
  - A menos de 12 h de la salida se permite.
  - Con el manifiesto cerrado lanza `DepartureClosedError`.
  - Sin cupo lanza `NoSeatsAvailableError` y **no deja nada persistido** (ni cuenta, ni documentos, ni reserva).
  - Dos ventas simultáneas por el último puesto: una sola tiene éxito.
- `tests/integration/booking/create-reservation.test.ts`: el existente, sin cambios y en verde. Resguarda el refactor a `createReservationInTx`.
- `tests/integration/reports/agency-dashboard.test.ts` (nuevo): conteos y recaudación por periodo, con otra agencia que nunca suma.
- `tests/integration/reports/fleet-status.test.ts` (nuevo): chofer en ruta, con próxima salida e inactivo.
- `tests/integration/reports/activity.test.ts` (nuevo):
  - Solo aparecen acciones de la agencia.
  - Los eventos del pasajero sobre sus reservas aparecen.
  - Los de otra agencia no.
- `tests/integration/reports/agency-passengers.test.ts`: las cinco vistas y los conteos, más `getAgencyReservationDetail` con aislamiento por agencia.

**Verificación reforzada (mutación manual del orquestador):**

- Quitar el `FOR UPDATE` de `createReservationInTx`: el test de concurrencia de taquilla debe romperse.
- Volver a convertir con `exchangeRateUsed`: el test de cobro en VES debe romperse.
- Quitar el filtro de agencia en `listAgencyActivity`: el test de aislamiento debe romperse.

**Criterio de terminado de la ronda**:

- `pnpm typecheck` y `pnpm lint` limpios, y `pnpm test` y `pnpm test:integration` en verde.
- Revisión visual a 375 px y 1280 px de `/panel`, `/panel/pasajeros`, `/panel/taquilla`, `/panel/salidas`, `/panel/flota` y `/panel/reportes`: sin desplazamiento horizontal, foco visible con Tab y ningún estado mostrado solo con color.
- Las URL viejas redirigen.

## Tareas delegables

Cada tarea la ejecuta un subagente `implementador` con su brief en `.superpowers/sdd/splendid-drifting-sutton/T{n}.md`, las restricciones globales y su reporte. Los subagentes no hacen commits. No editan archivos compartidos que no figuren en su tarea: si necesitan algo de otro módulo, lo reportan.

**T0. Rama (orquestador)**

1. Verifica `typecheck` y `test` sobre la ronda 2.
2. Lee `.claude/settings.json` antes de incluirlo.
3. Commitea la ronda 2 en `feat/passenger-app-ui`, incluidos `.claude/agents/implementador.md`, `.claude/launch.json` y `docs/prompts/`.
4. Crea `feat/operator-panel`.

**T1. Correcciones de pagos (TDD)**

- **Qué**: conversión de moneda en `submitProof` y `registerCashPayment`, más las dos transiciones nuevas.
- **Archivos**: `src/modules/payments/record-payment.ts` y `src/modules/booking/state-machine.ts`. Solo se toca `transition.ts` si el test de `expiresAt` falla.
- **Tests**: los de `state-machine` e `installments` de arriba, escritos primero y vistos fallar.
- **Sección 8 de la spec**: la actualiza T12.

**T2. Esquema y cuentas de taquilla**

- **Qué**: migración, `createCounterAccount`, `loginAccount`, activación en `registerAccount`, línea de ayuda en `/registro`, permiso `sales.counter` y actualización de `tests/integration/fixtures.ts` si hace falta.
- **Precondición**: detener `pnpm dev` y `pnpm worker:dev` antes de migrar (bloqueo de Prisma en Windows).
- **Tests**: `register` y `permissions`.

**T3. Consultas del panel**

- **Qué**: todo lo de `src/modules/reports` descrito arriba, `boardingStartedAt` en `catalog/departures.ts`, `caracasPeriodRange` y `periodFromSlug` en `time.ts`, y las etiquetas nuevas en `labels.ts`. Añade `countPendingProofs(agencyId)` a `payments/review.ts` para el contador del menú.
- **Tests**: unitarios de tiempo, etiquetas, `fleet-status` y `activity`, más las integraciones de reportes.

**T4. Venta en taquilla (dominio)**

- **Qué**: módulo `counter`, refactor a `createReservationInTx` y `registerCashPaymentInTx`, y métodos COP y USDT en `seed` y `mock`.
- **Tests**: `sell-at-counter` completo y `create-reservation` existente en verde.

**T5. Shell del panel y piezas base (UI)**

- **Qué**: `panel-ui.tsx`, `panel-nav.tsx` e `isActivePanelPath`, `src/app/panel/layout.tsx`, tokens aditivos en `globals.css` e iconos nuevos. `PanelNav` recibe el contador como prop opcional; sin valor no muestra la insignia. T6 conecta el contador en el layout con `countPendingProofs`.
- **Tests**: `nav.test.ts`.

**T6. Pasajeros y pagos unificado (UI)**

- **Qué**:
  - Página con pestañas y paneles laterales, `reservation-detail.tsx` y `proof-review.tsx`.
  - `src/app/panel/pasajeros/actions.ts`, con las acciones movidas de `pagos/actions.ts`. `cashPaymentAction` acepta `reservationId` o `code`, más `origen`.
  - `_forms/cash-payment-form.tsx` y la redirección de `/panel/pagos`.
  - Se actualizan los `revalidatePath` de las demás acciones que apuntaban a `/panel/pagos`.
  - Se conecta el contador de "Pasajeros y pagos" en `src/app/panel/layout.tsx` con `countPendingProofs`.
- **Tests**: unitario de `viewFromSlug`.

**T7. Flota (UI)**

- **Qué**: `/panel/flota/page.tsx`, `_forms/vehicle-form.tsx` y `driver-form.tsx`, `flota/actions.ts` (redirección a `/panel/flota` más `origen`) y redirecciones de `/panel/vehiculos` y `/panel/choferes`.

**T8. Salidas y manifiesto (UI)**

- **Qué**: listado, panel "Crear salida", `_forms/departure-form.tsx`, pasos del manifiesto y `origen` en `salidas/actions.ts`.

**T9. Reportes (UI)**

- **Qué**: `/panel/reportes/page.tsx` con pestañas y redirecciones de `/panel/recaudacion` y `/panel/movimientos`.

**T10. Taquilla (UI)**

- **Qué**: `/panel/taquilla/page.tsx`, `counter-sale-form.tsx` y `actions.ts`.
  - Acciones: `lookupHolderAction` y `sellAtCounterAction` con `useActionState`. Los archivos van por `FormData`, con tope de 5 MB y verificación de firma a cargo de `storage`.
  - Tarjeta de resultado con QR.

**T11. Tablero (UI)**

- **Qué**: `/panel/page.tsx` completo, que reúne las consultas de T3 y los formularios de T6 a T8 en el registro rápido.

**T12. Documentación y cierre**

- **`CLAUDE.md`**: glosario con el módulo `counter`, las funciones nuevas de `reports`, los componentes del panel, las rutas y el permiso.
- **Spec**:
  - 3.1: cuentas creadas en taquilla y su activación.
  - 8: transiciones nuevas.
  - 11: conversión de moneda.
  - 13: mapa nuevo del panel.
- **Otros documentos**: `docs/operacion.md` (rutina del operador renovada), `README.md` (recorrido del operador) y `docs/superpowers/plans/2026-09-13-operator-panel.md` con este plan y su resultado.

### Orden y paralelismo

| Ola | Tareas | Motivo |
|---|---|---|
| 0 | T0 | Rama |
| 1 | T1 ‖ T5 | T1 usa la base de test; T5 es solo UI y no la usa |
| 2 | T2 | Migración (con los servidores detenidos) |
| 3 | T3 | Integración; desbloquea la UI |
| 4 | T4 ‖ T6 ‖ T7 ‖ T8 ‖ T9 | T4 es la única con base de test; T6 a T9 tocan archivos disjuntos |
| 5 | T10 | Depende de T4 y T5 |
| 6 | T11 | Reúne todo |
| 7 | T12, luego verificación del orquestador | — |

## Verificación de cierre (orquestador)

1. `pnpm db:test:up`, luego `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm test:integration`, todo en verde.
2. Las tres mutaciones manuales: cada test correspondiente debe romperse, y después se restaura el código.
3. `rm -rf .next` y un único `pnpm dev`.
4. **Sesión de operador sin escribir contraseñas**: script con `createPanelSession` de `@/modules/auth` vía `tsx` y cookie del panel fijada con `document.cookie` en el navegador integrado, el mismo truco de la ronda 2. Comprobaciones con `javascript_tool` (overflow horizontal, `aria-current`, foco) y `get_page_text` a 375 y 1280 px en las seis pantallas.
5. Venta de taquilla de punta a punta en dev con el mock: ticket con QR y reserva visible en "Pagadas" con canal Taquilla.
6. Activación de la cuenta en `/registro`: se prueba solo por test de integración; el login en navegador lo hace el operador.
7. Actualizar la memoria de la ronda 3 y ofrecer `/liminalsync`.

## Supuestos y riesgos declarados

- **"Tickets pendientes" = reservas abiertas sin ticket** de salidas no partidas. No incluye las pagadas.
- **La recaudación suma tarifa y tasa de salida**, igual que el reporte actual. El desglose por destinatario queda para una ronda posterior, porque un abono parcial no se reparte de forma unívoca.
- **La activación de una cuenta de taquilla** se protege con teléfono y año de nacimiento. Quien conozca ambos datos de otra persona podría activarla. Se acepta para el MVP y se documenta.
- **Consulta de titular en taquilla**: revela si una cédula tiene cuenta en el terminal y su nombre. Queda auditada.
- **La bitácora del tablero** consulta primero las reservas de la agencia con actividad en el periodo (tope de 500) y después la auditoría. Si hay más, se muestra la leyenda "mostrando la actividad más reciente".
- **Archivos huérfanos**: si `sellAtCounter` falla después de guardar archivos, se borran en el `catch`. Si el proceso muere antes, quedan huérfanos en `uploads/`, sin fila en base de datos.
- **Ticket en efectivo**: `issueTicket` se ejecuta fuera de la transacción, como en la aprobación de pagos actual. Un fallo deja la reserva `PAGADA` sin PDF, igual que hoy.
- **Deuda previa del módulo de pagos**: `payments` ya importa internos de `booking` (`booking/transition`, `booking/errors`). No se corrige en esta ronda, pero los módulos nuevos solo importan desde los `index.ts`.

---

## Ejecución

Ronda ejecutada como **ronda 4** (la "ronda 3" ya la usó la sesión de fallas de uso `fix-ticketruta-access-errors`, intercalada entre la aprobación de este plan y su despacho). Ledger completo en `.superpowers/sdd/splendid-drifting-sutton/progress.md`.

### Decisiones del orquestador durante la ejecución

| Decisión | Motivo |
|---|---|
| **R1.** Los implementadores no commitean (agente `implementador`, plan aprobado); el orquestador commitea cada tarea con rutas explícitas al recibir DONE y revisa por rango `C^..C`. | Respeta el plan y aísla tareas paralelas; el riesgo de no hacerlo es mezclar archivos de otra tarea en un commit, detectable con `git status`. |
| **R2.** La ronda se llama "ronda 4" en memoria y documentos; la copia del plan queda en `docs/superpowers/plans/2026-09-13-operator-panel.md`. | "Ronda 3" ya existía (fallas de uso). |
| **R3.** Sin worktree; se trabaja en `feat/operator-panel` en el checkout principal. | Decisión del operador. |
| **R4.** T1 divide mecánicamente `tests/integration/panel/operator-actions.test.ts` en `payment-actions.test.ts`, `departure-actions.test.ts` y `fleet-actions.test.ts`, sin cambiar aserciones. | T6, T7 y T8 quedan dueños de un archivo cada uno para trabajar en paralelo. |
| **R5.** T5 crea `src/lib/panel-nav.ts` puro con los grupos del menú, `isActivePanelPath`, `legacyPanelRedirect` y `parsePanelOrigin`; `panel-nav.tsx` (cliente) solo lo consume; tests en `tests/unit/panel/nav.test.ts`. | Testeable en Node y contrato único para T6–T9 y T11. |
| **R6.** `reservationViewFromSlug` y `RESERVATION_VIEWS` los crea T3 en `src/modules/reports/payment-state.ts` con test; T6 los consume. | El parseo de slug pertenece junto a `paymentStateFromSlug`. |
| **R7.** T3 mantiene compilando `src/app/panel/page.tsx` con un ajuste mínimo tras cambiar `agencyDashboard`; T11 la reescribe. | `typecheck` verde en cada tarea intermedia. |
| **R8.** T8 usa `availableTripActions` (ya existente, ronda 3) para los pasos del manifiesto y cambia `revalidatePath("/panel/movimientos")` por `/panel/reportes` en `salidas/actions.ts`. | Reutilización en vez de duplicar, y ruta nueva. |
| **R9.** En la ola 4, T6–T8 no ejecutan tests de integración (T4 usa la base); actualizan su archivo de acciones partido y el orquestador corre `pnpm test:integration` completo al cerrar la ola, anexando la salida a sus reportes. T4 corre solo sus archivos de integración. | La base de test es compartida entre subagentes. |
| **R10.** T4 añade `deleteUpload(relativePath)` a `src/lib/storage.ts`. | Limpieza de archivos tras un fallo de la venta en taquilla. |
| **R11.** T2 detiene el `pnpm dev` que escucha en `:3000` (y el worker si corre) antes de migrar. | Plan aprobado y bloqueo de Prisma en Windows con el servidor activo. |
| **R12.** T3 se divide en T3a (periodos, etiquetas, `agencyDashboard`, `agencyFleetStatus`, `listRecentTickets`, `boardingStartedAt`, ajuste mínimo de `/panel`) y T3b (vistas de reserva, `countAgencyReservationViews`, `listPendingProofQueue`, `getAgencyReservationDetail`, `countPendingProofs`, `listAgencyActivity`); olas revisadas: 1) T1‖T5 · 2) T2 · 3) T3a · 4) T3b‖T7‖T8‖T9 · 5) T4‖T6 · 6) T10 · 7) T11 · 8) T12. | T3 excedía el contexto razonable de un subagente y T7–T9 solo dependen de T3a. |
| **R13.** `listPendingProofQueue` (reports) sustituye la consulta Prisma que vivía en `pagos/page.tsx`. | Las páginas no deben consultar Prisma directo, y T6 la necesitaba. |
| **R14.** La migración de T2 se genera con `prisma migrate diff` desde la base de test y se aplica con `migrate deploy` en test y desarrollo; prohibido `migrate dev`/`reset`. | Evitar un reinicio destructivo de la base de desarrollo por drift de esquema. |
| **R15.** T10 añade `experimental.serverActions.bodySizeLimit: "12mb"` en `next.config.ts`. | El límite por defecto de las acciones de servidor es 1 MB y la venta en taquilla sube cédula más permiso (hasta 5 MB cada uno); de paso corrige un fallo latente en `/mi/documentos` y en el abono con comprobante del pasajero. |
| **R16.** `lookupCounterHolder` devuelve también `hasCedula` y `hasTravelPermit` (brief de T4 ampliado antes de despachar). | La pantalla de taquilla debe saber si pedir el permiso de viaje cuando viaja un acompañante menor. |
| **R17** (hallazgo de la revisión de T2). El hallazgo de fuerza bruta en la activación de una cuenta de taquilla (teléfono + año, ≈126 valores, sin límite de intentos) entra en la ronda de fix con mitigación mínima: límite por cédula con `checkLoginRate("activacion:<cédula>")` (5 intentos por 15 minutos, módulo existente) y se hashea solo después de que coincidan los datos; se conserva el mensaje de "datos que no coinciden". | El riesgo aceptado en el plan original suponía conocer ambos datos, no probarlos por fuerza bruta; el arreglo es barato. |
| **R18.** La ronda de fix de T6 no corre integración mientras T10 usa la base; el orquestador corre `payment-actions.test.ts` al terminar T10. | La base de test es compartida. |

### Olas ejecutadas

| Ola | Tareas | Base (HEAD de partida) | Cierre |
|---|---|---|---|
| 0 | T0 (rama) | ronda 2 (`feat/passenger-app-ui`) | Commit `528b09c`; nace `feat/operator-panel` |
| 1 | T1 ‖ T5 | `528b09c` | T1 → `2247acc`; T5 → `261987c` |
| 2 | T2 | `2247acc` | `686aa55`; fix round 1 tras revisión → `74c627a` |
| 3 | T3a | `686aa55` | `05e7582` |
| 4 | T3b ‖ T7 ‖ T8 ‖ T9 | T3b sobre `74c627a` (única con base de test); T7‖T8‖T9 sobre `05e7582` | T9 → `3d19c1c`; T7 → `6a14aba`; T8 → `3678cef`; T3b → `f5b221e`; cierre de ola: `pnpm test:integration` 16 archivos / 134 tests en verde sobre `f5b221e` |
| 5 | T4 ‖ T6 | `f5b221e` | T6 → `5462aa0`, fix round 1 → `da0b362`; T4 → `6e1df2d`; cierre de ola: `pnpm test:integration` 18 archivos / 159 tests en verde sobre `6e1df2d` |
| 6 | T10 | `6e1df2d` (única con base de test) | `af6ca9f`, fix round 1 → `acdad3d`; cierre: `pnpm test:integration` 18 archivos / 161 tests en verde, `payment-actions.test.ts` 11/11 |
| 7 | T11 | `af6ca9f` | `7afcb4e` |
| 8 | T12 (esta tarea), en paralelo con la revisión de solo lectura de T11 | `7afcb4e` | — |

## Resultado

### Por tarea

| Tarea | Estado | Commits | Desvíos declarados |
|---|---|---|---|
| T0 | complete | `528b09c` | Ninguno. |
| T1 | complete (review clean) | `2247acc` | RED/GREEN de las partes A y B verificado; el test de acciones del panel se partió en 3 archivos (mecánico, sin cambiar aserciones). La actualización de la spec §8 y "Estados de reserva" de `CLAUDE.md` quedó pendiente para T12 (cubierta en esta tarea). |
| T2 | complete (review clean tras fix round 1) | `686aa55` → fix `74c627a` | La revisión (opus) encontró una carrera en la activación (update sin condición `passwordHash: null`) y ausencia de límite de intentos contra fuerza bruta; ambos se corrigieron en el fix round 1 (ver R17). |
| T3a | complete (review clean) | `05e7582` | Un hallazgo de la revisión (`failedMessages` sin `reservationId` de lista de espera) se confirmó como comportamiento ya existente, sin regresión. |
| T3b | complete (review clean) | `f5b221e` | Ninguno relevante. |
| T4 | complete (review clean) | `6e1df2d` | `prisma/mock.ts` no crea métodos de pago nuevos, solo marca 2 reservas existentes como `TAQUILLA` (ahorra generación); el borrado de archivos en el `catch` se acotó a la transacción de la venta, no a la emisión del ticket (`issueTicket` corre después, fuera de la transacción, igual que en la aprobación de pagos). |
| T5 | complete (review clean) | `261987c` | Alcance ampliado por el orquestador durante la ola: se agregaron `panelInputClass` y `PANEL_LABEL_CLASS` (no estaban en el brief original) para que los formularios del panel tuvieran un input y una etiqueta comunes; `--exito-suave` se ajustó a `#eaf6ef` por contraste. |
| T6 | complete (review clean tras fix round 1) | `5462aa0` → fix `da0b362` | La revisión (opus) encontró una regresión en la validación del serial (sin `trim`/longitud mínima) y que una página fuera de rango quedaba con una tabla vacía falsa tras cobrar o aprobar (se había quitado la redirección que traía la página vieja de pagos); ambos se corrigieron en el fix round 1. |
| T7 | complete (review clean, integración verificada) | `6a14aba` | Ninguno relevante. |
| T8 | complete (review clean, integración verificada) | `3678cef` | Ninguno relevante. |
| T9 | complete (review clean) | `3d19c1c` | El propio implementador señaló duplicación de las pestañas de periodo entre las dos vistas de Reportes (quedó como deuda menor). |
| T10 | complete (review clean tras fix round 1) | `af6ca9f` → fix `acdad3d` | La revisión (sonnet) encontró que `holderBirthYear` no tenía validación zod (podía llegar `NaN` a Prisma) y que `receivedAmount` no se reiniciaba al cambiar de método o moneda (vuelto incorrecto); ambos se corrigieron en el fix round 1. |
| T11 | complete (review despachada, en paralelo con T12) | `7afcb4e` | `min-h-11!` se usó en los botones del registro rápido para respetar el mínimo de 44 px; el periodo elegido se conserva también en los CTA de dos estados vacíos, no solo en los indicadores. |

### Pendientes (`minor (deferred)` del ledger, agrupados por tarea)

**T1 — pagos y máquina de estados**
- `record-payment.ts` importa `getCurrentExchangeRate` desde `@/modules/catalog/rates` en vez de su `index.ts`.
- `CURRENCY_LABELS` tiene una identidad innecesaria y `paymentAmountUsd` repite una rama igual a otra.
- El caso "sin tasa vigente" no fija el texto exacto del `ValidationError`; falta el caso equivalente en `submitProof`.
- Montos de test con 3 decimales ("367.412") sobre columnas `Decimal(18,2)`, sin caso de redondeo no exacto.
- Los casos de integración 3 y 4 de la parte B no se vieron en RED (el RED de esa parte quedó cubierto por el unitario).

**T2 — cuentas de taquilla**
- Tests usan `toThrow(texto)` sin verificar la clase `ValidationError`.
- Identificadores nuevos en español (`validarDatosDeCuenta`, `DatosValidados`) contra la regla de `CLAUDE.md` de identificadores en inglés.
- `schema.prisma` desalineado en `PassengerAccount` (falta `prisma format`).
- `/registro` normaliza teléfonos siempre como Venezuela; una cuenta de taquilla con país Colombia no podría activarse.
- La activación no verifica el campo `active` de la cuenta.
- El test "limpia el contador" no ejercita realmente `clearLoginRate` (la rama de cuenta con contraseña se evalúa antes).
- `register.ts` importa `rate-limit`, `passwords` y `sessions` desde internos de `auth` en vez de su `index.ts` (patrón que ya traía el archivo).

**T3a/T3b — consultas del panel**
- `tests/integration/reports/fleet-status.test.ts` usa el reloj real en vez de un `now` fijo.
- Sin test del orden completo de choferes y vehículos en `agencyFleetStatus`.
- Parámetro `now` inerte en `agencyDashboard` (`void now`).
- `activity.test.ts` de integración no verifica los textos exactos de `ESTADO_EN_VALIDACION`/`ESTADO_ABONADA`.
- Cast `registro.after as Record<string, unknown>` sin guarda de tipo en `activity.ts`.
- El bucle de "sin doble espacio" de los textos de actividad omite las acciones `VEHICULO_*`/`CHOFER_*`.

**T4 — venta en taquilla**
- **Sugerido para triage final**: test de `listCounterOptions` no verifica aislamiento por agencia ni exclusión de métodos `DIGITAL` (una aserción `currency !== undefined` es siempre verdadera).
- **Sugerido para triage final**: ni `createReservationInTx` (canales APP y TAQUILLA) ni `quoteCounterSale` verifican que el método de pago sea del terminal o de la agencia (preexistente en APP).
- `quoteCounterSale` no rechaza métodos inactivos, usa un literal `6` y duplica textos de error.
- `sell.ts` usa aserciones `!`, un literal "5 MB" y repite el bucle de `DOCUMENT_LABELS`; `createReservationInTx` tiene ~207 líneas con 7 chequeos de canal.
- Huecos de test: colisión `P2002` de `idNumber`, el perdedor de una carrera de concurrencia sin residuos, monto en VES, `after.channel`, `PERMISO_VIAJE` con actor PANEL, textos exactos de `lookup`/`quote`.
- `rateFromUsd` nulo es ambiguo entre "no aplica" y "falta tasa".

**T5 — shell del panel**
- `hover:brightness-90` en los botones primario/éxito/peligro no lo pedía el brief (`panel-ui.tsx`).
- El menú móvil fusiona el nombre de la agencia y "Menú" en el mismo `<summary>` (`panel-nav.tsx`).
- El test de `OPERATOR_NAV` no verifica `icon` ni `badgeKey`.
- `StatCard` pone `value: ReactNode` dentro de un `<p>`; un contenido de bloque generaría HTML inválido.

**T6 — pasajeros y pagos**
- **Sugerido para triage final**: el aviso `ok` tras cobrar o aprobar desde el panel de reserva queda tapado por el fondo del modal (`page.tsx:242`).
- **Sugerido para triage final**: sin test de aislamiento del cobro por `reservationId` de otra agencia.
- Aserciones incompletas en `payment-actions` (`registrar=cobro`, `pathname`).
- `formatSaldoUsd` duplica `formatUsdString` y usa `Number()`.
- Duplicación de `HiddenFields`, el objeto destino y `pasajerosUrlFromHidden`; `urls.ts`, que se supone "puro", importa `reports`.
- El textarea de rechazo no usa `panelInputClass`/`PANEL_LABEL_CLASS`; los enlaces a PDF/imagen no tienen `focus-visible`; `panelInputClass("w-32")` choca con su `w-full` por defecto.
- `EmptyState` sin acción; los paneles laterales son apilables por URL manual; `countPendingProofs` se consulta dos veces; `page.tsx` de 503 líneas.

**T7 — flota**
- El fallback `departedAt ?? departsAt` se rotula "Salió" en `flota/page.tsx` aunque no haya salido.
- El enlace "Editar" repite las mismas clases en ambas tablas.
- `?vista=choferes&registrar=vehiculo` escrito a mano abre el alta de vehículo estando en la pestaña de choferes.

**T8 — salidas y manifiesto**
- Un error de alta sin origen desde "Historial" no conserva `ver=historial` (literal al brief, no un error).
- El subtítulo de la ruta usa `text-xs`.
- Sin test de las llamadas nuevas a `revalidatePath("/panel")`.

**T9 — reportes**
- Con cero filas, `revenue-view` y `movements-view` muestran la tabla vacía y el `EmptyState` a la vez.
- `periodoTabs` está duplicado entre `revenue-view.tsx` y `movements-view.tsx` (podría ser una función pura en `range.ts`).

**T10 — taquilla (UI)**
- `step-departure.tsx` reimplementa `formatUsdString` sin documentar por qué (`decimal.ts` importa `@prisma/client`, no apto para un componente de cliente).
- Los helpers `taquilla*Class` viven en `step-payment.tsx` pero se usan en todo el asistente.
- La aritmética del conteo de tests del reporte de T10 no cuadra (sin efecto en el código).
- La acción no aplica un rango de año plausible por sí misma; lo valida el dominio (`createCounterAccount` y la validación de acompañantes en `createReservationInTx`).

### Verificación final

Pendiente de la verificación del orquestador.
