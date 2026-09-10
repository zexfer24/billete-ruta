# TicketRuta — Especificación de diseño

Fecha: 2026-09-10
Estado: aprobado por el operador (diseño en chat), pendiente de revisión de este documento.

## 1. Propósito

Sistema de reservas y emisión de tickets para un operador de transporte terrestre interurbano, estatal o regulado. Sustituye el registro en papel y el cobro informal por un flujo automatizado: formulario web → pago dentro del flujo → validación por finanzas → ticket digital con QR por WhatsApp → recordatorios → control de abordaje. Toda la información queda en una base de datos auditable.

Fuente de requisitos: los cuatro PDF en `Documentación/` (ver glosario en `CLAUDE.md`).

## 2. Alcance de esta entrega

Incluido (fases 2 a 5 de la documentación):

- Formulario público de reserva multi-paso con pasajeros dinámicos (1 a 6).
- Pagos digitales con comprobante obligatorio y pago físico con reserva condicional.
- Validación de comprobantes por finanzas y emisión automática del ticket PDF con QR.
- Mensajería WhatsApp (Meta Cloud API): solicitud recibida, ticket, recordatorio 24 h, reconfirmación para pago en sitio, confirmación 2 h, liberación de cupo, notificación a lista de espera, rechazo de pago.
- Liberación automática de cupos de pago en sitio no reconfirmados 12 h antes, con lista de espera.
- Panel operativo con roles Admin, Finanzas y Operaciones.
- Manifiesto por salida, cierre de manifiesto y abordaje con escáner QR.
- Reportes de demanda por ruta, día y hora, exportables a CSV.
- Bitácora de auditoría inmutable.
- Despliegue en VPS con Docker Compose.

Excluido: integración ManyChat/Instagram (solo se comparte el enlace público), reembolsos automáticos, selección de asiento numerado, app nativa, pasarela de pago con cobro automático.

## 3. Decisiones tomadas con el operador

| Tema | Decisión |
|---|---|
| Enfoque | App web full-code, monolito Next.js con worker de jobs |
| WhatsApp | Meta Cloud API directa, detrás de una interfaz `WhatsAppProvider` |
| Hosting | VPS propio con Docker Compose y Caddy |
| Inventario | Cupo total por salida, sin asiento numerado |
| Roles | Admin, Finanzas, Operaciones; autenticación propia con email y contraseña |
| Precios | Precio base en USD por ruta; tasas USD→VES y USD→COP configurables; la reserva guarda la tasa usada |
| Liberación de cupo | Solo reservas `PAGO_EN_SITIO` sin reconfirmar 12 h antes de la salida. Las pagadas nunca se liberan automáticamente |
| Zona horaria | `America/Caracas` para presentación y programación; almacenamiento en UTC |

## 4. Stack

- Next.js 15 (App Router, TypeScript estricto), React 19.
- PostgreSQL 16 con Prisma como ORM y migraciones.
- pg-boss para la cola de trabajos y programación, almacenada en el mismo PostgreSQL.
- Tailwind CSS para la interfaz.
- `pdf-lib` y `qrcode` para el ticket.
- `zod` para validación de entradas en formularios, API y webhooks.
- `argon2` para contraseñas; sesiones en base de datos con cookie firmada `httpOnly`.
- Vitest (unitarios e integración), Playwright (end-to-end).
- Docker Compose: `app`, `worker`, `db`, `caddy`. Volúmenes: `pgdata`, `uploads`.

Estructura de carpetas:

```
src/
  app/                 rutas Next.js (público y panel)
  modules/
    catalog/           rutas, salidas, tasas, métodos de pago
    booking/           reservas, cupos, lista de espera, máquina de estados
    payments/          comprobantes y validación
    tickets/           PDF, QR firmado, verificación
    messaging/         WhatsAppProvider, plantillas, webhook entrante
    scheduler/         jobs pg-boss y barridos programados
    auth/              usuarios, roles, sesiones
    audit/             bitácora
  lib/                 prisma, config, utilidades compartidas
  worker/              punto de entrada del proceso worker
prisma/                schema y migraciones
tests/                 unit/, integration/, e2e/
docker/                Dockerfiles, Caddyfile, docker-compose.yml
```

