# Perfil interno del pasajero y lista de vigilancia — plan

Fecha: 2026-10-19. Rama propuesta: `feat/profile-watchlist`, creada desde `feat/brand-redesign`.
Estado: **perfil interno entregado; la lista de vigilancia se descartó** (ver "Resultado" al final).

> **Nota (2026-10-20): la lista de vigilancia no se construye.** A pedido del operador se
> retiró del código toda la base de esa parte. Un registro que marca cédulas por un
> señalamiento policial sin orden judicial ni verificación, no avisa a la persona y rastrea
> sus movimientos y los de quienes viajan con ella es vigilancia encubierta de individuos, con
> un uso previsible contra personas por motivos políticos en este contexto. Las secciones de
> abajo que describen la lista de vigilancia quedan solo como registro histórico del pedido
> original; nada de eso existe en el repositorio.

## Contexto

El operador pidió dos capacidades para el admin del terminal:

1. **Perfil interno de cada pasajero**: datos básicos, foto que usa en el sistema, foto de cédula, permisos de viaje con menores, tickets pagados, destinos, origen y llegada de cada viaje, agencias con las que viajó y, en general, todo el historial importante.
2. **Lista de vigilancia** ("lista negra"): cédulas requeridas por la policía o la Guardia Nacional. El pasajero no se entera. Los roles pertinentes reciben una alerta y ven en tiempo real su ubicación y sus movimientos dentro de la plataforma, también los viajes que hizo antes de ser marcado.

Decisiones del operador (2026-10-19):
- **Foto de perfil nueva**: el pasajero la sube en su app y la taquilla puede tomarla con la cámara.
- Las alertas las ven **solo los admins del terminal**; los operadores no se enteran.
- **Alerta silenciosa**: ninguna venta, cobro ni embarque cambia su comportamiento.
- El canal es el **panel en vivo**: insignia en el menú, franja de alerta y bandeja, con refresco cada 30 s.

Hechos del código que condicionan el diseño:
- No existe foto de perfil.
- No hay GPS. Por eso "ubicación" es la **última posición conocida en la plataforma**: ingreso a la app, consulta o venta en una taquilla, pago, abordaje, salida en ruta y llegada.
- `Route.origin` y `Route.destination` son ciudades. "Terminal de salida" y "terminal de llegada" se muestran como origen y destino de la ruta.
- El refresco en vivo del panel ya existe por consulta periódica (`live-tax.tsx`, 30 s, se pausa con la pestaña oculta). Se reutiliza ese patrón; no se agregan SSE ni websockets.
- `/api/archivos` ya deja al ADMIN ver cualquier documento y al pasajero los suyos.
- La bitácora del operador (`reports/activity.ts`) muestra la auditoría con `entityType` `Reservation` o `PaymentProof` de su agencia. **Ninguna escritura de la vigilancia usa esas entidades.**

Salvaguardas de la lista de vigilancia (parte del diseño, no opcionales):
- Toda marca exige el organismo solicitante, el número de oficio o expediente y el motivo.
- Solo el permiso `terminal.watchlist` (ADMIN) la ve.
- Marcar, desmarcar, consultar un seguimiento y marcar una alerta como vista quedan auditados.
- Sin borrado físico: una marca se **desactiva** con motivo.
- El sistema no avisa a nadie fuera del panel, y la pantalla recuerda el uso legal de la información.

## Diseño

### Datos (una migración)
- `DocumentType` gana `FOTO_PERFIL`. Se guarda en `documentos/<accountId>/` y reutiliza `PassengerDocument`, el historial y `/api/archivos` sin reglas nuevas. La vigente es la más reciente por `uploadedAt`, igual que la cédula.
- `enum WatchlistEvent { INGRESO_APP, REGISTRO, RESERVA, CONSULTA_TAQUILLA, VENTA_TAQUILLA, COMPROBANTE, PAGO_EFECTIVO, ABORDAJE, SALIDA, LLEGADA }`.
- `model WatchlistEntry`: `id`, `idNumber` (normalizada), `fullName?` (como lo informa la autoridad), `requestingAuthority`, `caseReference`, `reason`, `notes?`, `active` (por defecto `true`), `createdByPanelUserId`, `createdAt`, `deactivatedAt?`, `deactivatedByPanelUserId?`, `deactivationReason?`, `updatedAt` y `hits WatchlistHit[]`.
  - `@@index([idNumber, active])`.
  - Índice único parcial en SQL: `CREATE UNIQUE INDEX "WatchlistEntry_active_idNumber" ON "WatchlistEntry"("idNumber") WHERE active`.
