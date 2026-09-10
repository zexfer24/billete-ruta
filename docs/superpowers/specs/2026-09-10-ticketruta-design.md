# TicketRuta — Especificación de diseño (revisión 2)

Fecha: 2026-09-10
Revisión 2: incorpora los requisitos de terminal con múltiples agencias, cuentas de pasajero por cédula, vehículos, choferes, movimientos de embarque y desembarque, tasa de salida y abonos parciales.
Estado: aprobado por el operador. Objetivo inmediato: MVP ejecutable en localhost.

## 1. Propósito

TicketRuta digitaliza la operación de un **terminal de pasajeros terrestre** regulado por el Estado. El terminal aloja varias **agencias de viaje** (operadores) que venden pasajes en sus propias rutas con sus propios vehículos y choferes. El sistema sustituye el registro en papel y el cobro informal por un flujo con identidad verificada, pago con comprobante, ticket digital con QR, control de embarque y desembarque, y estadística en tiempo real para el terminal.

Fuente de requisitos: los cuatro PDF en `Documentación/` más los requisitos por rol entregados por el operador el 2026-09-10.

## 2. Los tres actores

| Actor | Quién es | Qué hace |
|---|---|---|
| **Pasajero** | Ciudadano con cédula | Crea cuenta con su cédula, reserva asientos, paga o abona, sube sus documentos, recibe su ticket |
| **Operador** | Personal de una agencia de viajes | Confirma pagos, gestiona sus vehículos, choferes, salidas y pasajeros, ve su recaudación por ruta |
| **Admin** | Administrador del terminal | Ve la recaudación por tasa de salida en tiempo real, los recorridos, la base de datos de usuarios y los movimientos de todas las agencias |

Un operador solo ve y modifica datos de **su** agencia. El admin ve todo el terminal. El aislamiento por agencia es una regla de seguridad, no una conveniencia de interfaz: toda consulta del panel de operador filtra por `agencyId` de la sesión.

## 3. Requisitos por actor

### 3.1 Pasajero

- **Cédula obligatoria para acceder al sistema.** Es el identificador de la cuenta. Sin cuenta no se reserva.
- Datos complementarios exigidos para reservar un asiento: **número de teléfono** y **año de nacimiento**.
- Datos exigidos para concretar la venta: **foto de la cédula** (obligatoria) y **permisos de viaje** (opcional; se usa para menores de edad o casos especiales).
- Puede reservar para acompañantes; de cada acompañante se pide nombre completo, cédula y año de nacimiento.
- Puede **abonar parcialmente** una reserva y completar el pago después. El ticket se emite solo cuando el saldo llega a cero.

### 3.2 Operador

- **Total recaudado por cada una de sus rutas**, en ventana de 24 horas y con horas presentadas en formato de 24 horas.
- **Módulo de confirmación de pagos**: ve el comprobante que subió el pasajero, el monto abonado y el saldo, y aprueba o rechaza.
- **Datos de sus pasajeros**: quién compró el ticket, serial del ticket, y si el pago está pendiente, abonado o confirmado.
- **Datos de sus vehículos**: placa, modelo, marca y número de asientos.
- **Datos de sus choferes**: nombre, cédula, total de embarques y total de desembarques.
- **Lista de movimiento de sus choferes**: hora de embarque, tiempo de recorrido y hora de desembarque.

### 3.3 Admin

- **Total recaudado por la tasa de salida en tiempo real**, ventana de 24 horas, horas en formato de 24 horas.
- **Total de recorridos del terminal.**
- **Total de usuarios nuevos** del terminal en el periodo.
- **Total de usuarios recurrentes** (cuentas con dos o más viajes pagados).
- **Base de datos de usuarios**, con información sensible. Todo acceso queda auditado.
- **Lista de movimientos de las agencias**: horas de embarque y desembarque, ruta, duración, nombre del chofer y cantidad de pasajeros.

## 4. Tasa de salida