Cada módulo expone un archivo `index.ts` con su API pública; los demás módulos importan solo desde ahí.

## 5. Modelo de datos

Enumeraciones:

- `ReservationStatus`: `PENDIENTE_VALIDACION`, `PAGO_EN_SITIO`, `PAGADA`, `RECHAZADA`, `LIBERADA`, `CANCELADA`, `ABORDADA`, `NO_SHOW`.
- `DepartureStatus`: `PROGRAMADA`, `MANIFIESTO_CERRADO`, `SALIDA`, `CANCELADA`.
- `PaymentKind`: `DIGITAL`, `FISICO`.
- `Currency`: `USD`, `VES`, `COP`, `USDT`.
- `ProofStatus`: `PENDIENTE`, `APROBADO`, `RECHAZADO`.
- `MessageStatus`: `ENCOLADO`, `ENVIADO`, `ENTREGADO`, `LEIDO`, `FALLIDO`.
- `WaitlistStatus`: `EN_ESPERA`, `NOTIFICADO`, `CONVERTIDO`, `EXPIRADO`.
- `UserRole`: `ADMIN`, `FINANZAS`, `OPERACIONES`.
- `AttendanceResponse`: `CONFIRMA`, `INCONVENIENTE`.

Entidades (campos principales; todas con `id` UUID, `createdAt`, `updatedAt`):

- **Route**: `name`, `origin`, `destination`, `priceUsd` (decimal), `meetingPoint`, `travelTips` (texto), `active`.
- **Departure**: `routeId`, `departsAt` (timestamptz), `capacity` (int), `unitLabel` (placa o número de unidad), `status`, `manifestClosedAt`, `manifestClosedByUserId`.
- **PaymentMethod**: `name`, `kind`, `currency`, `details` (JSON con los datos de cobro que se muestran al pasajero: correo Zelle, número de Pago Móvil, wallet, etc.), `active`, `sortOrder`.
- **ExchangeRate**: `currency` (`VES` o `COP`), `rateFromUsd` (decimal), `effectiveFrom`, `createdByUserId`. La tasa vigente es la de mayor `effectiveFrom` menor o igual al momento actual.
- **Reservation**: `code` (único), `departureId`, `status`, `holderName`, `holderIdNumber`, `holderPhone` (E.164), `passengerCount`, `policiesAcceptedAt`, `paymentMethodId`, `totalUsd`, `currency`, `amountInCurrency`, `exchangeRateUsed` (decimal, 1 para USD/USDT), `reconfirmedAt`, `attendanceResponse`, `attendanceRespondedAt`, `boardedAt`, `cancelledAt`, `cancellationReason`, `manualContactRequired` (bool), `publicToken` (para la página de estado).
- **Passenger**: `reservationId`, `fullName`, `idNumber`, `isHolder`, `boardedAt`, `boardedByUserId`.
- **PaymentProof**: `reservationId`, `paymentMethodId`, `reference`, `imagePath`, `amount`, `currency`, `status`, `reviewedByUserId`, `reviewedAt`, `rejectionReason`. Una reserva puede tener varios comprobantes si finanzas rechaza y el pasajero vuelve a cargar desde la página de estado.
- **CashPayment**: `reservationId`, `amount`, `currency`, `collectedByUserId`, `collectedAt`. Registro del cobro físico en taquilla o al abordar.
- **Ticket**: `reservationId` (único), `pdfPath`, `qrPayload`, `issuedAt`, `sentAt`.
- **WaitlistEntry**: `departureId`, `name`, `phone`, `passengerCount`, `status`, `notifiedAt`, `claimToken`, `claimExpiresAt`, `convertedReservationId`.
- **OutboundMessage**: `reservationId?`, `waitlistEntryId?`, `phone`, `templateKey`, `payload` (JSON), `status`, `providerMessageId`, `attempts`, `lastError`, `scheduledFor`, `sentAt`. Índice único parcial sobre (`reservationId`, `templateKey`) para las plantillas que deben enviarse una sola vez por reserva (recordatorio 24 h, reconfirmación, confirmación 2 h).
- **InboundEvent**: `providerEventId` (único), `phone`, `type`, `rawPayload`, `receivedAt`, `processedAt`, `processingError`. Garantiza idempotencia del webhook.
- **User**: `email` (único), `passwordHash`, `name`, `role`, `active`.
- **Session**: `userId`, `tokenHash`, `expiresAt`, `lastSeenAt`.
- **AuditLog**: `actorType` (`USUARIO`, `SISTEMA`, `PUBLICO`), `actorUserId?`, `entityType`, `entityId`, `action`, `before` (JSON), `after` (JSON), `ipAddress?`. Solo inserción; ningún código del sistema actualiza ni borra filas de esta tabla y el rol de base de datos de la app no tiene permisos `UPDATE`/`DELETE` sobre ella.