- `model WatchlistHit`: `id`, `entryId`, `event`, `occurredAt`, `role` (`TITULAR | ACOMPANANTE | CHOFER`, guardado como String), `accountId?`, `reservationId?`, `departureId?`, `agencyId?`, `location` (texto ya redactado), `details Json`, `acknowledgedAt?`, `acknowledgedByPanelUserId?` y `createdAt`.
  - Índices `@@index([entryId, occurredAt])` y `@@index([acknowledgedAt, occurredAt])`.
- Permiso nuevo `terminal.watchlist`, solo para ADMIN.

### Módulo nuevo `src/modules/watchlist` (API pública en `index.ts`)
- `WATCHLIST_AUTHORITIES`: lista cerrada con `CICPC`, `PNB`, `GNB`, `POLICIA_ESTADAL`, `POLICIA_MUNICIPAL`, `FISCALIA`, `TRIBUNAL` y `OTRO`, cada uno con su etiqueta en español.
- `watchlistEntrySchema` (zod): cédula válida con `isValidIdNumber`, organismo de la lista, `caseReference` de 3 a 60 caracteres, `reason` de 10 a 500, `fullName?` y `notes?`.
- `markIdNumber(input, panelUserId)`: normaliza la cédula. Si ya hay una marca activa lanza `WatchlistDuplicateError("Esta cédula ya está en la lista de vigilancia.")`. Audita `VIGILANCIA_MARCADA` con `entityType` `WatchlistEntry`.
- `deactivateEntry(entryId, reason, panelUserId)`: exige un motivo de al menos 10 caracteres y audita `VIGILANCIA_DESACTIVADA`. Nunca borra.
- `listEntries({ active?, search?, page? })`, `getEntry(entryId, panelUserId)` (audita `CONSULTA_VIGILANCIA`) y `findPersonByIdNumber(idNumber)` (cuenta, chofer o pasajero acompañante, para avisar al marcar si la persona "ya viajó con nosotros").
- `recordWatchlistActivity(event: WatchlistActivityInput): Promise<void>`: busca las marcas activas de las cédulas recibidas y crea un hit por cada coincidencia. **Nunca lanza**: atrapa el error, lo registra con `console.error` y no hace nada más. Se llama **después** de que la transacción principal confirma, para que un fallo no deshaga la operación ni cambie el tiempo de respuesta de forma apreciable.
  - `WatchlistActivityInput = { event, occurredAt?, people: { idNumber, role, accountId? }[], reservationId?, departureId?, agencyId?, location: string, details? }`.
- `describeWhereabouts(snapshot, now)`: función **pura**. Decide la posición con esta prioridad:
  1. `EN_RUTA`: abordó y la salida está `EN_RUTA` (origen, destino, agencia, placa, chofer, hora de salida y llegada estimada).
  2. `EMBARCANDO`: la salida tiene el embarque iniciado y la persona está en el manifiesto.
  3. `LLEGO`: llegada en las últimas 24 h.
  4. `PROXIMA_SALIDA`: reserva que ocupa cupo con salida futura (fecha, hora, punto de encuentro y agencia).
  5. `ULTIMA_ACTIVIDAD`: el último hit.
  6. `SIN_ACTIVIDAD`.
- `getWhereabouts(entryId, now?)`: arma el snapshot con la cédula como titular, como acompañante y como chofer, y aplica `describeWhereabouts`.
- `listAlerts({ entryId?, unacknowledgedOnly?, limit? })`, `countUnacknowledgedHits()` y `acknowledgeHit(hitId, panelUserId)` (audita `VIGILANCIA_ALERTA_VISTA`).

### Puntos de captura (silenciosos, después del commit)