El terminal cobra una **tasa de salida por pasajero**, independiente de la tarifa de la agencia. El total que paga el pasajero es `tarifa × pasajeros + tasa × pasajeros`. El sistema guarda ambos montos por separado en cada reserva, porque la tarifa es ingreso de la agencia y la tasa es ingreso del terminal. El admin configura el monto vigente de la tasa; los cambios no afectan reservas ya creadas.

## 5. Decisiones técnicas

| Tema | Decisión |
|---|---|
| Enfoque | Monolito Next.js 15 con proceso worker aparte |
| Base de datos | PostgreSQL 16 con Prisma, en contenedor Docker para desarrollo local |
| Entrega inmediata | **MVP en localhost** con `pnpm dev` y `pnpm worker:dev` |
| WhatsApp | Interfaz `WhatsAppProvider`. En el MVP solo la implementación falsa, con una bandeja de mensajes visible en el panel. La Meta Cloud API queda documentada y fuera del MVP |
| Inventario | Cupo por salida, tomado del número de asientos del vehículo asignado. Sin asiento numerado |
| Precios | Tarifa base en USD por ruta, tasa de salida en USD, tasas de cambio USD→VES y USD→COP configurables. La reserva guarda la tasa usada |
| Pagos | Digitales con comprobante obligatorio, o en sitio. Se admiten abonos parciales |
| Liberación de cupo | Reserva sin ningún pago a las 2 h de creada. Reserva de pago en sitio no reconfirmada 12 h antes de la salida |
| Zona horaria | `America/Caracas` para presentación y programación; almacenamiento en UTC. Horas siempre en formato de 24 horas |
| Auth | Dos ámbitos separados: cuentas de pasajero (cédula + contraseña) y usuarios de panel (email + contraseña, rol `ADMIN` u `OPERADOR`) |

## 6. Stack

Next.js 15 (App Router, TypeScript estricto), React 19, Prisma 6, PostgreSQL 16, pg-boss 10, Tailwind CSS, zod, argon2, pdf-lib, qrcode, Vitest, Playwright, pnpm 11, Node 22 o superior.

```
src/
  app/
    (publico)/           portada, registro, login de pasajero
    mi/                  área del pasajero: reservar, mis reservas, documentos
    panel/               panel de operador y de admin
    api/                 rutas de API y webhook
  modules/
    accounts/            cuentas de pasajero, documentos
    agencies/            agencias, vehículos, choferes
    catalog/             rutas, salidas, tasas de cambio, tasa de salida, métodos de pago
    booking/             reservas, cupos, estados, lista de espera
    payments/            abonos, comprobantes, validación
    tickets/             PDF, QR firmado, verificación
    trips/               embarque, desembarque, movimientos
    messaging/           proveedor WhatsApp, plantillas, cola
    scheduler/           ventanas de tiempo de los barridos
    auth/                sesiones y permisos de ambos ámbitos
    reports/             consultas agregadas de operador y admin
    audit/               bitácora
  lib/                   prisma, env, decimal, tiempo, identidad, almacenamiento
  worker/                proceso de jobs
prisma/                  esquema y migraciones
tests/                   unit/, integration/, e2e/
docker/                  compose de PostgreSQL para desarrollo y test
```

Cada módulo expone su API pública desde `index.ts`. Ningún módulo importa archivos internos de otro.

## 7. Modelo de datos

Enumeraciones:

- `ReservationStatus`: `PENDIENTE_PAGO`, `EN_VALIDACION`, `ABONADA`, `PAGADA`, `PAGO_EN_SITIO`, `LIBERADA`, `CANCELADA`, `ABORDADA`, `NO_SHOW`
- `DepartureStatus`: `PROGRAMADA`, `MANIFIESTO_CERRADO`, `EN_RUTA`, `FINALIZADA`, `CANCELADA`
- `PaymentKind`: `DIGITAL`, `FISICO`
- `Currency`: `USD`, `VES`, `COP`, `USDT`
- `ProofStatus`: `PENDIENTE`, `APROBADO`, `RECHAZADO`
- `DocumentType`: `CEDULA`, `PERMISO_VIAJE`
- `MessageStatus`: `ENCOLADO`, `ENVIADO`, `ENTREGADO`, `LEIDO`, `FALLIDO`
- `WaitlistStatus`: `EN_ESPERA`, `NOTIFICADO`, `CONVERTIDO`, `EXPIRADO`
- `PanelRole`: `ADMIN`, `OPERADOR`
- `AttendanceResponse`: `CONFIRMA`, `INCONVENIENTE`
- `ActorType`: `PASAJERO`, `PANEL`, `SISTEMA`

Entidades. Todas con `id` UUID, `createdAt` y `updatedAt`.

**Identidad y agencias**

- `PassengerAccount`: `idNumber` único y normalizado, `fullName`, `phone`, `birthYear` (entero), `passwordHash`, `lastLoginAt`, `active`. La cédula es la credencial de acceso.
- `PassengerDocument`: `accountId`, `type`, `filePath`, `originalName`, `uploadedAt`, `verifiedAt`, `verifiedByPanelUserId`.
- `Agency`: `name`, `taxId` (RIF) único, `contactPhone`, `contactEmail`, `active`.
- `PanelUser`: `email` único, `passwordHash`, `name`, `role`, `agencyId` nulo solo para `ADMIN`, `active`. Un `OPERADOR` siempre tiene agencia.
- `PanelSession`: `panelUserId`, `tokenHash` único, `expiresAt`, `lastSeenAt`.
- `PassengerSession`: `accountId`, `tokenHash` único, `expiresAt`, `lastSeenAt`.

**Flota**

- `Vehicle`: `agencyId`, `plate`, `brand`, `model`, `seatCount`, `active`. Único `(agencyId, plate)`.
- `Driver`: `agencyId`, `fullName`, `idNumber`, `phone`, `active`. Único `(agencyId, idNumber)`.

**Catálogo**

- `Route`: `agencyId`, `name`, `origin`, `destination`, `fareUsd` decimal(10,2), `meetingPoint`, `estimatedMinutes`, `travelTips`, `active`.
- `Departure`: `routeId`, `vehicleId`, `driverId`, `departsAt` timestamptz, `capacity`, `status`, `manifestClosedAt`, `manifestClosedByPanelUserId`. Único `(vehicleId, departsAt)`. Índice `(departsAt, status)`.
- `PaymentMethod`: `agencyId` nulo para métodos del terminal, `name`, `kind`, `currency`, `details` JSON con los datos de cobro, `active`, `sortOrder`.
- `ExchangeRate`: `currency`, `rateFromUsd` decimal(18,6), `effectiveFrom`, `createdByPanelUserId`.
- `DepartureTax`: `amountUsd` decimal(10,2), `effectiveFrom`, `createdByPanelUserId`. La vigente es la de mayor `effectiveFrom` no futura.

**Venta**

- `Reservation`: `code` único (es el **serial del ticket**), `publicToken` único, `accountId`, `departureId`, `status`, `passengerCount`, `policiesAcceptedAt`, `fareUsd` (tarifa unitaria congelada), `fareTotalUsd`, `taxPerPassengerUsd`, `taxTotalUsd`, `totalUsd`, `paidUsd` (suma de pagos aprobados), `currency`, `exchangeRateUsed`, `amountInCurrency`, `paymentMethodId`, `reconfirmedAt`, `attendanceResponse`, `attendanceRespondedAt`, `boardedAt`, `cancelledAt`, `cancellationReason`, `manualContactRequired`, `expiresAt` (para la liberación por falta de pago). Índice `(departureId, status)`.
- `Passenger`: `reservationId`, `fullName`, `idNumber`, `birthYear`, `isHolder`, `boardedAt`, `boardedByPanelUserId`.
- `PaymentProof`: `reservationId`, `paymentMethodId`, `reference`, `imagePath`, `amount`, `currency`, `amountUsd` (convertido al declarar), `status`, `reviewedByPanelUserId`, `reviewedAt`, `rejectionReason`. Una reserva puede acumular varios comprobantes aprobados: eso son los abonos.
- `CashPayment`: `reservationId`, `amount`, `currency`, `amountUsd`, `collectedByPanelUserId`, `collectedAt`.
- `Ticket`: `reservationId` único, `pdfPath`, `qrPayload`, `issuedAt`, `sentAt`.
- `WaitlistEntry`: `departureId`, `accountId`, `passengerCount`, `status`, `notifiedAt`, `claimToken` único, `claimExpiresAt`, `convertedReservationId`.