Regla de borrado: reservas, pasajeros, comprobantes y mensajes nunca se borran físicamente. Los cambios de estado quedan en `AuditLog`.

## 6. Máquina de estados de la reserva

```
crear (pago digital)  → PENDIENTE_VALIDACION
crear (pago físico)   → PAGO_EN_SITIO

PENDIENTE_VALIDACION → PAGADA        finanzas aprueba comprobante → emite ticket
PENDIENTE_VALIDACION → RECHAZADA     finanzas rechaza; el pasajero puede recargar comprobante,
                                     lo que vuelve a PENDIENTE_VALIDACION mientras haya cupo
PAGO_EN_SITIO        → PAGADA        operaciones/finanzas registra CashPayment → emite ticket
PAGO_EN_SITIO        → LIBERADA      job de 12 h sin reconfirmedAt
PAGADA | PAGO_EN_SITIO | PENDIENTE_VALIDACION → CANCELADA   acción manual del panel con motivo
PAGADA | PAGO_EN_SITIO → ABORDADA    operaciones registra abordaje de al menos el titular
PAGADA | PAGO_EN_SITIO → NO_SHOW     al marcar la salida como SALIDA sin abordaje registrado
```

Estados que ocupan cupo: `PENDIENTE_VALIDACION`, `PAGO_EN_SITIO`, `PAGADA`, `ABORDADA`. Los demás liberan cupo. Toda transición pasa por una única función `transition(reservationId, to, context)` en `booking` que valida la transición, escribe `AuditLog` y dispara los efectos (emitir ticket, encolar mensajes, procesar lista de espera).

## 7. Cupos y concurrencia

`disponible = Departure.capacity − Σ passengerCount de reservas en estados que ocupan cupo`.

La creación de reserva y toda transición que vuelva a ocupar cupo se ejecutan en una transacción que hace `SELECT ... FOR UPDATE` sobre la fila de `Departure`, recalcula el disponible y aborta si el grupo no cabe. Esto impide la sobreventa con solicitudes simultáneas. No hay bloqueo temporal de cupos durante el llenado del formulario; el cupo se verifica al enviar.

## 8. Código de reserva

Formato: `TR-MMDD-{N}PAX-{XXXX}`. Ejemplo: `TR-0815-4PAX-K7Q2`.

- `MMDD`: mes y día de la salida en `America/Caracas`.
- `N`: cantidad de pasajeros.
- `XXXX`: 4 caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin 0, O, 1, I), generados con `crypto.randomInt`.

Restricción única en base de datos; ante colisión se reintenta hasta 5 veces.

## 9. Precios y tasas

`totalUsd = Route.priceUsd × passengerCount`. Si el método de pago está en `VES` o `COP`, se toma la tasa vigente al momento del envío del formulario y se guarda `exchangeRateUsed` y `amountInCurrency = totalUsd × tasa`, redondeado a 2 decimales. Para `USD` y `USDT` la tasa es 1. El formulario muestra el monto en la moneda del método elegido y también el total en USD. Cambios posteriores de tasa no afectan reservas ya creadas.