| Función | Evento | Personas |
|---|---|---|
| `accounts.loginAccount` (éxito) | `INGRESO_APP` | la cuenta |
| `accounts.registerAccount` (alta o activación) | `REGISTRO` | la cuenta |
| `booking.createReservation` | `RESERVA` | titular y acompañantes |
| `counter.lookupCounterHolder` | `CONSULTA_TAQUILLA` | la cédula consultada; la ubicación es "Taquilla de <agencia>" |
| `counter.sellAtCounter` | `VENTA_TAQUILLA` | titular y acompañantes |
| `payments.submitProof` | `COMPROBANTE` | titular |
| `payments.registerCashPayment` y `registerCashPaymentInTx`, vía la función pública que confirma | `PAGO_EFECTIVO` | titular |
| `trips.confirmBoarding` | `ABORDAJE` | pasajeros abordados |
| `trips.registerDeparture` | `SALIDA` | abordados y chofer |
| `trips.registerArrival` | `LLEGADA` | abordados y chofer |

Ninguno de estos puntos cambia lo que devuelve ni los mensajes que se encolan.

### Perfil interno (dominio en `reports`)
`src/modules/reports/passenger-profile.ts` se exporta desde `reports/index.ts`. Contiene:

- `getPassengerProfile(accountId, panelUserId): Promise<PassengerProfile | null>`. Audita `CONSULTA_PERFIL_PASAJERO` con `entityType` `PassengerAccount`.
  - **Datos**: nombres, apellidos, cédula, teléfono, año de nacimiento y edad, alta, último ingreso, canal de alta (app, o taquilla con el nombre del operador), si la cuenta está activada (booleano, sin hash) y si está activa.
  - **Documentos**: foto de perfil, cédula y permisos de viaje, cada uno con su vigente y sus anteriores: `filePath`, `uploadedAt` y `verifiedAt`.
  - **Resumen**: tickets pagados (reservas con ticket emitido), viajes realizados (`ABORDADA`), reservas totales, liberadas o canceladas, no presentados, total pagado en USD, destinos distintos, orígenes distintos y agencias distintas.
  - **Frecuentes**: los 5 primeros destinos y agencias, con su conteo.
  - **Historial como titular**: código, creación, salida (24 h, Caracas), origen → destino, agencia, placa, chofer, estado, canal, número de pasajeros, total, pagado, ticket, abordaje y llegada.
  - **Viajes como acompañante**: por `Passenger.idNumber` en reservas de otra cuenta, con el nombre del titular.
  - **Pagos**: comprobantes y efectivo, con fecha, código, tipo, monto, moneda, USD y estado.
  - **Vigilancia**: si existe una marca activa, solo su `entryId`, para el enlace "Ver seguimiento".
- `summarizeTravel(rows, now)`: **pura**; calcula el resumen y los frecuentes.
- `listTravelHistoryByIdNumber(idNumber)`: viajes como titular, acompañante o chofer. Es la base de "viajes anteriores" en el seguimiento.

### Pantallas
- `/mi/documentos`: tercera tarjeta, "Foto de perfil (opcional)", con `FileField capture="user"`. La acción acepta `FOTO_PERFIL` y devuelve `?ok=perfil`.
- Taquilla (`step-holder.tsx`): `FileField name="profilePhoto"` opcional con `capture="user"`. `CounterSaleInput.documents.profilePhoto?` se guarda como `FOTO_PERFIL`.
- `/panel/admin/usuarios/[accountId]` (`terminal.users`): cabecera con la foto de perfil o un `Isotipo` de reemplazo y el nombre, y una pastilla de vigilancia si hay marca activa. Debajo, tarjetas de resumen (`StatCard`), "Datos", "Documentos" (miniaturas que abren la imagen completa en una pestaña nueva), "Frecuentes", "Historial de viajes" (`TableShell` con versión móvil), "Viajes como acompañante" y "Pagos". Incluye `loading.tsx` con su silueta y `not-found.tsx`. En la lista de usuarios, el nombre enlaza al perfil.
- `/panel/admin/vigilancia` (`terminal.watchlist`):
  - `AdminTabs` con dos pestañas:
    - "Alertas": las no vistas primero, cada una con persona, evento, ubicación, hora, "Ver seguimiento" y "Marcar como vista".
    - "Cédulas marcadas": activas e inactivas.
  - Formulario "Marcar cédula" en un `SidePanel` (`?nueva=1`). Al validar la cédula avisa si la persona ya existe en el sistema.
  - `Alert` fija de uso legal.
