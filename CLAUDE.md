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
- La base de datos de usuarios es información sensible: solo el admin la consulta y cada consulta queda auditada.

## Estados de reserva

`PENDIENTE_PAGO` → `EN_VALIDACION` → `ABONADA` o `PAGADA`. En paralelo `PAGO_EN_SITIO` → `PAGADA` o `LIBERADA`. Estados finales: `LIBERADA`, `CANCELADA`, `ABORDADA`, `NO_SHOW`. Ocupan cupo todos menos los tres últimos de esa lista final. La tabla completa de transiciones está en la sección 8 de la spec y codificada en `src/modules/booking/state-machine.ts`.

## Stack y decisiones fijas

- Next.js 15 (App Router, TypeScript estricto) como monolito, con proceso `worker` aparte para jobs con pg-boss sobre PostgreSQL 16. Prisma. Tailwind. Vitest y Playwright. pnpm.
- WhatsApp detrás de la interfaz `WhatsAppProvider`. El MVP usa solo la implementación falsa, con bandeja de mensajes visible en el panel del admin. La Meta Cloud API queda documentada en `docs/whatsapp-templates.md` para después del MVP.
- Entrega inmediata: **MVP en localhost**, no Docker de la aplicación. Solo PostgreSQL en contenedor, puerto 5434 para desarrollo y 5435 para test. Los puertos 5432 y 5433 están ocupados en esta máquina.
- Módulos en `src/modules/*`, cada uno exporta su API pública desde `index.ts`. Nadie importa internos de otro módulo. Alias `@/` a `src/`.
- Dinero siempre con `Prisma.Decimal`, nunca `number`.

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
| `accounts` | Cuentas de pasajero y sus documentos | `registerAccount`, `loginAccount`, `uploadDocument`, `missingDocuments` |
| `agencies` | Agencias, vehículos y choferes | `createAgencyWithOperator`, `listAgencies`, `createVehicle`, `listDrivers` (trae embarques y desembarques) |
| `audit` | Bitácora de solo inserción | `writeAudit` |
| `auth` | Dos ámbitos de sesión y matriz de permisos | `requirePanelUser`, `requirePassenger`, `requireAgencyScope`, `can`, `hashPassword` |
| `booking` | Reservas, cupos, estados y lista de espera | `createReservation`, `transitionReservation`, `getAvailability`, `processWaitlist`, `canTransition` |
| `catalog` | Rutas, salidas, tasas y precios | `listBookableDepartures`, `createDeparture`, `getManifest`, `computeAmounts`, `getCurrentDepartureTax` |
| `messaging` | Canal de mensajes con proveedor intercambiable | `enqueueMessage`, `deliverPendingMessages`, `getWhatsAppProvider`, `renderPreview` |
| `payments` | Abonos, comprobantes y cobros en efectivo | `submitProof`, `approveProof`, `rejectProof`, `registerCashPayment` |
| `reports` | Agregados de agencia y de terminal | `revenueByRoute`, `driverMovements`, `departureTaxRevenue`, `agencyMovements`, `listAccounts` |
| `scheduler` | Ventanas de tiempo de los barridos | `dueForReminder24h`, `dueForRelease12h`, `nextRetryDelayMinutes` |
| `tickets` | PDF con QR firmado | `issueTicket`, `signTicketCode`, `verifyTicketQr` |
| `trips` | Embarque, desembarque y abordaje | `startBoarding`, `registerDeparture`, `registerArrival`, `findForBoarding`, `confirmBoarding` |

| Archivo de `src/lib/` | Para qué sirve |
|---|---|
| `prisma.ts` | Cliente único de base de datos |
| `env.ts` | Configuración validada con zod |
| `decimal.ts` | `toDecimal`, `round2`, `formatMoney` |
| `time.ts` | Hora de Caracas y formato de 24 horas, duración de recorridos |
| `identity.ts` | Cédulas, teléfonos, edad y enmascarado |
| `storage.ts` | Archivos subidos y verificación por firma de bytes |

`src/worker/sweeps.ts` contiene los seis barridos programados y `src/worker/index.ts` el proceso que los ejecuta.

## Glosario de documentación (`Documentación/`)

| Archivo | Contenido |
|---|---|
| `ESTRUCTURA DE RESERVA Y CAPTACIÓN DE LEAD.pdf` | Las cinco fases del embudo: captación, registro, pago, emisión, recordatorios y abordaje |
| `ESTRUCTURA DE MÉTODOS DE PAGO EN EL FLUJO.pdf` | Pago digital con comprobante obligatorio, pago físico con reserva condicional y regla de reconfirmación |
| `SOLUCIONES A SUS PROBLEMAS GUBERNAMENTALES.pdf` | Justificación estatal: trazabilidad, transparencia financiera, inteligencia logística, seguridad ciudadana |
| `EN QUE AFECTA E INTERESES DEL ESTADO Y PAÍS.pdf` | Datos de movilidad terrestre y el equilibrio entre control estatal y privacidad |

## Notas operativas

- Los nombres de los PDF llevan acentos y la herramienta `Read` falla con ellos por normalización Unicode. Solución: copiarlos al scratchpad con nombres ASCII mediante PowerShell y leer la copia.
- El glosario de módulos de `src/` se añade aquí al cerrar la tarea 12 del plan.