## 10. Formulario público de reserva

Ruta `/reservar`. Cuatro pasos en una sola página con estado en cliente y validación `zod` en cliente y servidor.

1. **Viaje**: ruta, fecha, salida. Solo se listan salidas `PROGRAMADA` con `departsAt` futuro y disponible ≥ 1. Se muestra el disponible.
2. **Pasajeros**: cantidad (1 a 6, limitada al disponible); por cada pasajero nombre completo y cédula; el primero es el titular y además pide teléfono WhatsApp con código de país. Cédula: 5 a 12 caracteres alfanuméricos con prefijo opcional `V`, `E`, `P`, `J` o `CC`; se normaliza a mayúsculas sin puntos ni guiones.
3. **Políticas**: texto de cancelación y manejo de datos, casilla obligatoria.
4. **Pago**: selector de método. Si es `DIGITAL`: se muestran los `details` del método, el monto en su moneda, y se exige imagen (JPEG, PNG o WebP, máximo 5 MB) y referencia (4 a 40 caracteres). Si es `FISICO`: se muestra el monto y el aviso de que la reserva es condicional y deberá reconfirmarse por WhatsApp.

Al enviar: `POST /api/reservas` recibe `multipart/form-data`, valida, guarda la imagen en `uploads/comprobantes/{reservationId}/{uuid}.{ext}` y ejecuta la transacción de la sección 7. Respuesta: código y enlace a `/reserva/{publicToken}`. Se encola el mensaje `solicitud_recibida` o `reserva_condicional` según el caso.

Página de estado `/reserva/{publicToken}`: muestra ruta, salida, estado, pasajeros (solo nombres), y permite recargar comprobante si el estado es `RECHAZADA`. No expone cédulas completas (solo últimos 3 caracteres).

Protección: límite de 10 envíos por IP cada 10 minutos en `/api/reservas`; verificación del tipo real de imagen por firma de bytes.

## 11. Panel operativo

Ruta base `/panel`. Login con email y contraseña. Sesión de 12 horas renovable. Middleware verifica sesión y rol por sección.

- **Finanzas** (`FINANZAS`, `ADMIN`): cola de comprobantes `PENDIENTE` ordenada por antigüedad, con imagen ampliable, monto declarado, monto esperado, método y referencia. Acciones: aprobar (→ `PAGADA`) o rechazar con motivo (→ `RECHAZADA`, encola `pago_rechazado`). Registro de cobro físico para reservas `PAGO_EN_SITIO` (→ `PAGADA`).
- **Operaciones** (`OPERACIONES`, `ADMIN`): lista de salidas próximas; manifiesto por salida con todos los pasajeros y estado de cada reserva; cerrar manifiesto (→ `MANIFIESTO_CERRADO`, impide nuevas reservas y guarda quién cerró); marcar salida (→ `SALIDA`, marca `NO_SHOW` a las reservas activas sin abordaje). Pantalla `/panel/abordaje/{departureId}` optimizada para móvil: escáner QR con la cámara (`BarcodeDetector` con respaldo de librería) y campo para escribir el código; muestra el grupo completo con casillas por pasajero y botón de "abordar grupo".
- **Admin** (`ADMIN`): CRUD de rutas, salidas (con duplicado rápido de una salida a varias fechas), métodos de pago, tasas de cambio (historial), usuarios del panel; reportes: ocupación por salida, demanda por ruta y día de la semana, demanda por franja horaria, ingresos validados por método y moneda, todo con filtro de fechas y exportación CSV; vista de mensajes fallidos y reservas con `manualContactRequired`.

Toda acción del panel escribe en `AuditLog` con el usuario actor.

## 12. Ticket

Se genera al pasar a `PAGADA`. PDF A5 con logo, código de reserva, ruta, fecha y hora de salida, punto de encuentro, lista de pasajeros (nombre y cédula), método de pago, y QR. Se guarda en `uploads/tickets/{reservationId}.pdf` y se envía por WhatsApp como documento con la plantilla `ticket_emitido`.