- `/panel/admin/vigilancia/[entryId]`: datos de la marca y la tarjeta **"Ubicación actual" en vivo** (`WhereaboutsCard`, cliente, consulta `/api/admin/vigilancia/[entryId]/ubicacion` cada 30 s con el patrón de `live-tax`). Debajo, "Próximas salidas", "Línea de tiempo" (hits), "Viajes anteriores", el enlace al perfil si hay cuenta y "Desactivar marca" con `ConfirmDialog` y motivo.
- Navegación y alerta global:
  - `ADMIN_NAV` gana en "Supervisión" la entrada "Vigilancia" (icono `vigilancia` → `IconShield`) con `badgeKey: "watchlistAlerts"`.
  - El layout del admin pasa la insignia en `<Suspense>`, como `PendingProofsBadge`.
  - `WatchlistAlertStrip` (cliente) se monta en el layout del admin. Consulta `/api/admin/vigilancia/alertas` cada 30 s y, si llega una alerta nueva, muestra una franja `peligro` anunciada en `aria-live="assertive"` con enlace al seguimiento.
- APIs (`route.ts`): ambas exigen `currentPanelUser` y `can(role, "terminal.watchlist")`, y responden `no-store`, 401 o 403.

## Tests

Unitarios (`pnpm test`):
- `tests/unit/auth/permissions.test.ts`: `terminal.watchlist` solo para ADMIN.
- `tests/unit/panel/panel-nav.test.ts`: "Vigilancia" está en `ADMIN_NAV` con su `badgeKey` y no está en `OPERATOR_NAV`.
- `tests/unit/watchlist/schema.test.ts`: cédula inválida, organismo fuera de la lista, oficio vacío y motivo corto se rechazan; la cédula se normaliza.
- `tests/unit/watchlist/whereabouts.test.ts`: prioridad de `describeWhereabouts` (en ruta gana a la próxima salida; llegada de más de 24 h no cuenta; sin datos da `SIN_ACTIVIDAD`), con horas en Caracas.
- `tests/unit/reports/summarize-travel.test.ts`: tickets pagados, destinos, orígenes y agencias distintos, y frecuentes ordenados.

Integración (`pnpm test:integration`):
- `tests/integration/watchlist/entries.test.ts`: marcar audita y normaliza; un duplicado activo se rechaza; desactivar guarda el motivo, audita y no borra; se puede volver a marcar tras desactivar.
- `tests/integration/watchlist/capture.test.ts`:
  - Cada punto de captura genera su hit con evento, rol, agencia y ubicación.
  - Una cédula sin marca o con marca inactiva no genera hits.
  - Un acompañante marcado genera un hit con `ACOMPANANTE`, y el chofer marcado genera hits en salida y llegada.
  - **Silencio**: el resultado de la operación y los `OutboundMessage` son idénticos con marca y sin ella, y la bitácora del operador (`listAgencyActivity` o su equivalente) no muestra nada de la vigilancia.
  - Si `recordWatchlistActivity` falla (prisma simulado con `vi.spyOn`), la operación principal igual confirma.
- `tests/integration/watchlist/whereabouts.test.ts`: `EN_RUTA` tras `registerDeparture`, `PROXIMA_SALIDA` con una reserva pagada, `LLEGO` tras la llegada, y los viajes anteriores de alguien que viajó antes de ser marcado.
- `tests/integration/reports/passenger-profile.test.ts`: documentos vigentes y anteriores por tipo, incluida `FOTO_PERFIL`; resumen; historial como titular y como acompañante; pagos; auditoría `CONSULTA_PERFIL_PASAJERO`; `null` si la cuenta no existe.
- `tests/integration/counter/*` y `accounts/*`: la venta con `profilePhoto` crea `FOTO_PERFIL`, y `uploadDocument` acepta `FOTO_PERFIL`.

Verificación visual: arnés de capturas (375, 820 y 1280 px) sobre `/panel/admin/usuarios/[id]`, `/panel/admin/vigilancia`, `/panel/admin/vigilancia/[id]`, `/mi/documentos` y la taquilla. Además, prueba en vivo: con la página de seguimiento abierta, registrar una salida desde el panel del operador y ver la ubicación cambiar a "En ruta" en 30 s o menos.

