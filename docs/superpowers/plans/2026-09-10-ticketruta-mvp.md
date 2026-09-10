# TicketRuta MVP — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar un MVP de TicketRuta ejecutable en localhost: terminal de pasajeros con agencias, cuentas de pasajero por cédula, reserva con abonos parciales, validación de pagos por el operador, ticket con QR, embarque y desembarque, y tableros de operador y admin.

**Architecture:** Monolito Next.js 15 App Router con módulos de dominio aislados en `src/modules/*`, PostgreSQL 16 por Prisma, y un proceso `worker` con pg-boss para barridos y entrega de mensajes. Dos ámbitos de autenticación separados: cuentas de pasajero (cédula) y usuarios de panel (email, rol `ADMIN` u `OPERADOR`). La mensajería WhatsApp está detrás de una interfaz; el MVP usa la implementación falsa con bandeja visible en el panel.

**Tech Stack:** TypeScript estricto, Next.js 15, React 19, Prisma 6, PostgreSQL 16 en Docker, pg-boss 10, Tailwind CSS, zod, argon2, pdf-lib, qrcode, Vitest, Playwright, pnpm 11, Node 22+.

**Spec:** `docs/superpowers/specs/2026-09-10-ticketruta-design.md`

## Global Constraints

- Gestor de paquetes **pnpm**. Nunca `npm` ni `yarn`.
- Identificadores de código, nombres de archivo y mensajes de commit en **inglés**. Comentarios y todo texto visible al usuario en **español con acentos correctos**.
- TypeScript `strict`. Prohibido `any` explícito y `@ts-ignore`. Entradas externas validadas con `zod`.
- Dinero siempre `Prisma.Decimal`, nunca `number`. Redondeo a 2 decimales solo al presentar o al persistir un monto en moneda.
- Zona horaria de negocio `America/Caracas`, almacenamiento en UTC, **presentación de horas siempre en formato de 24 horas** (`HH:mm`, nunca AM/PM).
- Ningún módulo importa archivos internos de otro: solo `import { x } from "@/modules/otro"`. Alias `@/` apunta a `src/`.
- Prohibido el borrado físico de `Reservation`, `Passenger`, `PaymentProof`, `CashPayment`, `OutboundMessage`, `TripLog` y `AuditLog`.
- **Aislamiento por agencia**: toda consulta o acción del rol `OPERADOR` filtra por el `agencyId` de su sesión. Un operador nunca lee ni escribe datos de otra agencia. Cada tarea que añada una consulta de operador añade su test de aislamiento.
- Los tests usan `FakeWhatsAppProvider`. Ningún test hace peticiones de red reales.
- Cada tarea termina con `pnpm typecheck`, `pnpm lint` y sus tests en verde, y con un commit.
- Base de datos de desarrollo y de test: contenedores Docker en los puertos 5434 y 5435 respectivamente, definidos en `docker/docker-compose.dev.yml` y `docker/docker-compose.test.yml`. No usar los puertos 5432 ni 5433, ya ocupados en esta máquina.
- Imágenes de prueba ya disponibles en `tests/fixtures/`, no hay que generarlas: `cedula.png`, `comprobante.png` y `permiso-viaje.png` son PNG válidos; `no-es-imagen.png` es texto con extensión `.png` y sirve para probar el rechazo por firma de bytes.

---

### Task 1: Scaffold, entorno y base de datos local

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.integration.config.ts`, `.env.example`, `.env`, `.env.test`
- Create: `docker/docker-compose.dev.yml`, `docker/docker-compose.test.yml`
- Create: `src/lib/env.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `tests/unit/lib/env.test.ts`

**Interfaces:**
- Produces: `getEnv(): Env` y `loadEnv(source: NodeJS.ProcessEnv): Env`, con `Env = { DATABASE_URL: string; SESSION_SECRET: string; TICKET_SECRET: string; WHATSAPP_PROVIDER: "meta" | "fake"; PUBLIC_BASE_URL: string; UPLOADS_DIR: string; TZ: string }`.
- Produces: scripts pnpm `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `worker:dev`, `seed`, `db:up`, `db:test:up`.

- [ ] **Step 1: Crear el proyecto**

```bash
pnpm dlx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack --use-pnpm --yes
```

Acepta continuar en un directorio no vacío. Verifica con `git status` que `CLAUDE.md`, `docs/` y `Documentación/` siguen sin modificar.

- [ ] **Step 2: Instalar dependencias**

```bash
pnpm add @prisma/client zod pg-boss argon2 pdf-lib qrcode date-fns date-fns-tz
pnpm add -D prisma vitest @vitest/coverage-v8 tsx esbuild @playwright/test @types/qrcode dotenv-cli
```

- [ ] **Step 3: TypeScript estricto**

En `tsconfig.json`, dentro de `compilerOptions`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, y `"paths": { "@/*": ["./src/*"] }`.

- [ ] **Step 4: Escribir el test que falla**

`tests/unit/lib/env.test.ts` con estos casos, usando una base válida como objeto:

```ts
const base = {
  DATABASE_URL: "postgresql://tr:tr@localhost:5434/ticketruta",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  TICKET_SECRET: "abcdef0123456789abcdef0123456789",
  WHATSAPP_PROVIDER: "fake",
  PUBLIC_BASE_URL: "http://localhost:3000",
  UPLOADS_DIR: "./uploads",
  TZ: "America/Caracas",
} as NodeJS.ProcessEnv;
```

- `loadEnv(base)` devuelve `WHATSAPP_PROVIDER === "fake"`.
- `loadEnv({ ...base, SESSION_SECRET: "corto" })` lanza con mensaje que contiene `SESSION_SECRET`.
- `loadEnv({ ...base, WHATSAPP_PROVIDER: "telegram" })` lanza con mensaje que contiene `WHATSAPP_PROVIDER`.
- Sin `TZ`, el valor por defecto es `America/Caracas`.
- `loadEnv({ ...base, DATABASE_URL: "no-es-url" })` lanza.

Crea `vitest.config.ts` con `include: ["tests/unit/**/*.test.ts"]`, `environment: "node"` y el alias `@` a `./src`.

- [ ] **Step 5: Ejecutar y verificar fallo**

Run: `pnpm vitest run tests/unit/lib/env.test.ts` — FAIL por módulo inexistente.

- [ ] **Step 6: Implementar `src/lib/env.ts`**

Esquema `zod` con `DATABASE_URL` url, `SESSION_SECRET` y `TICKET_SECRET` con `min(32)` y mensajes que nombran la clave, `WHATSAPP_PROVIDER` enum con mensaje que nombra la clave, `PUBLIC_BASE_URL` url, `UPLOADS_DIR` no vacío, `TZ` con `default("America/Caracas")`. `loadEnv` lanza un `Error` cuyo mensaje concatena `ruta: mensaje` de cada issue. `getEnv()` memoiza sobre `process.env`.

- [ ] **Step 7: Verificar verde**

Run: `pnpm vitest run tests/unit/lib/env.test.ts` — PASS, 5 tests.

- [ ] **Step 8: Contenedores de PostgreSQL**

`docker/docker-compose.dev.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: ticketruta_db_dev
    environment:
      POSTGRES_USER: ticketruta
      POSTGRES_PASSWORD: ticketruta
      POSTGRES_DB: ticketruta
    ports:
      - "5434:5432"
    volumes:
      - ticketruta_pgdata:/var/lib/postgresql/data
volumes:
  ticketruta_pgdata:
```

`docker/docker-compose.test.yml` igual pero `container_name: ticketruta_db_test`, base `ticketruta_test`, puerto `5435:5432` y `tmpfs: [/var/lib/postgresql/data]` en vez de volumen.

- [ ] **Step 9: Scripts y archivos de entorno**

En `package.json`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:integration": "dotenv -e .env.test -- vitest run --config vitest.integration.config.ts",
  "test:e2e": "playwright test",
  "worker:dev": "tsx watch src/worker/index.ts",
  "seed": "tsx prisma/seed.ts",
  "db:up": "docker compose -f docker/docker-compose.dev.yml up -d",
  "db:test:up": "docker compose -f docker/docker-compose.test.yml up -d"
}
```

Crea `.env` (desarrollo, puerto 5434), `.env.test` (puerto 5435, `UPLOADS_DIR=./uploads-test`) y `.env.example` sin secretos reales. Añade a `.gitignore`: `.env`, `.env.test`, `uploads/`, `uploads-test/`.

`vitest.integration.config.ts`: `include: ["tests/integration/**/*.test.ts"]`, `fileParallelism: false`, `testTimeout: 30000`, `hookTimeout: 30000`, mismo alias.

- [ ] **Step 10: Verificar todo y commitear**

```bash
pnpm db:up && pnpm db:test:up
pnpm typecheck && pnpm lint && pnpm test
git add -A && git commit -m "chore: scaffold Next.js project with strict TypeScript, env loader and local databases"
```

---

### Task 2: Esquema Prisma completo y utilidades de datos

**Files:**
- Create: `prisma/schema.prisma`, `prisma/migrations/**`
- Create: `src/lib/prisma.ts`, `src/lib/decimal.ts`
- Create: `src/modules/audit/log.ts`, `src/modules/audit/index.ts`
- Create: `tests/integration/setup.ts`
- Test: `tests/unit/lib/decimal.test.ts`, `tests/integration/schema.test.ts`