Contenido del QR: `{code}.{firma}` donde `firma` son los primeros 16 caracteres en base32 de `HMAC-SHA256(TICKET_SECRET, code)`. La verificación en abordaje recalcula la firma; un QR con firma inválida se rechaza sin consultar la base de datos. Reemitir un ticket (por ejemplo tras corregir un nombre) regenera el PDF con el mismo QR.

## 13. Mensajería WhatsApp

Interfaz:

```ts
interface WhatsAppProvider {
  sendTemplate(to: string, template: TemplateKey, params: Record<string, string>, buttons?: ButtonSpec[]): Promise<{ providerMessageId: string }>;
  sendDocument(to: string, filePath: string, filename: string, caption?: string): Promise<{ providerMessageId: string }>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
  parseWebhook(body: unknown): InboundEvent[];
}
```

Implementaciones: `MetaCloudProvider` (Graph API, versión configurable, envío de plantillas aprobadas y subida de medios) y `FakeProvider` (guarda en memoria, usado en tests y en desarrollo local sin credenciales).

Plantillas (todas deben existir aprobadas en Meta con esos nombres; los textos se documentan en `docs/whatsapp-templates.md`):

| Clave | Cuándo | Botones |
|---|---|---|
| `solicitud_recibida` | reserva digital creada | — |
| `reserva_condicional` | reserva de pago físico creada | — |
| `ticket_emitido` | transición a `PAGADA` (mensaje + documento) | — |
| `pago_rechazado` | transición a `RECHAZADA` | URL a página de estado |
| `recordatorio_24h` | 24 h antes, reservas `PAGADA` | — |
| `reconfirmacion_pago_sitio` | 24 h antes, reservas `PAGO_EN_SITIO` | `RECONFIRMAR:{code}` |
| `confirmacion_2h` | 2 h antes, reservas `PAGADA` o `PAGO_EN_SITIO` reconfirmadas | `ASISTE:{code}`, `INCONVENIENTE:{code}` |
| `reserva_liberada` | transición a `LIBERADA` | — |
| `cupo_disponible_lista_espera` | cupo liberado, primer elegible en lista | URL con `claimToken` |

Envío: todo mensaje se inserta como `OutboundMessage` en estado `ENCOLADO` y un job `send-message` lo entrega con hasta 5 intentos y espera exponencial (1, 4, 16, 64, 256 minutos). Tras el último fallo el mensaje pasa a `FALLIDO` y la reserva a `manualContactRequired = true`.

Webhook `POST /api/whatsapp/webhook` (y `GET` para la verificación de Meta): valida `X-Hub-Signature-256`, guarda cada evento en `InboundEvent` (idempotente por `providerEventId`), y procesa:

- Respuesta de botón `RECONFIRMAR:{code}` → `reconfirmedAt = now` si la reserva está en `PAGO_EN_SITIO`.
- `ASISTE:{code}` / `INCONVENIENTE:{code}` → `attendanceResponse`. `INCONVENIENTE` no cambia el estado; marca la reserva para seguimiento en el panel.
- Estados de entrega (`sent`, `delivered`, `read`, `failed`) → actualizan `OutboundMessage.status`.
- Cualquier texto libre → se registra y no se responde automáticamente.

## 14. Jobs programados

Proceso `worker` con pg-boss. Un job periódico `sweep` corre cada 5 minutos y encola trabajos idempotentes; la unicidad se garantiza con el índice parcial de `OutboundMessage` y con los estados.