**Operación de viaje**

- `TripLog`: `departureId` único, `driverId`, `vehicleId`, `boardingStartedAt`, `departedAt`, `arrivedAt`, `passengerCount`, `notes`. `departedAt` es la **hora de embarque** que ve el operador; `arrivedAt` es la **hora de desembarque**; la duración se calcula como su diferencia y no se almacena.

**Infraestructura**

- `OutboundMessage`: `reservationId`, `waitlistEntryId`, `phone`, `templateKey`, `payload` JSON, `status`, `providerMessageId`, `attempts`, `lastError`, `scheduledFor`, `sentAt`. Índice único parcial sobre `(reservationId, templateKey)` para las plantillas programadas.
- `InboundEvent`: `providerEventId` único, `phone`, `type`, `rawPayload`, `receivedAt`, `processedAt`, `processingError`.
- `AuditLog`: `actorType`, `actorPanelUserId`, `actorAccountId`, `entityType`, `entityId`, `action`, `before` JSON, `after` JSON, `ipAddress`. Solo inserción, garantizado por un disparador de base de datos.

Regla de borrado: reservas, pasajeros, comprobantes, mensajes y auditoría nunca se borran físicamente.

## 8. Máquina de estados de la reserva

```
crear con método digital        → PENDIENTE_PAGO  (expiresAt = ahora + 2 h)
crear con método físico         → PAGO_EN_SITIO

PENDIENTE_PAGO → EN_VALIDACION   el pasajero sube un comprobante
EN_VALIDACION  → ABONADA         el operador aprueba y queda saldo pendiente
EN_VALIDACION  → PAGADA          el operador aprueba y el saldo llega a cero
EN_VALIDACION  → PENDIENTE_PAGO  el operador rechaza y no hay abonos previos
EN_VALIDACION  → ABONADA         el operador rechaza y sí hay abonos previos
ABONADA        → EN_VALIDACION   el pasajero sube otro comprobante
ABONADA        → PAGADA          un cobro en sitio completa el saldo
PAGO_EN_SITIO  → PAGADA          el operador registra el cobro completo
PAGO_EN_SITIO  → LIBERADA        no reconfirmó 12 h antes de la salida
PENDIENTE_PAGO → LIBERADA        expiró sin ningún pago
PENDIENTE_PAGO | EN_VALIDACION | ABONADA | PAGO_EN_SITIO | PAGADA → CANCELADA
PAGADA | PAGO_EN_SITIO → ABORDADA
PAGADA → NO_SHOW                 la salida partió sin que abordara
```

Ocupan cupo: `PENDIENTE_PAGO`, `EN_VALIDACION`, `ABONADA`, `PAGADA`, `PAGO_EN_SITIO`, `ABORDADA`. Liberan cupo: `LIBERADA`, `CANCELADA`, `NO_SHOW`.

El ticket se emite **solo** al entrar en `PAGADA`. Toda transición pasa por una función única que valida, escribe auditoría y devuelve los efectos que el llamador debe ejecutar fuera de la transacción.

## 9. Cupos y concurrencia

`disponible = Departure.capacity − Σ passengerCount de reservas en estados que ocupan cupo`.