Verificación reforzada (punto 16): quitar el filtro `active` en `recordWatchlistActivity` debe romper el test de "marca inactiva no genera hits".

Terminado = `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm test:integration` en verde, con las capturas revisadas.

## Tareas (un subagente `implementador` por tarea)

| # | Tarea | Modelo | Depende de | Archivos principales |
|---|---|---|---|---|
| T1 | Esquema, migración (enum, modelos, índice parcial), permiso `terminal.watchlist`, icono y `badgeKey` del nav, aplicar en las bases de demo y de test | Sonnet | — | `prisma/schema.prisma`, `prisma/migrations/*`, `auth/permissions.ts`, `lib/panel-nav.ts`, `components/panel-nav.tsx` |
| T2 | Foto de perfil en `/mi/documentos` y en la taquilla | Sonnet | T1 | `mi/documentos/*`, `panel/taquilla/*`, `counter/sell.ts` |
| T3 | Dominio del perfil: `getPassengerProfile`, `summarizeTravel`, `listTravelHistoryByIdNumber` | Sonnet | T1 | `reports/passenger-profile.ts`, `reports/index.ts` |
| T4 | Módulo `watchlist`: marcas, captura silenciosa, ubicación y alertas | Sonnet | T1 | `src/modules/watchlist/*` |
| T5 | Conectar los puntos de captura en accounts, booking, counter, payments y trips | Sonnet | T2, T4 | las funciones de la tabla de captura |
| T6 | Pantalla del perfil admin y enlace desde usuarios | Sonnet | T3 | `panel/admin/usuarios/[accountId]/*`, `users-results.tsx`, kit de skeletons admin |
| T7 | Pantallas de vigilancia, APIs, franja de alerta en vivo e insignia | Sonnet | T4 | `panel/admin/vigilancia/*`, `api/admin/vigilancia/*`, `panel/layout.tsx` |
| T8 | Documentación: CLAUDE.md (glosario, alrededor de 200 líneas), sección nueva en la spec (§18 privacidad y "Lista de vigilancia"), resultados en este plan | Haiku | T5–T7 | `CLAUDE.md`, spec 2026-09-10 |
| T9 | QA visual con el arnés y la prueba en vivo de ubicación | Sonnet | T5–T7 | scratchpad `qa/*` |

Paralelismo: T2, T3 y T4 en paralelo tras T1; luego T5, T6 y T7 en paralelo (no comparten archivos). Cada brief completo (las 8 secciones de la metodología) se redacta al despachar cada tarea, a partir de este plan.

## Fuera de alcance
- GPS o rastreo del dispositivo.
- Avisos a la policía o por WhatsApp.
- Bloqueo de operaciones.
- Rol nuevo de seguridad.
- Auditoría por imagen en `/api/archivos`. Hoy el ADMIN ve documentos sin auditoría por archivo; queda anotado como mejora y el perfil se audita como consulta.

## Resultado (2026-10-20)

- **Entregado y verificado en navegador** (375/820/1024/1280 px), con la suite completa en verde:
  la foto de perfil en `/mi/documentos` y en la taquilla (`FOTO_PERFIL`), el dominio del perfil
  (`getPassengerProfile`, `summarizeTravel`, `listTravelHistoryByIdNumber`) y la pantalla
  `/panel/admin/usuarios/[accountId]`, enlazada desde la lista de usuarios. La migración que
  conserva esto es `20261019204940_profile_photo` (solo agrega `FOTO_PERFIL`).
- **Descartado y eliminado del repositorio**: toda la parte de la lista de vigilancia. Se
  quitaron el módulo `src/modules/watchlist`, sus tablas (`WatchlistEntry`, `WatchlistHit`) y el
  enum `WatchlistEvent` del esquema y de la migración, el permiso `terminal.watchlist`, el icono
  y la insignia del menú, la pastilla del perfil y todos sus tests. No se construyeron los
  puntos de captura de movimientos ni las pantallas de alerta, y no se construirán (ver la nota
  al inicio del documento).