| Job | Regla |
|---|---|
| `sweep-24h` | Salidas con `departsAt` entre ahora+23h55m y ahora+24h05m: encola `recordatorio_24h` a `PAGADA` y `reconfirmacion_pago_sitio` a `PAGO_EN_SITIO`. Si el barrido se saltó una ventana (worker caído), toma también las salidas entre ahora+12h y ahora+24h que aún no tengan el mensaje. |
| `sweep-12h-release` | Salidas con `departsAt` ≤ ahora+12h: toda reserva `PAGO_EN_SITIO` sin `reconfirmedAt` pasa a `LIBERADA`, se encola `reserva_liberada` y se procesa la lista de espera. |
| `sweep-2h` | Salidas entre ahora+1h55m y ahora+2h05m (con recuperación hasta ahora+30m): encola `confirmacion_2h` a `PAGADA` y a `PAGO_EN_SITIO` con `reconfirmedAt`. |
| `waitlist-expire` | Entradas `NOTIFICADO` con `claimExpiresAt` pasado → `EXPIRADO` y se notifica al siguiente elegible. |
| `departure-autoclose` | Salidas `PROGRAMADA` con `departsAt` pasado → `MANIFIESTO_CERRADO` (respaldo si operaciones no cerró). |
| `retention` | Mensual. Reservas de salidas con más de `DATA_RETENTION_MONTHS` (por defecto 24) meses: reemplaza `fullName` e `idNumber` de pasajeros y titular por un hash irreversible, borra imágenes de comprobantes y PDFs. Los agregados para reportes se conservan. |

Reservas creadas con menos de 24 h de antelación reciben de inmediato el mensaje que corresponda a la ventana en la que caen; con menos de 12 h, una reserva de pago físico no es posible (el formulario solo ofrece métodos digitales).

## 15. Lista de espera

Cuando una salida no tiene disponible suficiente, el formulario ofrece anotarse en lista de espera con nombre, teléfono y cantidad de pasajeros (sin datos de acompañantes ni pago). Al liberarse cupo, `processWaitlist(departureId)` recorre las entradas `EN_ESPERA` por orden de creación, notifica a la primera cuyo `passengerCount` cabe, la marca `NOTIFICADO` con `claimToken` válido por 2 horas. La página `/lista-espera/{claimToken}` precarga ruta, salida y cantidad, y lleva al formulario completo desde el paso de pasajeros; al completar la reserva la entrada pasa a `CONVERTIDO`. Si expira, `waitlist-expire` pasa al siguiente. Si la salida está a menos de 3 horas, no se notifica a nadie.

## 16. Autenticación y autorización

Usuarios creados por Admin (el primero se crea con un comando `pnpm seed:admin` leyendo variables de entorno). Contraseñas con `argon2id`. Sesión: token aleatorio de 32 bytes, se guarda su hash SHA-256 en `Session`, cookie `httpOnly`, `secure`, `sameSite=lax`. Límite de 5 intentos fallidos de login por email cada 15 minutos. Matriz de permisos centralizada en `auth/permissions.ts`; cada acción de servidor la consulta.

## 17. Auditoría y privacidad

- Toda transición de reserva, validación de pago, cobro físico, abordaje, cierre de manifiesto y cambio de catálogo escribe `AuditLog`.
- Los reportes del panel son agregados por defecto. La búsqueda de una persona por cédula existe solo en el manifiesto de una salida concreta y en la búsqueda de reserva por código, y queda registrada en `AuditLog`.
- Retención configurable (sección 14).
- Las imágenes de comprobantes y los PDF se sirven solo por rutas autenticadas del panel o por la página pública de la propia reserva.

## 18. Manejo de errores

- Fallo de cupo al enviar el formulario: mensaje claro con el disponible actual y opción de lista de espera.
- Fallo de WhatsApp: reintentos; tras agotarlos, `manualContactRequired` visible en el panel de Admin y Finanzas.
- Fallo al generar el PDF: la transición a `PAGADA` se confirma igualmente; el job `issue-ticket` reintenta y el panel muestra "ticket pendiente" hasta que exista.
- Webhook con firma inválida: 401 y registro en log del servidor, sin escribir en base de datos.
- Errores no controlados en jobs: pg-boss reintenta con la política del job y registra en `OutboundMessage.lastError` o en el log del worker.

## 19. Despliegue

`docker/docker-compose.yml` con:

- `app`: imagen construida desde `docker/Dockerfile` (multi-stage, `next build`, ejecuta `next start`). Monta `uploads`.
- `worker`: misma imagen, comando `node dist/worker/index.js`. Monta `uploads`.
- `db`: `postgres:16`, volumen `pgdata`, sin puerto expuesto al exterior.
- `caddy`: `Caddyfile` con el dominio, HTTPS automático, proxy a `app:3000`.

Migraciones: `prisma migrate deploy` se ejecuta en el arranque de `app`. Copias de seguridad: script `docker/backup.sh` con `pg_dump` diario y copia del volumen `uploads`; se documenta cómo programarlo con cron del host.

Variables de entorno (documentadas en `.env.example`): `DATABASE_URL`, `SESSION_SECRET`, `TICKET_SECRET`, `WHATSAPP_PROVIDER` (`meta` o `fake`), `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_API_VERSION`, `PUBLIC_BASE_URL`, `UPLOADS_DIR`, `DATA_RETENTION_MONTHS`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `TZ=America/Caracas`.

## 20. Estrategia de tests

**Unitarios (Vitest, sin base de datos):**

- Máquina de estados: todas las transiciones válidas e inválidas; qué estados ocupan cupo.
- Generador de código de reserva: formato, alfabeto, reintento por colisión.
- Cálculo de montos y redondeo con tasas VES y COP; tasa 1 para USD/USDT.
- Firma y verificación de QR; rechazo de firma manipulada.
- Normalización y validación de cédula y teléfono.
- Selección de ventanas de los barridos (`sweep-24h`, `sweep-12h-release`, `sweep-2h`) con relojes simulados, incluida la recuperación tras caída del worker.
- Parseo del webhook de Meta: botones, estados de entrega, eventos duplicados.
- Matriz de permisos por rol.

**Integración (Vitest contra PostgreSQL en Docker, base de datos limpia por test):**

- Veinte reservas concurrentes sobre una salida con 10 cupos: exactamente 10 plazas asignadas, ninguna sobreventa.
- Aprobar comprobante emite ticket y encola `ticket_emitido` con documento.
- Rechazar comprobante libera cupo y permite recargar desde la página de estado.
- Liberación a las 12 h de una reserva `PAGO_EN_SITIO` sin reconfirmar; la reconfirmada no se libera; la lista de espera recibe notificación y el claim convierte la entrada.
- Reintentos de `send-message` con `FakeProvider` fallando; tras 5 fallos la reserva queda con `manualContactRequired`.
- Índice parcial impide duplicar `recordatorio_24h` para una misma reserva aunque el barrido corra dos veces.
- `AuditLog` recibe una fila por cada transición y el rol de base de datos no puede actualizarla ni borrarla.
- Job de retención seudonimiza y borra archivos solo de salidas antiguas.

**End-to-end (Playwright, `WHATSAPP_PROVIDER=fake`):**

- Reserva digital completa de 3 pasajeros con comprobante → finanzas aprueba en el panel → ticket descargable y mensaje registrado en el `FakeProvider` → operaciones escanea el código (se simula introduciéndolo) y aborda al grupo.
- Reserva de pago físico → aparece como condicional en el manifiesto.

**Verificación reforzada (mutación manual, según la metodología):** invertir la condición de disponibilidad en la transacción de reserva y comprobar que el test de concurrencia falla; alterar un carácter de la firma HMAC y comprobar que el test de QR falla.

Criterio de terminado por tarea: tests definidos en verde, `pnpm lint` y `pnpm typecheck` sin errores, entrada de glosario en `CLAUDE.md` actualizada.

## 21. Comandos previstos

```
pnpm dev              app en desarrollo
pnpm worker:dev       worker en desarrollo
pnpm build
pnpm lint
pnpm typecheck
pnpm test             unitarios
pnpm test:integration requiere docker compose -f docker/docker-compose.test.yml up -d
pnpm test:e2e
pnpm test -- tests/unit/booking/state-machine.test.ts     un archivo
pnpm prisma migrate dev
pnpm seed:admin
```