**Interfaces:**
- Consumes: `getEnv` (Task 1).
- Produces:
  - `prisma: PrismaClient` singleton.
  - `toDecimal(v: string | number | Prisma.Decimal): Prisma.Decimal`, `round2(v: Prisma.Decimal): Prisma.Decimal` (half-up), `formatMoney(v: Prisma.Decimal, c: Currency): string`.
  - `writeAudit(tx: Prisma.TransactionClient, input: { actorType: ActorType; actorPanelUserId?: string; actorAccountId?: string; entityType: string; entityId: string; action: string; before?: unknown; after?: unknown; ipAddress?: string }): Promise<void>`.
  - `resetDatabase(): Promise<void>` en `tests/integration/setup.ts`.
  - Todos los modelos y enums de la sección 7 de la spec.

- [ ] **Step 1: Escribir el esquema**

Traduce la sección 7 de la spec a `prisma/schema.prisma`. Reglas obligatorias:

- Todos los montos `Decimal @db.Decimal(10, 2)`, salvo `rateFromUsd` y `exchangeRateUsed` que son `@db.Decimal(18, 6)` y `amountInCurrency` que es `@db.Decimal(18, 2)`.
- Todas las fechas de negocio `DateTime @db.Timestamptz(3)`.
- Únicos: `PassengerAccount.idNumber`, `Agency.taxId`, `PanelUser.email`, `PanelSession.tokenHash`, `PassengerSession.tokenHash`, `Reservation.code`, `Reservation.publicToken`, `Ticket.reservationId`, `TripLog.departureId`, `WaitlistEntry.claimToken`, `InboundEvent.providerEventId`, `@@unique([agencyId, plate])` en `Vehicle`, `@@unique([agencyId, idNumber])` en `Driver`, `@@unique([vehicleId, departsAt])` en `Departure`.
- Índices: `Departure(departsAt, status)`, `Reservation(departureId, status)`, `Reservation(accountId)`, `OutboundMessage(status, scheduledFor)`, `PaymentProof(status)`, `ExchangeRate(currency, effectiveFrom)`, `DepartureTax(effectiveFrom)`, `AuditLog(entityType, entityId)`.
- `PanelUser.agencyId` es opcional; `Route.agencyId`, `Vehicle.agencyId` y `Driver.agencyId` son obligatorios.

- [ ] **Step 2: Crear la migración con el índice parcial y el disparador de auditoría**

```bash
pnpm dotenv -e .env -- prisma migrate dev --name init --create-only
```

Añade al final del `migration.sql`:

```sql
CREATE UNIQUE INDEX "OutboundMessage_once_per_reservation"
  ON "OutboundMessage" ("reservationId", "templateKey")
  WHERE "reservationId" IS NOT NULL
    AND "templateKey" IN ('recordatorio_24h', 'reconfirmacion_pago_sitio', 'confirmacion_2h', 'ticket_emitido');

CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog es de solo inserción';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
```

Aplica en ambas bases:

```bash
pnpm dotenv -e .env -- prisma migrate deploy
pnpm dotenv -e .env.test -- prisma migrate deploy
```

- [ ] **Step 3: Escribir el test de `decimal` que falla**

`tests/unit/lib/decimal.test.ts`:

- `round2(toDecimal("10.005"))` es `"10.01"`; `round2(toDecimal("10.004"))` es `"10"`.
- `round2(toDecimal("45.50").mul(toDecimal("36.7412")))` es `"1671.72"`.
- `formatMoney(toDecimal("45.5"), "USD")` es `"$ 45,50"`.
- `formatMoney(toDecimal("1671.72"), "VES")` es `"Bs. 1.671,72"`.
- `formatMoney(toDecimal("180000"), "COP")` es `"COP 180.000,00"`.
- `formatMoney(toDecimal("45.5"), "USDT")` es `"USDT 45,50"`.

Run: FAIL.

- [ ] **Step 4: Implementar `decimal.ts` y `prisma.ts`**

```ts
// src/lib/decimal.ts
import { Prisma } from "@prisma/client";
import type { Currency } from "@prisma/client";

export function toDecimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

const PREFIJOS: Record<Currency, string> = { USD: "$ ", VES: "Bs. ", COP: "COP ", USDT: "USDT " };

export function formatMoney(value: Prisma.Decimal, currency: Currency): string {
  const [entera = "0", decimal = "00"] = round2(value).toFixed(2).split(".");
  return `${PREFIJOS[currency]}${entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}
```

`src/lib/prisma.ts`: singleton `PrismaClient` reutilizado en `globalThis` fuera de producción.

Run: PASS.

- [ ] **Step 5: Implementar `writeAudit` y `resetDatabase`**

`writeAudit` inserta en `AuditLog` con `before` y `after` por defecto `{}`, aceptando `Prisma.TransactionClient`.

`resetDatabase` consulta `pg_tables` del esquema `public`, excluye las que empiezan por `_prisma` y `pgboss`, y ejecuta un único `TRUNCATE ... RESTART IDENTITY CASCADE`.

- [ ] **Step 6: Escribir y ejecutar el test de esquema**

`tests/integration/schema.test.ts`:

- Crear agencia, vehículo y chofer; un segundo vehículo con la misma placa en la misma agencia falla; la misma placa en otra agencia funciona.
- Crear ruta y salida; una segunda salida con el mismo vehículo y hora falla.
- Insertar dos veces el mismo `recordatorio_24h` para una reserva falla; dos veces `pago_rechazado` funciona.
- `auditLog.update` y `auditLog.delete` lanzan con mensaje que contiene `solo inserción`.
- `PanelUser` con rol `ADMIN` y `agencyId` nulo se crea sin problemas.

Run: `pnpm test:integration` — PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add full Prisma schema, decimal helpers and append-only audit log"
```

---

### Task 3: Utilidades puras de dominio

**Files:**
- Create: `src/lib/identity.ts`, `src/lib/time.ts`
- Create: `src/modules/booking/reservation-code.ts`, `src/modules/booking/state-machine.ts`, `src/modules/booking/index.ts`
- Create: `src/modules/catalog/pricing.ts`, `src/modules/catalog/index.ts`
- Create: `src/modules/scheduler/windows.ts`, `src/modules/scheduler/index.ts`
- Test: `tests/unit/lib/identity.test.ts`, `tests/unit/booking/reservation-code.test.ts`, `tests/unit/booking/state-machine.test.ts`, `tests/unit/catalog/pricing.test.ts`, `tests/unit/scheduler/windows.test.ts`

**Interfaces:**
- Produces:
  - `normalizeIdNumber(raw: string): string`, `isValidIdNumber(raw: string): boolean`
  - `maskIdNumber(idNumber: string): string` — deja visibles los últimos 3 caracteres, el resto asteriscos, conservando el prefijo de letra si lo hay.
  - `normalizePhone(raw: string, country?: "VE" | "CO"): string`, `isValidPhone(raw: string): boolean`
  - `ageFromBirthYear(birthYear: number, now?: Date): number`, `isMinor(birthYear: number, now?: Date): boolean`
  - `BUSINESS_TZ`, `formatCaracas(date: Date, pattern: string): string`, `formatCaracasDateTime24(date: Date): string` (`dd/MM/yyyy HH:mm`), `formatCaracasTime24(date: Date): string` (`HH:mm`), `caracasParts(date: Date): { month: string; day: string }`, `durationMinutes(from: Date, to: Date): number`, `formatDuration(minutes: number): string` (`4 h 35 min`)
  - `generateReservationCode(departsAt: Date, passengerCount: number): string`, `RESERVATION_CODE_PATTERN: RegExp`
  - `OCCUPYING_STATUSES`, `occupiesSeat(s)`, `canTransition(from, to)`, `assertTransition(from, to)`, `InvalidTransitionError`
  - `computeAmounts(input: { fareUsd: Decimal; taxPerPassengerUsd: Decimal; passengerCount: number; currency: Currency; rateFromUsd: Decimal | null }): { fareTotalUsd; taxTotalUsd; totalUsd; amountInCurrency; exchangeRateUsed }`
  - `balanceUsd(totalUsd: Decimal, paidUsd: Decimal): Decimal`, `statusAfterPayment(current: ReservationStatus, totalUsd: Decimal, paidUsd: Decimal): ReservationStatus`
  - `dueForReminder24h(now)`, `dueForRelease12h(now)`, `dueForConfirmation2h(now)`, `nextRetryDelayMinutes(attempt)`, `MAX_SEND_ATTEMPTS`, `UNPAID_EXPIRY_MINUTES = 120`

- [ ] **Step 1: Escribir los tests de identidad y tiempo**

`tests/unit/lib/identity.test.ts`:

- `normalizeIdNumber(" v-12.345.678 ")` es `"V12345678"`; `normalizeIdNumber("cc 1.020.304")` es `"CC1020304"`.
- `isValidIdNumber` acepta `V12345678`, `E81234567`, `P0123456`, `J123456789`, `CC1020304` y `12345678`.
- `isValidIdNumber` rechaza `""`, `"V123"`, `"V1234567890123"` y `"V123456#8"`.
- `maskIdNumber("V12345678")` es `"V*****678"`; `maskIdNumber("12345678")` es `"*****678"`.
- `normalizePhone("+58 412-111 22 33")` es `"+584121112233"`; `normalizePhone("0412-1112233", "VE")` es `"+584121112233"`; `normalizePhone("3001112233", "CO")` es `"+573001112233"`.
- `isValidPhone("+584121112233")` es `true`; `isValidPhone("4121112233")` y `isValidPhone("+58412ABC")` son `false`.
- `ageFromBirthYear(2000, new Date("2026-09-10T12:00:00Z"))` es `26`.
- `isMinor(2010, new Date("2026-09-10T12:00:00Z"))` es `true`; `isMinor(2008, ...)` es `false`.
- `formatCaracasTime24(new Date("2026-08-16T02:00:00Z"))` es `"22:00"`.
- `formatCaracasDateTime24(new Date("2026-08-16T02:00:00Z"))` es `"15/08/2026 22:00"`.
- `durationMinutes(new Date("2026-08-15T10:00:00Z"), new Date("2026-08-15T14:35:00Z"))` es `275`.
- `formatDuration(275)` es `"4 h 35 min"`; `formatDuration(45)` es `"45 min"`; `formatDuration(120)` es `"2 h"`.

- [ ] **Step 2: Escribir el test del serial**

- Con salida `new Date("2026-08-16T02:00:00Z")` y 4 pasajeros, el código empieza por `TR-0815-4PAX-`.
- Cumple `RESERVATION_CODE_PATTERN`.
- En 300 generaciones ningún sufijo contiene `0`, `1`, `O` ni `I`.
- Lanza con `entre 1 y 6` para 0 y para 7.
- 50 generaciones producen más de 45 códigos distintos.

- [ ] **Step 3: Escribir el test de la máquina de estados**

Ocupan cupo: `PENDIENTE_PAGO`, `EN_VALIDACION`, `ABONADA`, `PAGADA`, `PAGO_EN_SITIO`, `ABORDADA`. No ocupan: `LIBERADA`, `CANCELADA`, `NO_SHOW`.

Transiciones válidas a comprobar una por una: `PENDIENTE_PAGO→EN_VALIDACION`, `PENDIENTE_PAGO→LIBERADA`, `PENDIENTE_PAGO→CANCELADA`, `EN_VALIDACION→ABONADA`, `EN_VALIDACION→PAGADA`, `EN_VALIDACION→PENDIENTE_PAGO`, `EN_VALIDACION→CANCELADA`, `ABONADA→EN_VALIDACION`, `ABONADA→PAGADA`, `ABONADA→CANCELADA`, `PAGO_EN_SITIO→PAGADA`, `PAGO_EN_SITIO→LIBERADA`, `PAGO_EN_SITIO→CANCELADA`, `PAGO_EN_SITIO→ABORDADA`, `PAGADA→ABORDADA`, `PAGADA→NO_SHOW`, `PAGADA→CANCELADA`.

Inválidas a comprobar: `PENDIENTE_PAGO→PAGADA`, `PENDIENTE_PAGO→ABORDADA`, `PAGADA→PENDIENTE_PAGO`, `PAGADA→ABONADA`, `PAGO_EN_SITIO→NO_SHOW`, cualquier salida desde `LIBERADA`, `CANCELADA`, `ABORDADA` y `NO_SHOW`, y toda transición a sí mismo.

`assertTransition("ABORDADA", "PAGADA")` lanza `InvalidTransitionError` con ambos estados en el mensaje.

- [ ] **Step 4: Escribir el test de montos**

Con `fareUsd = 45.00`, `taxPerPassengerUsd = 2.50`, 3 pasajeros:
- `fareTotalUsd` es `"135"`, `taxTotalUsd` es `"7.5"`, `totalUsd` es `"142.5"`.
- En `USD`, `amountInCurrency` es `"142.5"` y `exchangeRateUsed` es `"1"`.
- En `USDT` igual que en `USD`, sin exigir tasa.
- En `VES` con tasa `36.7412`, `amountInCurrency` es `"5235.62"` (142.5 × 36.7412 = 5235.621).
- En `COP` con tasa `4012.5`, `amountInCurrency` es `"571781.25"`.
- Sin tasa y moneda `VES`, lanza con `tasa vigente`.
- Con 0 o 7 pasajeros, lanza con `entre 1 y 6`.

Para saldo y estado:
- `balanceUsd(toDecimal("142.5"), toDecimal("50"))` es `"92.5"`.
- `statusAfterPayment("EN_VALIDACION", total, paid)` con saldo positivo es `"ABONADA"`; con saldo cero es `"PAGADA"`; con pago mayor al total es `"PAGADA"`.
- `statusAfterPayment("PAGO_EN_SITIO", total, paid)` con saldo cero es `"PAGADA"`, con saldo positivo sigue `"PAGO_EN_SITIO"`.

- [ ] **Step 5: Escribir el test de ventanas**

Con `now = new Date("2026-09-10T12:00:00Z")`:
- `dueForReminder24h(now)` es `{ from: 2026-09-11T00:00:00Z, to: 2026-09-11T12:05:00Z }`.
- `dueForRelease12h(now)` es `2026-09-11T00:00:00Z`.
- `dueForConfirmation2h(now)` es `{ from: 2026-09-10T12:30:00Z, to: 2026-09-10T14:05:00Z }`.
- `[1,2,3,4,5].map(nextRetryDelayMinutes)` es `[1, 4, 16, 64, 256]`.
- `nextRetryDelayMinutes(0)` y `nextRetryDelayMinutes(6)` lanzan.
- `UNPAID_EXPIRY_MINUTES` es `120`.

- [ ] **Step 6: Ejecutar los cinco archivos y verificar que fallan**

Run: `pnpm test` — FAIL en los cinco.

- [ ] **Step 7: Implementar la máquina de estados**