La creación de reserva y toda transición que vuelva a ocupar cupo se ejecutan en una transacción que bloquea la fila de `Departure` con `SELECT ... FOR UPDATE`, recalcula el disponible y aborta si el grupo no cabe. No hay bloqueo temporal durante el llenado del formulario.

## 10. Serial del ticket

Formato `TR-MMDD-{N}PAX-{XXXX}`, por ejemplo `TR-0815-4PAX-K7Q2`. `MMDD` es la fecha de salida en hora de Caracas, `N` la cantidad de pasajeros, y el sufijo cuatro caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` generados con `crypto.randomInt`. Este código es el serial que ve el operador y el que viaja dentro del QR.

## 11. Montos

```
fareTotalUsd      = fareUsd × passengerCount
taxTotalUsd       = taxPerPassengerUsd × passengerCount
totalUsd          = fareTotalUsd + taxTotalUsd
amountInCurrency  = redondeo2(totalUsd × tasa)
```

Para `USD` y `USDT` la tasa es 1. Para `VES` y `COP` se toma la tasa vigente al crear la reserva y se congela en `exchangeRateUsed`. Cada comprobante o cobro guarda además su `amountUsd`, convertido con la tasa de la reserva, para que `paidUsd` sea siempre comparable con `totalUsd`.

Saldo pendiente = `totalUsd − paidUsd`. Un pago que excede el saldo se acepta y deja la reserva `PAGADA`; el excedente se registra en la auditoría para devolución manual.

## 12. Flujo del pasajero

1. **Registro** en `/registro`: cédula, nombre completo, teléfono, año de nacimiento y contraseña. La cédula se normaliza y debe ser única.
2. **Acceso** en `/ingresar` con cédula y contraseña. Sin sesión, `/mi/*` redirige aquí.
3. **Reservar** en `/mi/reservar`: elegir ruta y salida entre las que tienen cupo, elegir cantidad de 1 a 6, completar nombre, cédula y año de nacimiento de cada acompañante, aceptar políticas.
4. **Documentos**: antes de poder pagar, la cuenta debe tener foto de cédula cargada. Si algún pasajero del grupo tiene menos de 18 años según su año de nacimiento, el sistema exige además un permiso de viaje.
5. **Pago**: elegir método. Digital muestra los datos de cobro y exige monto, referencia e imagen del comprobante; se admite un monto menor al total como abono. Físico crea la reserva condicional.
6. **Mis reservas** en `/mi/reservas`: estado, saldo, botón para abonar de nuevo, y descarga del ticket cuando está pagada.

## 13. Panel

Ruta base `/panel`, con login propio en `/panel/ingresar`.

**Operador** (`/panel/...`, todo filtrado por su agencia):

- `pagos`: comprobantes pendientes con imagen ampliable, monto declarado, saldo de la reserva, y botones de aprobar y rechazar con motivo. Registro de cobros en sitio.
- `pasajeros`: tabla con titular, serial del ticket, ruta, salida, cantidad, total, abonado, saldo y estado de pago. Filtros por salida y por estado.
- `vehiculos`: alta y edición con placa, marca, modelo y número de asientos.
- `choferes`: alta y edición con nombre, cédula y teléfono, más el total de embarques y desembarques de cada uno.
- `movimientos`: lista de viajes de sus choferes con hora de embarque, duración del recorrido y hora de desembarque.
- `salidas`: crear salidas asignando vehículo y chofer, ver ocupación, cerrar manifiesto, iniciar embarque, registrar salida y registrar llegada.
- `abordaje/[departureId]`: pantalla móvil con lectura de código o QR y casillas por pasajero.
- `recaudacion`: total recaudado por ruta en las últimas 24 horas, y por rango de fechas.

**Admin** (`/panel/admin/...`):

- `tablero`: tasa de salida recaudada en las últimas 24 horas actualizada en vivo, recorridos del terminal, usuarios nuevos y usuarios recurrentes.
- `movimientos`: lista de movimientos de todas las agencias con agencia, ruta, chofer, hora de embarque, duración, hora de desembarque y cantidad de pasajeros.
- `usuarios`: base de datos de cuentas de pasajero con cédula, nombre, teléfono, año de nacimiento, viajes realizados y última actividad. Cada consulta queda auditada.
- `agencias`: alta de agencias y de sus usuarios de panel.
- `tasas`: tasa de salida vigente y su historial, más las tasas de cambio.
- `mensajes`: bandeja de mensajes salientes con su estado, que en el MVP hace las veces de WhatsApp.

Todas las horas se muestran en formato de 24 horas y en hora de Caracas, con la etiqueta correspondiente.

## 14. Embarque y desembarque

Cada salida tiene a lo sumo un `TripLog`. El operador registra tres momentos desde la pantalla de la salida:

1. **Iniciar embarque**: crea el `TripLog` con `boardingStartedAt` y pasa la salida a `MANIFIESTO_CERRADO`. Desde ese momento no se aceptan reservas nuevas.
2. **Registrar salida**: escribe `departedAt`, pasa la salida a `EN_RUTA`, marca `NO_SHOW` a las reservas `PAGADA` sin abordaje y `CANCELADA` a las `PAGO_EN_SITIO` que nunca pagaron, y congela `passengerCount` con los pasajeros efectivamente abordados.
3. **Registrar llegada**: escribe `arrivedAt` y pasa la salida a `FINALIZADA`.

La duración del recorrido es `arrivedAt − departedAt`, calculada al consultar. El total de embarques de un chofer es el número de `TripLog` con `departedAt`; el total de desembarques, con `arrivedAt`.

## 15. Reportes

| Reporte | Quién | Definición |
|---|---|---|
| Recaudación por ruta | Operador | Suma de `PaymentProof` aprobados y `CashPayment` en `amountUsd`, agrupada por ruta, para pagos registrados en la ventana |
| Tasa de salida recaudada | Admin | Suma de `taxTotalUsd` de reservas que alcanzaron `PAGADA` en la ventana |
| Recorridos del terminal | Admin | `TripLog` con `arrivedAt` no nulo en la ventana |
| Usuarios nuevos | Admin | `PassengerAccount` creadas en la ventana |
| Usuarios recurrentes | Admin | Cuentas con dos o más reservas en estado `PAGADA` o `ABORDADA` |
| Movimientos de agencias | Admin | `TripLog` con agencia, ruta, chofer, horas, duración y pasajeros |
| Demanda por ruta y horario | Ambos | Reservas ocupantes agrupadas por ruta, día de la semana y franja horaria |

La ventana por defecto es de 24 horas. Todos los reportes aceptan un rango de fechas y se exportan a CSV.

## 16. Mensajería

Interfaz `WhatsAppProvider` con `sendTemplate`, `sendDocument`, `verifyWebhookSignature` y `parseWebhook`. El MVP usa `FakeWhatsAppProvider`, que registra los envíos en `OutboundMessage` y los muestra en la bandeja del panel. La implementación de Meta Cloud API se documenta en `docs/whatsapp-templates.md` y se añade después del MVP.

Plantillas: `solicitud_recibida`, `reserva_condicional`, `abono_registrado`, `ticket_emitido`, `pago_rechazado`, `recordatorio_24h`, `reconfirmacion_pago_sitio`, `confirmacion_2h`, `reserva_liberada`, `cupo_disponible_lista_espera`.

## 17. Jobs programados

Proceso `worker` con pg-boss sobre la misma base de datos. Un barrido cada 5 minutos y una entrega de mensajes cada minuto.

| Job | Regla |
|---|---|
| `sweep-expire-unpaid` | Reservas `PENDIENTE_PAGO` con `expiresAt` vencido → `LIBERADA` y se procesa la lista de espera |
| `sweep-24h` | Salidas entre 12 h y 24 h 5 min en el futuro: `recordatorio_24h` a las pagadas y abonadas, `reconfirmacion_pago_sitio` a las de pago en sitio |
| `sweep-12h-release` | Salidas a 12 h o menos: reservas `PAGO_EN_SITIO` sin `reconfirmedAt` → `LIBERADA` |
| `sweep-2h` | Salidas entre 30 min y 2 h 5 min: `confirmacion_2h` |
| `waitlist-expire` | Entradas notificadas con `claimExpiresAt` vencido → `EXPIRADO`, se notifica al siguiente |
| `departure-autoclose` | Salidas `PROGRAMADA` ya pasadas → `MANIFIESTO_CERRADO` |
| `deliver-messages` | Entrega mensajes `ENCOLADO` vencidos con hasta 5 intentos y espera de 1, 4, 16, 64 y 256 minutos |

## 18. Privacidad y auditoría

La base de datos de usuarios es información sensible. Reglas:

- Solo el rol `ADMIN` accede a `/panel/admin/usuarios`, y cada consulta escribe una entrada de auditoría con el usuario que la hizo y el filtro aplicado.
- El operador ve de sus pasajeros solo lo necesario para operar: nombre, cédula, serial y estado de pago. No ve la foto de la cédula salvo en la pantalla de abordaje de esa salida concreta.
- Las cédulas se muestran enmascaradas fuera del manifiesto y del módulo de usuarios del admin.
- Los archivos subidos se sirven solo por rutas autenticadas que verifican la propiedad o el rol.
- Los reportes son agregados por defecto.
- La retención con seudonimización queda documentada como trabajo posterior al MVP.

## 19. Manejo de errores

- Sin cupo al enviar: mensaje con el disponible actual y opción de lista de espera.
- Comprobante que no es una imagen real: se rechaza verificando la firma de bytes, no el tipo declarado.
- Fallo de envío de mensaje: reintentos y, tras agotarlos, `manualContactRequired` visible en el panel.
- Fallo al generar el PDF: la reserva queda `PAGADA` igualmente y el panel muestra "ticket pendiente" hasta que el reintento lo genere.
- QR con firma inválida: se rechaza sin consultar la base de datos.

## 20. Estrategia de tests

**Unitarios**: máquina de estados completa, serial del ticket, cálculo de montos con tarifa y tasa de salida, saldo y abonos, firma y verificación de QR, normalización de cédula y teléfono, cálculo de edad desde el año de nacimiento, ventanas de los barridos, matriz de permisos de ambos ámbitos, duración de recorrido.

**Integración contra PostgreSQL real**: veinte reservas concurrentes sobre diez cupos sin sobreventa; abono parcial que deja `ABONADA` y segundo abono que completa a `PAGADA` con ticket; rechazo de comprobante que devuelve al estado correcto; expiración por falta de pago; liberación de pago en sitio a las 12 h; lista de espera; aislamiento por agencia en toda consulta de operador; embarque, salida y llegada con sus efectos sobre las reservas; reportes con cifras exactas; auditoría inmutable; reintentos de mensajes.

**End-to-end con Playwright**: registro de pasajero, reserva de tres personas, abono parcial, aprobación por el operador, segundo pago, emisión del ticket, embarque y llegada, y comprobación de las cifras en el tablero del admin.

**Verificación reforzada por mutación**: invertir la condición de disponibilidad y comprobar que el test de concurrencia falla; alterar la firma del QR y comprobar que su test falla; permitir la liberación de reservas pagadas y comprobar que su test falla.

## 21. Entrega del MVP en localhost

```
docker compose -f docker/docker-compose.dev.yml up -d
pnpm install
pnpm prisma migrate deploy
pnpm seed
pnpm dev          # http://localhost:3000
pnpm worker:dev   # en otra terminal
```

El seed crea el terminal con dos agencias, sus rutas, vehículos, choferes y salidas de los próximos días, métodos de pago, tasa de salida, tasas de cambio, un admin, dos operadores y dos cuentas de pasajero de prueba. Las credenciales se imprimen al terminar.