```ts
import type { ReservationStatus } from "@prisma/client";

export const OCCUPYING_STATUSES = [
  "PENDIENTE_PAGO", "EN_VALIDACION", "ABONADA", "PAGADA", "PAGO_EN_SITIO", "ABORDADA",
] as const satisfies readonly ReservationStatus[];

const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDIENTE_PAGO: ["EN_VALIDACION", "LIBERADA", "CANCELADA"],
  EN_VALIDACION: ["ABONADA", "PAGADA", "PENDIENTE_PAGO", "CANCELADA"],
  ABONADA: ["EN_VALIDACION", "PAGADA", "CANCELADA"],
  PAGO_EN_SITIO: ["PAGADA", "LIBERADA", "CANCELADA", "ABORDADA"],
  PAGADA: ["ABORDADA", "NO_SHOW", "CANCELADA"],
  LIBERADA: [],
  CANCELADA: [],
  ABORDADA: [],
  NO_SHOW: [],
};

export class InvalidTransitionError extends Error {
  constructor(readonly from: ReservationStatus, readonly to: ReservationStatus) {
    super(`Transición inválida de ${from} a ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function occupiesSeat(status: ReservationStatus): boolean {
  return (OCCUPYING_STATUSES as readonly ReservationStatus[]).includes(status);
}
export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
export function assertTransition(from: ReservationStatus, to: ReservationStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
```

- [ ] **Step 8: Implementar el resto**

- `identity.ts`: patrón de cédula `/^(?:[VEPJ]|CC|TI|CE)?\d{5,12}$/` sobre el valor normalizado; teléfono `/^\+\d{8,15}$/`; `normalizePhone` conserva el `+`, y si no lo hay quita ceros iniciales y antepone `+58` o `+57`; `maskIdNumber` conserva las letras iniciales, sustituye por `*` todos los dígitos menos los tres últimos; `ageFromBirthYear` usa el año en hora de Caracas.
- `time.ts`: `formatInTimeZone` de `date-fns-tz` con `America/Caracas`; `formatDuration` omite las horas si son cero y omite los minutos si son cero, y devuelve `"0 min"` para cero.
- `reservation-code.ts`: alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sufijo de 4 con `randomInt`, validación de 1 a 6.
- `pricing.ts`: implementa `computeAmounts`, `balanceUsd` y `statusAfterPayment` según los tests. `statusAfterPayment` nunca devuelve un estado al que no se pueda transicionar desde `current`.
- `windows.ts`: constantes en milisegundos, `4 ** (attempt - 1)` para los reintentos.

- [ ] **Step 9: Verificar verde y mutar**

Run: `pnpm test` — PASS.

Mutación: añade `"PENDIENTE_PAGO"` a las transiciones de `PAGADA`, ejecuta y confirma que el test de transiciones inválidas falla. Revierte y verifica verde.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: add domain utilities for identity, time, codes, states, pricing and schedules"
```

---

### Task 4: Autenticación de pasajeros y de panel

**Files:**
- Create: `src/modules/auth/passwords.ts`, `src/modules/auth/panel-sessions.ts`, `src/modules/auth/passenger-sessions.ts`, `src/modules/auth/permissions.ts`, `src/modules/auth/rate-limit.ts`, `src/modules/auth/index.ts`
- Create: `src/modules/accounts/register.ts`, `src/modules/accounts/index.ts`
- Create: `src/app/registro/page.tsx`, `src/app/ingresar/page.tsx`, `src/app/(auth)/actions.ts`
- Create: `src/app/panel/ingresar/page.tsx`, `src/app/panel/ingresar/actions.ts`
- Create: `src/middleware.ts`
- Test: `tests/unit/auth/permissions.test.ts`, `tests/integration/auth/sessions.test.ts`, `tests/integration/accounts/register.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain): Promise<string>`, `verifyPassword(hash, plain): Promise<boolean>`
  - `PANEL_COOKIE = "tr_panel"`, `PASSENGER_COOKIE = "tr_pax"`, ambas de 12 horas.
  - `createPanelSession(panelUserId): Promise<{ token; expiresAt }>`, `resolvePanelSession(token?): Promise<PanelSessionUser | null>`, `destroyPanelSession(token)`
  - `createPassengerSession(accountId)`, `resolvePassengerSession(token?)`, `destroyPassengerSession(token)`
  - `type PanelSessionUser = { id; email; name; role: PanelRole; agencyId: string | null }`
  - `type PassengerSessionUser = { id; idNumber; fullName; phone; birthYear }`
  - `type Permission` con los valores: `payments.review`, `payments.cash`, `fleet.manage`, `departures.manage`, `boarding.manage`, `trips.manage`, `agency.reports`, `terminal.dashboard`, `terminal.users`, `terminal.agencies`, `terminal.rates`, `terminal.messages`
  - `can(role, permission): boolean`, `assertCan(role, permission): void`, `ForbiddenError`
  - `requirePanelUser(permission): Promise<PanelSessionUser>` — redirige a `/panel/ingresar` si no hay sesión, lanza `ForbiddenError` si falta el permiso.
  - `requireAgencyId(user: PanelSessionUser): string` — devuelve el `agencyId` del operador; para `ADMIN` lanza si no se pasó una agencia explícita. Firma real: `requireAgencyScope(user, requestedAgencyId?): string`.
  - `registerAccount(input: { idNumber; fullName; phone; birthYear; password }): Promise<{ accountId }>`
  - `loginAccount(idNumber, password): Promise<{ token } | null>`
  - `checkLoginRate(key: string): boolean` — 5 intentos por clave cada 15 minutos.

- [ ] **Step 1: Test de permisos**

`ADMIN` tiene: `terminal.dashboard`, `terminal.users`, `terminal.agencies`, `terminal.rates`, `terminal.messages`, `agency.reports`, y **no** tiene `payments.review`, `payments.cash`, `fleet.manage`, `departures.manage`, `boarding.manage` ni `trips.manage`. El admin del terminal supervisa, no vende.

`OPERADOR` tiene: `payments.review`, `payments.cash`, `fleet.manage`, `departures.manage`, `boarding.manage`, `trips.manage`, `agency.reports`, y **no** tiene ningún permiso `terminal.*`.

Test adicional: para cada permiso de `ALL_PERMISSIONS`, al menos un rol lo tiene.

- [ ] **Step 2: Ejecutar, implementar `permissions.ts`, verificar verde**

`ALL_PERMISSIONS` como tupla `as const`, `MATRIX: Record<PanelRole, readonly Permission[]>`, `ForbiddenError` con mensaje `El rol X no tiene el permiso Y`.

- [ ] **Step 3: Test de sesiones y registro**

`tests/integration/auth/sessions.test.ts`:
- Crear sesión de panel y resolverla devuelve el usuario con su `agencyId`.
- La tabla guarda un hash de 64 caracteres distinto del token.
- Una sesión expirada no se resuelve.
- Un token inexistente o `undefined` no se resuelve.
- `destroyPanelSession` la elimina.
- Un `PanelUser` con `active: false` no se resuelve.
- Lo mismo para sesiones de pasajero.
- `checkLoginRate` devuelve `true` cinco veces y `false` la sexta para la misma clave.

`tests/integration/accounts/register.test.ts`:
- Registrar normaliza la cédula: `"v-12.345.678"` se guarda como `"V12345678"`.
- Registrar dos veces la misma cédula, aunque escrita distinto, falla con un error cuyo mensaje menciona la cédula.
- La contraseña se guarda como hash de argon2 (empieza por `$argon2`) y `verifyPassword` la acepta.
- El teléfono se normaliza a E.164.
- Un año de nacimiento fuera de rango razonable (menor que 1900 o mayor que el año actual) se rechaza.
- `loginAccount` con credenciales correctas devuelve un token; con contraseña incorrecta devuelve `null`; con cédula inexistente devuelve `null`.
- Registrar escribe auditoría con `actorType: "PASAJERO"` y acción `CUENTA_CREADA`.

- [ ] **Step 4: Implementar sesiones, contraseñas y registro**

- Token: `randomBytes(32).toString("base64url")`. Hash guardado: `sha256` en hexadecimal.
- `argon2id` para contraseñas.
- `resolve*Session` verifica expiración y `active`, actualiza `lastSeenAt`.
- `requirePanelUser` lee la cookie con `cookies()` de `next/headers` y hace `redirect("/panel/ingresar")` cuando no hay sesión.
- `registerAccount` valida con `zod`, normaliza, y traduce el choque de unicidad a un error en español.
- `rate-limit.ts`: `Map` en memoria del proceso con ventana de 15 minutos, comentario explicando que con más de una instancia habría que moverlo a la base de datos.

- [ ] **Step 5: Implementar las páginas de acceso**

- `/registro`: formulario con cédula, nombre completo, teléfono, año de nacimiento y contraseña con confirmación. Al registrarse, inicia sesión y redirige a `/mi/reservar`.
- `/ingresar`: cédula y contraseña. Error genérico "Credenciales inválidas" en español.
- `/panel/ingresar`: email y contraseña. Redirige a `/panel` para operador y a `/panel/admin/tablero` para admin.
- `src/middleware.ts` con `matcher: ["/mi/:path*", "/panel/:path*"]`, dejando pasar `/panel/ingresar`; redirige a la pantalla de acceso correspondiente cuando falta la cookie.

- [ ] **Step 6: Verificar y commitear**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration` — verde.

```bash
git add -A && git commit -m "feat: add passenger and panel authentication with permission matrix"
```

---

### Task 5: Catálogo, flota y datos de siembra

**Files:**
- Create: `src/modules/agencies/vehicles.ts`, `src/modules/agencies/drivers.ts`, `src/modules/agencies/index.ts`
- Create: `src/modules/catalog/queries.ts`, `src/modules/catalog/rates.ts`, `src/modules/catalog/departures.ts`
- Modify: `src/modules/catalog/index.ts`
- Create: `prisma/seed.ts`
- Test: `tests/integration/catalog/rates.test.ts`, `tests/integration/agencies/fleet.test.ts`

**Interfaces:**
- Produces:
  - `getCurrentExchangeRate(currency: Currency, at?: Date): Promise<Decimal | null>`
  - `getCurrentDepartureTax(at?: Date): Promise<Decimal>` — lanza si no hay ninguna configurada.
  - `setExchangeRate(input: { currency; rateFromUsd; effectiveFrom; panelUserId }): Promise<void>`
  - `setDepartureTax(input: { amountUsd; effectiveFrom; panelUserId }): Promise<void>`
  - `listBookableDepartures(filter?: { agencyId?: string; routeId?: string; from?: Date; to?: Date }): Promise<BookableDeparture[]>` donde `BookableDeparture = { id; routeId; routeName; agencyName; origin; destination; departsAt; fareUsd; capacity; occupied; available; unitLabel }`
  - `createVehicle`, `updateVehicle`, `deactivateVehicle`, `listVehicles(agencyId)`
  - `createDriver`, `updateDriver`, `deactivateDriver`, `listDrivers(agencyId)` — `listDrivers` incluye `boardingCount` y `arrivalCount` calculados desde `TripLog`.
  - `createDeparture(input: { routeId; vehicleId; driverId; departsAt; capacity?; agencyId })` — valida que ruta, vehículo y chofer pertenezcan a la agencia y que el vehículo no tenga otra salida a esa hora; `capacity` por defecto es `vehicle.seatCount`.

- [ ] **Step 1: Tests de tasas**

- Con tres tasas de `VES` con `effectiveFrom` en el pasado, presente y futuro, `getCurrentExchangeRate("VES")` devuelve la más reciente no futura.
- Sin ninguna tasa para `COP`, devuelve `null`.
- `getCurrentDepartureTax()` devuelve la vigente; sin ninguna, lanza con mensaje que menciona la tasa de salida.
- `setExchangeRate` y `setDepartureTax` escriben auditoría con el usuario de panel.

- [ ] **Step 2: Tests de flota con aislamiento por agencia**

- `listVehicles(agenciaA)` no devuelve vehículos de la agencia B.
- `createVehicle` con una placa ya usada en la misma agencia falla con mensaje en español; la misma placa en otra agencia funciona.
- `updateVehicle` de un vehículo de otra agencia falla con `ForbiddenError`.
- `listDrivers` devuelve `boardingCount` igual al número de `TripLog` con `departedAt` de ese chofer y `arrivalCount` igual al número con `arrivedAt`.
- `deactivateDriver` no borra la fila: la marca `active: false` y sigue apareciendo en los movimientos históricos.
- `createDeparture` con un vehículo de otra agencia falla; con vehículo y hora ya usados falla; sin `capacity` toma `seatCount` del vehículo.

- [ ] **Step 3: Ejecutar, implementar, verificar verde**

Toda función que reciba `agencyId` lo usa en el `where`, nunca lo ignora. `updateVehicle` y `updateDriver` reciben `agencyId` y verifican pertenencia antes de escribir.

- [ ] **Step 4: Escribir el seed**

`prisma/seed.ts` es idempotente: si ya hay agencias, no duplica. Crea:

- Terminal: tasa de salida vigente de `2.50` USD, tasas de cambio `VES = 36.7412` y `COP = 4012.50`.
- Admin: `admin@ticketruta.test` con contraseña `Admin.2026`.
- Agencia "Expresos Los Andes" con operador `andes@ticketruta.test` / `Operador.2026`, 3 vehículos, 3 choferes y 3 rutas (Caracas–San Cristóbal 45 USD, Caracas–Mérida 40 USD, Caracas–Barinas 30 USD).
- Agencia "Transporte Caribe" con operador `caribe@ticketruta.test` / `Operador.2026`, 2 vehículos, 2 choferes y 2 rutas (Caracas–Puerto La Cruz 25 USD, Caracas–Cumaná 28 USD).
- Salidas: para cada ruta, una salida diaria durante los próximos 7 días a horas distintas, asignando vehículo y chofer de su agencia sin solaparse.
- Métodos de pago: Zelle (USD, digital), Pago Móvil (VES, digital), Binance USDT (USDT, digital), Nequi (COP, digital), Efectivo en taquilla (USD, físico), Bolívares en efectivo (VES, físico).
- Dos cuentas de pasajero: `V12345678` / `Pasajero.2026` y `V87654321` / `Pasajero.2026`.

Al terminar imprime una tabla con todas las credenciales y la URL local.

- [ ] **Step 5: Ejecutar el seed y verificar**

```bash
pnpm dotenv -e .env -- pnpm seed
```

Expected: imprime las credenciales. Ejecutarlo dos veces no duplica datos.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add catalog, fleet management and seed data"
```

---

### Task 6: Reservas, cupos y abonos

**Files:**
- Create: `src/modules/booking/availability.ts`, `src/modules/booking/create-reservation.ts`, `src/modules/booking/transition.ts`, `src/modules/booking/errors.ts`, `src/modules/booking/waitlist.ts`
- Create: `src/modules/payments/record-payment.ts`, `src/modules/payments/index.ts`
- Create: `src/lib/storage.ts`
- Modify: `src/modules/booking/index.ts`
- Create: `tests/integration/fixtures.ts`
- Test: `tests/integration/booking/availability.test.ts`, `tests/integration/booking/create-reservation.test.ts`, `tests/integration/booking/transition.test.ts`, `tests/integration/payments/installments.test.ts`, `tests/integration/booking/waitlist.test.ts`

**Interfaces:**
- Produces:
  - `getAvailability(departureId, tx?): Promise<{ capacity; occupied; available }>`
  - `createReservation(input: CreateReservationInput): Promise<{ reservationId; code; publicToken; totalUsd }>` con `CreateReservationInput = { accountId; departureId; paymentMethodId; companions: Array<{ fullName; idNumber; birthYear }>; policiesAccepted: true }`. El titular sale de la cuenta; `passengerCount = companions.length + 1`.
  - `transitionReservation(input: { reservationId; to; actor: { type: ActorType; panelUserId?: string; accountId?: string }; reason?; tx? }): Promise<{ shouldIssueTicket: boolean; freedSeats: boolean }>`
  - `submitProof(input: { reservationId; accountId; paymentMethodId; reference; amount: string; currency; imagePath }): Promise<{ proofId }>` — solo el dueño de la reserva.
  - `approveProof(input: { proofId; panelUserId; agencyId }): Promise<{ shouldIssueTicket: boolean }>`
  - `rejectProof(input: { proofId; panelUserId; agencyId; reason }): Promise<void>`
  - `registerCashPayment(input: { reservationId; panelUserId; agencyId; amount; currency }): Promise<{ shouldIssueTicket: boolean }>`
  - `joinWaitlist(input: { departureId; accountId; passengerCount })`, `processWaitlist(departureId): Promise<{ notifiedEntryId: string | null }>`
  - `NoSeatsAvailableError` con `available`, `DepartureClosedError`, `MissingDocumentsError`, `NotOwnerError`
  - `saveUpload(kind: "comprobantes" | "documentos" | "tickets", ownerId, filename, data): Promise<string>`, `readUpload(relativePath): Promise<Buffer>`, `assertImageBuffer(buffer): "jpeg" | "png" | "webp"`
  - `tests/integration/fixtures.ts` con `createAgencyFixture`, `createRouteFixture`, `createVehicleFixture`, `createDriverFixture`, `createDepartureFixture`, `createPaymentMethodFixture`, `createAccountFixture`, `createPanelUserFixture`, `createReservationFixture`, `seedRatesFixture`.

- [ ] **Step 1: Escribir los fixtures**

Cada uno con valores por defecto y sobreescritura parcial. `seedRatesFixture` inserta la tasa de salida `2.50` y las tasas `VES` y `COP` de la spec. `createAccountFixture` crea la cuenta con documento de cédula ya cargado salvo que se pida lo contrario.

- [ ] **Step 2: Test de disponibilidad**

Salida de 10 cupos con: `PAGADA` de 2, `EN_VALIDACION` de 1, `ABONADA` de 1, `PAGO_EN_SITIO` de 1, `PENDIENTE_PAGO` de 1, `ABORDADA` de 1, más `LIBERADA` de 3, `CANCELADA` de 2 y `NO_SHOW` de 1. Resultado esperado: `{ capacity: 10, occupied: 7, available: 3 }`.

Sin reservas, `available` es igual a `capacity`.

- [ ] **Step 3: Test de creación**

- Crea reserva con 3 pasajeros: estado `PENDIENTE_PAGO`, `expiresAt` a 120 minutos, `passengerCount` 3, tres filas de `Passenger` con exactamente un titular cuyo nombre y cédula vienen de la cuenta.
- Congela `fareUsd` y `taxPerPassengerUsd`: cambiar la tarifa de la ruta después no altera la reserva.
- `totalUsd` es `fareTotalUsd + taxTotalUsd`.
- Con método físico, el estado es `PAGO_EN_SITIO` y `expiresAt` es nulo.
- Sin foto de cédula en la cuenta, lanza `MissingDocumentsError`.
- Con un acompañante menor de edad y sin permiso de viaje cargado, lanza `MissingDocumentsError` mencionando el permiso.
- Con un acompañante menor y permiso cargado, funciona.
- Salida con manifiesto cerrado: `DepartureClosedError`.
- Salida ya pasada: `DepartureClosedError`.
- Grupo que no cabe: `NoSeatsAvailableError` con el disponible correcto.
- Método físico cuando faltan menos de 12 horas para la salida: se rechaza con mensaje en español.
- Encola `solicitud_recibida` para digital y `reserva_condicional` para físico.
- Escribe auditoría `RESERVA_CREADA` con `actorAccountId`.
- **Concurrencia**: 20 creaciones simultáneas de 1 pasajero sobre una salida de 10 cupos producen exactamente 10 reservas y `available` queda en 0.

- [ ] **Step 4: Test de abonos**

Reserva de 142.50 USD total.

- `submitProof` de 50 USD deja la reserva en `EN_VALIDACION` y el comprobante en `PENDIENTE`; `paidUsd` sigue en 0.
- `approveProof` pasa a `ABONADA`, `paidUsd` es 50, saldo 92.50, `shouldIssueTicket` es `false`, y encola `abono_registrado`.
- Un segundo comprobante de 92.50 aprobado pasa a `PAGADA`, `paidUsd` es 142.50 y `shouldIssueTicket` es `true`.
- `rejectProof` del primer comprobante cuando no hay abonos previos devuelve la reserva a `PENDIENTE_PAGO`, encola `pago_rechazado` y guarda el motivo.
- `rejectProof` cuando ya hay un abono aprobado devuelve la reserva a `ABONADA`, no a `PENDIENTE_PAGO`.
- Un comprobante en `VES` de `1837.06` con la tasa congelada `36.7412` suma `50` USD a `paidUsd`.
- Un pago mayor al saldo deja `PAGADA` y escribe auditoría con acción `PAGO_EN_EXCESO`.
- `approveProof` de un comprobante de otra agencia lanza `ForbiddenError`.
- `submitProof` sobre una reserva de otra cuenta lanza `NotOwnerError`.
- Aprobar dos veces el mismo comprobante no duplica `paidUsd`.
- `registerCashPayment` sobre una `PAGO_EN_SITIO` por el total la pasa a `PAGADA`.

- [ ] **Step 5: Test de transiciones y lista de espera**

- `transitionReservation` a un estado inválido lanza `InvalidTransitionError` y no modifica la fila.
- Cada transición escribe una entrada de auditoría con `before` y `after`.
- Liberar una reserva devuelve `freedSeats: true` y el cupo vuelve a estar disponible.
- `joinWaitlist` rechaza si la cuenta ya tiene una entrada activa para esa salida.
- Cola A de 4, B de 2 y C de 1; se liberan 2 cupos y `processWaitlist` notifica a B, le pone `claimToken` y `claimExpiresAt` a 2 horas.
- No notifica si faltan menos de 3 horas para la salida.
- No notifica si ya hay una entrada `NOTIFICADO` vigente.

- [ ] **Step 6: Implementar**

Reglas críticas de `createReservation`:

1. Validar con `zod`; total de pasajeros entre 1 y 6.
2. Verificar documentos de la cuenta antes de abrir la transacción.
3. `prisma.$transaction` con `SELECT id FROM "Departure" WHERE id = $1 FOR UPDATE` como primera sentencia.
4. Recargar la salida y su ruta dentro de la transacción, comprobar `status === "PROGRAMADA"` y `departsAt > now`.
5. Recalcular disponibilidad dentro de la transacción con `getAvailability(id, tx)`.
6. Tomar tarifa de la ruta, tasa de salida vigente y tasa de cambio, y llamar a `computeAmounts`.
7. Generar el serial con hasta 5 reintentos ante choque de unicidad.
8. Crear reserva, pasajeros, auditoría y mensaje encolado.

`transitionReservation` bloquea la salida cuando la transición vuelve a ocupar cupo, valida con `assertTransition`, actualiza los campos derivados y devuelve los efectos. Nunca hace entrada o salida de archivos ni envía mensajes: eso queda para el llamador.

`storage.ts` resuelve rutas bajo `UPLOADS_DIR`, rechaza rutas que escapen del directorio y verifica la firma de bytes de las imágenes (`FF D8 FF`, `89 50 4E 47`, `RIFF....WEBP`).

- [ ] **Step 7: Verificar y mutar**

Run: `pnpm test:integration` — PASS, incluido el test de concurrencia con exactamente 10 reservas.

Mutación: sustituye el `FOR UPDATE` por un `SELECT` simple y confirma que el test de concurrencia falla. Revierte y verifica verde.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add reservations with locked availability, installments and waitlist"
```

---

### Task 7: Tickets con QR y bandeja de mensajes

**Files:**
- Create: `src/modules/tickets/qr.ts`, `src/modules/tickets/pdf.ts`, `src/modules/tickets/issue.ts`, `src/modules/tickets/index.ts`
- Create: `src/modules/messaging/provider.ts`, `src/modules/messaging/templates.ts`, `src/modules/messaging/fake-provider.ts`, `src/modules/messaging/enqueue.ts`, `src/modules/messaging/deliver.ts`, `src/modules/messaging/index.ts`
- Create: `docs/whatsapp-templates.md`
- Test: `tests/unit/tickets/qr.test.ts`, `tests/unit/messaging/templates.test.ts`, `tests/integration/tickets/issue.test.ts`, `tests/integration/messaging/deliver.test.ts`

**Interfaces:**
- Produces:
  - `signTicketCode(code): string` con formato `CODIGO.FIRMA` y firma base32 de 16 caracteres.
  - `verifyTicketQr(payload): { valid: boolean; code: string | null }`
  - `issueTicket(reservationId): Promise<{ pdfPath; qrPayload }>` idempotente.
  - `buildTicketLines(data: TicketPdfData): string[]` para poder verificar el contenido en tests.
  - `TEMPLATE_KEYS`, `TemplateKey`, `ONCE_PER_RESERVATION_TEMPLATES`, `templateParams(key)`, `templateButtons(key)`, `renderPreview(key, params)`
  - `enqueueMessage(tx, input): Promise<void>` — ignora el choque del índice parcial.
  - `deliverPendingMessages(now): Promise<{ sent: number; failed: number }>`
  - `getWhatsAppProvider(): WhatsAppProvider`, `FakeWhatsAppProvider` con `sent`, `failNextN(n)` y `reset()`.

- [ ] **Step 1: Test del QR**

- `signTicketCode("TR-0815-4PAX-K7Q2")` produce `código.firma` con firma de 16 caracteres que cumple `/^[A-Z2-7]{16}$/`.
- Es determinista y distinto para códigos distintos.
- `verifyTicketQr` valida el payload íntegro y devuelve el código.
- Rechaza una firma alterada en un solo carácter.
- Rechaza la firma de un código distinto pegada a otro código.
- Rechaza `""`, `"sin-punto"`, `"a.b.c"`, `"."` y `"TR-0815-4PAX-K7Q2."`.

Implementación: HMAC-SHA256 con `TICKET_SECRET`, codificado en base32 `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567`, truncado a 16, comparado con `timingSafeEqual` sobre buffers de igual longitud.

- [ ] **Step 2: Test de plantillas**

- `TEMPLATE_KEYS` contiene exactamente las diez de la spec §16.
- `ONCE_PER_RESERVATION_TEMPLATES` es `["confirmacion_2h", "recordatorio_24h", "reconfirmacion_pago_sitio", "ticket_emitido"]`.
- `templateButtons("reconfirmacion_pago_sitio")` es `["RECONFIRMAR"]`; `templateButtons("confirmacion_2h")` es `["ASISTE", "INCONVENIENTE"]`; `templateButtons("solicitud_recibida")` es `[]`.
- `renderPreview` sustituye los parámetros y no deja `{{`.
- `renderPreview` lanza nombrando el parámetro que falta.

Los textos son los de la spec, en español, y `abono_registrado` dice el monto abonado y el saldo pendiente.

- [ ] **Step 3: Ejecutar los dos tests unitarios, implementar, verificar verde**

- [ ] **Step 4: Test de emisión de ticket**

- `issueTicket` de una reserva `PAGADA` guarda el PDF, cuyo contenido empieza por `%PDF`, y el `qrPayload` verifica correctamente contra el serial.
- Dos llamadas conservan el mismo `qrPayload` y dejan una sola fila de `Ticket`.
- `buildTicketLines` de una reserva de 4 pasajeros contiene las cuatro cédulas, el serial, la ruta, la agencia, el punto de encuentro, la placa del vehículo y la hora en formato `HH:mm`.
- `issueTicket` de una reserva que no está `PAGADA` lanza con mensaje que menciona `PAGADA`.
- Emitir encola `ticket_emitido` una sola vez.

- [ ] **Step 5: Test de entrega de mensajes**

- Un mensaje `ENCOLADO` vencido se envía y queda `ENVIADO` con `providerMessageId` y `sentAt`.
- Con plantilla `ticket_emitido`, además del envío de plantilla se registra un envío de documento con ruta terminada en `.pdf`.
- Con un fallo simulado, el mensaje sigue `ENCOLADO`, `attempts` es 1, `scheduledFor` avanza 1 minuto y `lastError` contiene el mensaje del fallo.
- Tras cinco fallos, queda `FALLIDO` y la reserva tiene `manualContactRequired: true`.
- Un mensaje con `scheduledFor` futuro no se toma.

- [ ] **Step 6: Implementar y verificar verde**

`deliverPendingMessages` toma hasta 50 mensajes ordenados por `scheduledFor`, y aplica `nextRetryDelayMinutes(attempts)` tras cada fallo.

El PDF es A5 con: encabezado del terminal, nombre de la agencia, serial en grande, QR, ruta, fecha y hora en formato de 24 horas con la etiqueta de hora de Venezuela, punto de encuentro, placa del vehículo, lista de pasajeros con nombre y cédula, y el desglose de tarifa, tasa de salida y total.

- [ ] **Step 7: Documentar plantillas y commitear**

`docs/whatsapp-templates.md` con el texto exacto de cada plantilla, sus parámetros numerados y sus botones, listo para registrar en Meta cuando se active el proveedor real.

```bash
git add -A && git commit -m "feat: add signed QR tickets, PDF generation and message delivery"
```

---

### Task 8: Worker y barridos programados

**Files:**
- Create: `src/worker/index.ts`, `src/worker/boss.ts`, `src/worker/sweeps.ts`
- Test: `tests/integration/worker/sweeps.test.ts`

**Interfaces:**
- Produces: `runSweeps(now: Date): Promise<{ expiredUnpaid: number; reminders24h: number; released12h: number; confirmations2h: number; waitlistExpired: number; departuresClosed: number }>`

- [ ] **Step 1: Escribir los tests**

- Una reserva `PENDIENTE_PAGO` con `expiresAt` vencido pasa a `LIBERADA` y su cupo vuelve a estar disponible; una con `expiresAt` futuro no se toca; una `EN_VALIDACION` con `expiresAt` vencido tampoco.
- Salida a 24 horas: encola `recordatorio_24h` a las `PAGADA` y `ABONADA`, y `reconfirmacion_pago_sitio` a las `PAGO_EN_SITIO`.
- Ejecutar el barrido dos veces no duplica el recordatorio.
- Recupera salidas de la ventana de 12 a 24 horas que quedaron sin aviso.
- A 12 horas, las `PAGO_EN_SITIO` sin `reconfirmedAt` pasan a `LIBERADA` y encolan `reserva_liberada`; las reconfirmadas no.
- Una reserva `PAGADA` nunca se libera aunque no responda.
- Liberar por cualquiera de las dos vías dispara la notificación a la lista de espera.
- A 2 horas, encola `confirmacion_2h` a `PAGADA` y a `PAGO_EN_SITIO` reconfirmadas.
- Una salida `PROGRAMADA` ya pasada queda `MANIFIESTO_CERRADO`.
- Una entrada de lista de espera notificada y vencida pasa a `EXPIRADO` y se notifica a la siguiente.

- [ ] **Step 2: Ejecutar, implementar, verificar verde**

`runSweeps` ejecuta los seis barridos en orden, cada uno en su propia transacción, y devuelve los contadores. Usa las ventanas de `@/modules/scheduler`.

- [ ] **Step 3: Implementar el proceso worker**

`src/worker/index.ts` arranca pg-boss sobre `DATABASE_URL`, programa `sweep` cada 5 minutos y `deliver` cada minuto, registra los handlers, imprime los contadores de cada ejecución con la hora en formato de 24 horas, y cierra limpiamente ante `SIGINT` y `SIGTERM`.

- [ ] **Step 4: Verificación manual y mutación**

```bash
pnpm worker:dev
```

Expected: imprime el arranque y las ejecuciones periódicas sin errores.

Mutación: incluye `PAGADA` en el filtro de liberación de 12 horas y confirma que el test correspondiente falla. Revierte.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add worker with scheduled sweeps and message delivery loop"
```

---

### Task 9: Área del pasajero

**Files:**
- Create: `src/app/mi/layout.tsx`, `src/app/mi/reservar/page.tsx`, `src/app/mi/reservar/booking-form.tsx`, `src/app/mi/reservar/actions.ts`
- Create: `src/app/mi/reservas/page.tsx`, `src/app/mi/reservas/[code]/page.tsx`, `src/app/mi/reservas/[code]/pay-form.tsx`, `src/app/mi/reservas/actions.ts`
- Create: `src/app/mi/documentos/page.tsx`, `src/app/mi/documentos/actions.ts`
- Create: `src/app/api/archivos/[...path]/route.ts`
- Modify: `src/app/page.tsx`
- Test: `tests/integration/app/passenger-actions.test.ts`

**Interfaces:**
- Consumes: `createReservation`, `submitProof`, `listBookableDepartures`, `saveUpload`, `assertImageBuffer`, `requirePassenger`.
- Produces: server actions `submitBookingAction`, `submitProofAction`, `uploadDocumentAction`, `joinWaitlistAction`.

- [ ] **Step 1: Tests de las acciones**

- `uploadDocumentAction` con un PNG válido guarda el documento de tipo `CEDULA` y lo asocia a la cuenta.
- Con un archivo que no es imagen aunque declare `image/png`, falla con mensaje en español.
- Con un archivo mayor a 5 MB, falla.
- `submitBookingAction` sin foto de cédula devuelve el error de documentos faltantes.
- `submitBookingAction` completo crea la reserva y devuelve su serial.
- `submitProofAction` de un monto parcial deja la reserva `EN_VALIDACION`.
- `submitProofAction` sobre una reserva ajena falla con `NotOwnerError`.
- La ruta `/api/archivos/...` devuelve 401 sin sesión, 403 para un archivo de otra cuenta, y el archivo para su dueño.

- [ ] **Step 2: Implementar las páginas**

`/mi/documentos`: subida de foto de cédula (obligatoria) y de permiso de viaje (opcional), con vista previa y estado de cada documento.

`/mi/reservar`, en cuatro pasos dentro de una página:
1. Elegir ruta y salida, con buscador por origen y destino y filtro de fecha. Cada salida muestra agencia, hora en formato de 24 horas, tarifa, tasa de salida y cupos disponibles.
2. Cantidad de 1 a 6, limitada al disponible, y datos de cada acompañante: nombre, cédula y año de nacimiento. Si algún año implica menor de edad, avisa que hará falta el permiso de viaje.
3. Aceptar políticas de cancelación y manejo de datos.
4. Elegir método de pago. Digital muestra los datos de cobro del método y el monto total; permite indicar que se abonará una parte. Físico muestra el aviso de reserva condicional.

Si la salida no tiene cupo, ofrece anotarse en lista de espera.

`/mi/reservas`: tarjetas con serial, ruta, salida, estado, total, abonado y saldo. `/mi/reservas/[code]`: detalle con historial de pagos, formulario para subir un nuevo comprobante mientras haya saldo, y descarga del ticket cuando está pagada.

`/api/archivos/[...path]`: sirve comprobantes, documentos y tickets verificando que el solicitante sea el dueño de la cuenta o un usuario de panel con permiso sobre esa agencia.

- [ ] **Step 3: Verificar y commitear**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration` — verde.

```bash
git add -A && git commit -m "feat: add passenger area with booking, documents and payments"
```

---

### Task 10: Panel del operador

**Files:**
- Create: `src/app/panel/layout.tsx`, `src/app/panel/page.tsx`
- Create: `src/app/panel/pagos/page.tsx`, `src/app/panel/pagos/actions.ts`
- Create: `src/app/panel/pasajeros/page.tsx`
- Create: `src/app/panel/vehiculos/page.tsx`, `src/app/panel/choferes/page.tsx`, `src/app/panel/flota/actions.ts`
- Create: `src/app/panel/salidas/page.tsx`, `src/app/panel/salidas/[id]/page.tsx`, `src/app/panel/salidas/actions.ts`
- Create: `src/app/panel/abordaje/[departureId]/page.tsx`, `src/app/panel/abordaje/[departureId]/scanner.tsx`, `src/app/panel/abordaje/actions.ts`
- Create: `src/app/panel/movimientos/page.tsx`, `src/app/panel/recaudacion/page.tsx`
- Create: `src/modules/trips/trip-log.ts`, `src/modules/trips/index.ts`
- Create: `src/modules/reports/agency.ts`, `src/modules/reports/index.ts`
- Test: `tests/integration/trips/trip-log.test.ts`, `tests/integration/panel/operator-actions.test.ts`, `tests/integration/reports/agency.test.ts`

**Interfaces:**
- Produces:
  - `startBoarding(input: { departureId; panelUserId; agencyId })` — crea `TripLog` con `boardingStartedAt` y pasa la salida a `MANIFIESTO_CERRADO`.
  - `registerDeparture(input: { departureId; panelUserId; agencyId }): Promise<{ noShows: number; cancelled: number; passengerCount: number }>` — escribe `departedAt`, pasa a `EN_RUTA`, marca `NO_SHOW` a las `PAGADA` sin abordaje y `CANCELADA` a las `PAGO_EN_SITIO` impagas, y congela `passengerCount`.
  - `registerArrival(input: { departureId; panelUserId; agencyId })` — escribe `arrivedAt` y pasa a `FINALIZADA`.
  - `findForBoarding(departureId, codeOrQr, agencyId): Promise<{ reservation: BoardingView } | { error: string }>`
  - `confirmBoarding(input: { reservationId; passengerIds; panelUserId; agencyId })`
  - `listAgencyPassengers(agencyId, filter)`, `revenueByRoute(agencyId, from, to)`, `driverMovements(agencyId, from, to)`

- [ ] **Step 1: Tests de viaje**

- `startBoarding` crea el `TripLog` y cierra el manifiesto; una reserva nueva en esa salida falla con `DepartureClosedError`.
- Llamar dos veces a `startBoarding` no crea dos `TripLog`.
- `registerDeparture` marca `NO_SHOW` solo a las `PAGADA` sin `boardedAt`, deja intactas las `ABORDADA`, y cancela las `PAGO_EN_SITIO` impagas con motivo en español.
- `registerDeparture` congela `passengerCount` con la suma de pasajeros efectivamente abordados.
- `registerArrival` escribe `arrivedAt` y pasa la salida a `FINALIZADA`.
- `registerArrival` antes de `registerDeparture` falla con mensaje en español.
- La duración del recorrido calculada coincide con la diferencia entre ambas horas.
- Las tres acciones sobre una salida de otra agencia lanzan `ForbiddenError`.

- [ ] **Step 2: Tests de abordaje y del panel**

- `findForBoarding` encuentra por serial escrito y por payload de QR válido.
- Un QR con firma manipulada devuelve error sin consultar la base de datos.
- Un serial de otra salida devuelve error.
- Un serial de otra agencia devuelve error.
- `confirmBoarding` marca `boardedAt` en los pasajeros indicados y pasa la reserva a `ABORDADA`.
- No permite abordar una reserva `CANCELADA`, `LIBERADA` ni `EN_VALIDACION`.
- `approveProof` desde la acción del panel emite el ticket cuando el saldo llega a cero y no lo emite cuando queda saldo.
- `listAgencyPassengers` no devuelve pasajeros de otra agencia y expone serial, titular, total, abonado, saldo y estado.

- [ ] **Step 3: Tests de reportes de agencia**

Con pagos sembrados en horas conocidas: `revenueByRoute` de las últimas 24 horas suma solo los pagos aprobados de esa agencia, agrupados por ruta, y excluye los de otra agencia y los rechazados. `driverMovements` devuelve por cada viaje el chofer, la ruta, la hora de embarque, la duración y la hora de desembarque, todas en formato de 24 horas.

- [ ] **Step 4: Ejecutar, implementar, verificar verde**

Toda acción del panel empieza con `const user = await requirePanelUser("<permiso>")` y usa `requireAgencyScope(user)` para obtener el `agencyId`; nunca acepta un `agencyId` que venga del formulario.

- [ ] **Step 5: Implementar las pantallas**

Interfaz sobria con Tailwind, legible en móvil en la pantalla de abordaje. Cada tabla muestra las horas en formato de 24 horas.

- `/panel`: tarjetas con comprobantes pendientes, próximas salidas, recaudación de las últimas 24 horas y mensajes fallidos.
- `/panel/pagos`: cola de comprobantes con imagen ampliable, monto declarado, total y saldo de la reserva, y botones de aprobar y rechazar con motivo. Sección de cobro en sitio con búsqueda por serial.
- `/panel/pasajeros`: tabla con filtros por salida y estado, y exportación a CSV.
- `/panel/vehiculos` y `/panel/choferes`: alta, edición y desactivación. La tabla de choferes muestra total de embarques y de desembarques.
- `/panel/salidas` y `/panel/salidas/[id]`: crear salida asignando vehículo y chofer, ver ocupación y manifiesto, y los tres botones de embarque, salida y llegada.
- `/panel/abordaje/[departureId]`: campo para escribir el serial y lector de QR con la cámara usando `BarcodeDetector` cuando el navegador lo soporte, con aviso claro cuando no. Muestra el grupo con casillas por pasajero.
- `/panel/movimientos`: lista de movimientos de sus choferes.
- `/panel/recaudacion`: recaudación por ruta en las últimas 24 horas y por rango de fechas, con exportación a CSV.

- [ ] **Step 6: Verificar y commitear**

Run: la suite completa en verde.

```bash
git add -A && git commit -m "feat: add operator panel with payments, fleet, boarding and trip logs"
```

---

### Task 11: Panel del admin del terminal

**Files:**
- Create: `src/app/panel/admin/layout.tsx`, `src/app/panel/admin/tablero/page.tsx`
- Create: `src/app/panel/admin/movimientos/page.tsx`, `src/app/panel/admin/usuarios/page.tsx`
- Create: `src/app/panel/admin/agencias/page.tsx`, `src/app/panel/admin/agencias/actions.ts`
- Create: `src/app/panel/admin/tasas/page.tsx`, `src/app/panel/admin/tasas/actions.ts`
- Create: `src/app/panel/admin/mensajes/page.tsx`
- Create: `src/app/api/admin/tablero/route.ts`
- Create: `src/modules/reports/terminal.ts`
- Modify: `src/modules/reports/index.ts`
- Test: `tests/integration/reports/terminal.test.ts`, `tests/integration/panel/admin-actions.test.ts`

**Interfaces:**
- Produces:
  - `departureTaxRevenue(from, to): Promise<{ totalUsd: Decimal; reservations: number }>` — suma `taxTotalUsd` de reservas que alcanzaron `PAGADA` en la ventana, leyendo la fecha desde la auditoría de la transición.
  - `terminalTripCount(from, to): Promise<number>`
  - `newAccounts(from, to): Promise<number>`, `recurringAccounts(from, to): Promise<number>`
  - `agencyMovements(from, to): Promise<AgencyMovement[]>` con agencia, ruta, chofer, placa, hora de embarque, hora de desembarque, duración en minutos y cantidad de pasajeros.
  - `listAccounts(filter: { search?; page?; pageSize? }, panelUserId): Promise<Paginated<AccountRow>>` — escribe auditoría en cada llamada.
  - `createAgencyWithOperator(input)`, `deactivateAgency(agencyId)`

- [ ] **Step 1: Tests de reportes del terminal**

Con datos sembrados en horas conocidas dentro y fuera de la ventana de 24 horas:

- `departureTaxRevenue` suma solo la tasa de las reservas que llegaron a `PAGADA` dentro de la ventana, y su cifra coincide con la suma manual esperada.
- No cuenta la tarifa de la agencia, solo la tasa.
- `terminalTripCount` cuenta los `TripLog` con `arrivedAt` en la ventana, de todas las agencias.
- `newAccounts` cuenta las cuentas creadas en la ventana.
- `recurringAccounts` cuenta las cuentas con dos o más reservas `PAGADA` o `ABORDADA`, y no cuenta una cuenta con una sola.
- `agencyMovements` devuelve viajes de las dos agencias sembradas, con la duración correcta en minutos y el nombre del chofer.
- `listAccounts` filtra por cédula y por nombre, y escribe una entrada de auditoría con acción `CONSULTA_USUARIOS` y el filtro aplicado.

- [ ] **Step 2: Tests de acciones del admin**

- `createAgencyWithOperator` crea la agencia y su primer usuario operador con la contraseña indicada, y el operador solo ve su agencia.
- Un `OPERADOR` que invoca cualquier acción de admin recibe `ForbiddenError`.
- Un `ADMIN` que invoca `approveProof` recibe `ForbiddenError`, porque el admin supervisa y no vende.
- `setDepartureTax` desde el panel escribe la nueva tasa y deja la anterior en el historial, y no altera reservas ya creadas.

- [ ] **Step 3: Ejecutar, implementar, verificar verde**

Para saber cuándo una reserva alcanzó `PAGADA`, añade a `Reservation` el campo `paidAt` en una migración nueva y escríbelo en la transición. Es más simple y más rápido que reconstruirlo desde la auditoría; ajusta `departureTaxRevenue` para usarlo y documenta el cambio en la spec.

- [ ] **Step 4: Implementar las pantallas**

- `/panel/admin/tablero`: cuatro tarjetas grandes con tasa de salida recaudada en las últimas 24 horas, recorridos, usuarios nuevos y usuarios recurrentes, más un gráfico simple de la recaudación por hora del día en formato de 24 horas. La tarjeta de la tasa se actualiza sola cada 30 segundos consultando `/api/admin/tablero`.
- `/panel/admin/movimientos`: tabla de movimientos de todas las agencias con filtros de fecha y agencia, y exportación a CSV.
- `/panel/admin/usuarios`: buscador por cédula o nombre, tabla paginada con cédula completa, nombre, teléfono, año de nacimiento, viajes pagados y última actividad, con un aviso visible de que el acceso queda registrado.
- `/panel/admin/agencias`: alta de agencia con su primer operador, y desactivación.
- `/panel/admin/tasas`: tasa de salida vigente con su historial y las tasas de cambio.
- `/panel/admin/mensajes`: bandeja de mensajes salientes con estado, destinatario, plantilla, intentos y último error. En el MVP esta pantalla es el sustituto visible de WhatsApp.

- [ ] **Step 5: Verificar y commitear**

```bash
git add -A && git commit -m "feat: add terminal admin dashboard, user database and agency movements"
```

---

### Task 12: Prueba de extremo a extremo y puesta a punto del MVP

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/flujo-completo.spec.ts`, `tests/e2e/setup.ts`
- Create: `README.md`, `docs/operacion.md`
- Create: `src/app/api/health/route.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `GET /api/health` con `{ status, db, pendingMessages, staleMessages }`.

- [ ] **Step 1: Ruta de salud**

Ejecuta `SELECT 1`, cuenta mensajes `ENCOLADO` y los que llevan más de 15 minutos vencidos. Responde 503 si la base de datos no contesta.

- [ ] **Step 2: Configurar Playwright**

`playwright.config.ts` con `webServer` que ejecuta `pnpm build && pnpm start` con `.env.test`, `baseURL: "http://localhost:3000"`, un solo worker y `reuseExistingServer` en local. `tests/e2e/setup.ts` resetea la base de test y ejecuta el seed.

- [ ] **Step 3: Escribir el flujo completo**

`tests/e2e/flujo-completo.spec.ts`, un solo test que recorre:

1. Registrar un pasajero nuevo con cédula, nombre, teléfono y año de nacimiento.
2. Subir la foto de cédula desde `tests/fixtures/cedula.png`.
3. Reservar tres asientos en una salida sembrada, con dos acompañantes.
4. Comprobar que el detalle muestra el serial, el total con tasa de salida incluida y el estado pendiente de pago.
5. Subir un comprobante parcial con imagen y referencia.
6. Entrar al panel como el operador de esa agencia y aprobar el comprobante.
7. Comprobar que la reserva quedó abonada con el saldo correcto.
8. Subir el segundo comprobante por el saldo y aprobarlo.
9. Comprobar que la reserva quedó pagada y que el ticket se puede descargar.
10. Iniciar embarque, abordar el grupo por su serial, registrar la salida y registrar la llegada.
11. Entrar como admin y comprobar que el tablero muestra la tasa de salida recaudada y el recorrido registrado.

Un segundo test corto: una reserva de pago en sitio aparece como condicional en el manifiesto de la salida.

- [ ] **Step 4: Ejecutar la suite completa**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e
```

Expected: todo en verde. Adjunta la salida real al reporte.

- [ ] **Step 5: Escribir README y documentación operativa**

`README.md`: qué es TicketRuta, requisitos, arranque en localhost en seis comandos, credenciales del seed, comandos de test, y enlaces a la spec y al plan.

`docs/operacion.md`: rutina del operador, rutina del admin, alta de agencia y flota, carga de tasas, qué significa cada estado de reserva, y qué hacer con mensajes fallidos.

- [ ] **Step 6: Actualizar `CLAUDE.md`**

Añade el glosario de módulos con una línea por carpeta de `src/modules/*`, `src/lib/*` y `src/worker/*`, con su responsabilidad y su API pública, y confirma los comandos reales.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: add end-to-end flow, health check and MVP documentation"
```

---

## Notas para el orquestador

- Orden obligatorio: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.
- Cada subagente recibe su tarea, la sección "Global Constraints" y los bloques "Interfaces" de las tareas anteriores de las que consume.
- Reporte obligatorio por tarea: qué se implementó, decisiones tomadas sobre la marcha, archivos creados o modificados, **salida real de los comandos de test**, y desvíos respecto al plan.
- El orquestador no cierra una tarea sin ver la salida real de los tests. Un reporte que afirme que los tests pasan sin mostrar la salida se devuelve al subagente.
- Si un subagente descubre que el plan es incorrecto en algún punto, debe reportarlo en vez de improvisar en silencio.
