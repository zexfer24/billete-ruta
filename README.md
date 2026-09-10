# TicketRuta

Sistema de reservas y control de pasajeros para un **terminal terrestre** que aloja varias agencias de viaje. Sustituye el registro en papel y el cobro informal en taquilla por identidad verificada, pago con comprobante, ticket digital con código QR, control de embarque y desembarque, y estadística en tiempo real para el terminal.

## Los tres actores

| Actor | Entra por | Qué hace |
|---|---|---|
| **Pasajero** | `/ingresar` con su cédula | Reserva puestos, sube sus documentos, paga o abona, descarga su ticket |
| **Operador** | `/panel/ingresar` | Confirma pagos, gestiona vehículos, choferes y salidas, controla el abordaje, ve su recaudación |
| **Admin del terminal** | `/panel/ingresar` | Ve la tasa de salida recaudada, los recorridos, la base de usuarios y los movimientos de todas las agencias |

Un operador solo ve datos de su propia agencia. El aislamiento es una regla de seguridad verificada por tests, no una comodidad de interfaz.

## Requisitos

- Node.js 22 o superior
- pnpm 10 o superior
- Docker, solo para la base de datos

## Arranque en localhost

```bash
pnpm install
pnpm db:up                 # PostgreSQL de desarrollo en el puerto 5434
pnpm db:test:up            # PostgreSQL de pruebas en el puerto 5435
pnpm db:deploy             # aplica las migraciones
pnpm seed                  # datos de demostración; imprime las credenciales
pnpm dev                   # http://localhost:3000
```

En otra terminal, para que corran los recordatorios y la liberación de cupos:

```bash
pnpm worker:dev
```

### Credenciales de demostración

El seed las imprime al terminar. Son:

| Quién | Usuario | Contraseña |
|---|---|---|
| Admin del terminal | `admin@ticketruta.test` | `Admin.2026` |
| Operador Expresos Los Andes | `andes@ticketruta.test` | `Operador.2026` |
| Operador Transporte Caribe | `caribe@ticketruta.test` | `Operador.2026` |
| Pasajera de prueba | cédula `V12345678` | `Pasajero.2026` |
| Pasajero de prueba | cédula `V87654321` | `Pasajero.2026` |

El seed carga dos agencias con sus rutas, vehículos y choferes, 63 salidas repartidas en los próximos siete días, seis métodos de pago, la tasa de salida vigente y las tasas de cambio.

### Datos de un día normal de operación

Para ver las pantallas con volumen real en vez de una base casi vacía:

```bash
pnpm mock            # añade los datos
pnpm mock --reset    # los borra y los vuelve a generar
```

Genera unas 1500 cuentas de pasajero, doce días de viajes ya cumplidos con sus recorridos y horas de embarque y desembarque, y unas 1600 reservas repartidas en todos los estados: pagadas, abonadas a medias, en validación, de pago en sitio, liberadas y canceladas. Con eso la cola de pagos del operador, el tablero del terminal y la base de usuarios se ven como en un día cualquiera. Todas las cuentas generadas usan la contraseña `Pasajero.2026`.

## Recorrido sugerido para probarlo

1. Entra como pasajero, sube la foto de cédula en Documentos.
2. Reserva tres puestos en cualquier salida. Verás el desglose de tarifa más tasa de salida.
3. Sube un comprobante por una parte del total. La reserva queda en validación.
4. Entra como el operador de esa agencia y aprueba el comprobante en Pagos. La reserva queda abonada con su saldo.
5. Vuelve como pasajero, sube un segundo comprobante por el saldo, y que el operador lo apruebe. Se emite el ticket con su QR.
6. En el panel del operador, abre la salida, inicia el embarque, aborda el grupo por su serial, registra la salida y luego la llegada.
7. Entra como admin y mira el tablero: la tasa de salida recaudada, el recorrido registrado y los usuarios.

Los mensajes de WhatsApp no salen a la red en esta versión: quedan registrados y se leen en el panel del admin, en Mensajes.

## Comandos

```bash
pnpm dev                   # aplicación en desarrollo
pnpm worker:dev            # barridos y entrega de mensajes
pnpm build                 # compilación de producción
pnpm typecheck             # tipos
pnpm lint                  # estilo
pnpm test                  # pruebas unitarias
pnpm test:integration      # pruebas contra PostgreSQL real (requiere pnpm db:test:up)
pnpm test -- tests/unit/booking/state-machine.test.ts    # un solo archivo
pnpm seed                  # datos de demostración, idempotente
pnpm db:migrate            # nueva migración en desarrollo
pnpm mock --reset          # datos de un día normal de operación
```

## Cómo está organizado

```
src/
  app/        rutas de Next.js: portada, acceso, área del pasajero y panel
  modules/    dominio, cada carpeta con su API pública en index.ts
  lib/        utilidades compartidas: base de datos, entorno, dinero, tiempo, identidad, archivos
  worker/     proceso aparte que ejecuta los barridos programados
prisma/       esquema, migraciones y datos de demostración
tests/        unit/ e integration/
docker/       PostgreSQL de desarrollo y de pruebas
```

Los módulos de dominio son: `accounts`, `agencies`, `auth`, `audit`, `booking`, `catalog`, `messaging`, `payments`, `reports`, `scheduler`, `tickets` y `trips`. Ningún módulo importa archivos internos de otro.

## Documentos del proyecto

- `docs/superpowers/specs/2026-09-10-ticketruta-design.md` — especificación aprobada, fuente de verdad del modelo de datos, los estados y las reglas de negocio.
- `docs/superpowers/plans/2026-09-10-ticketruta-mvp.md` — plan de implementación.
- `docs/operacion.md` — rutina diaria del operador y del admin.
- `CLAUDE.md` — contexto para trabajar con asistentes de código.
- `Documentación/` — los documentos de negocio originales en PDF.

## Qué queda fuera de esta versión

- El envío real por WhatsApp con la Meta Cloud API. La interfaz `WhatsAppProvider` ya está lista y las plantillas documentadas; solo falta la implementación del proveedor.
- La captación desde Instagram con ManyChat, que en la práctica es compartir el enlace público.
- El despliegue con Docker de la aplicación completa. Esta versión está pensada para correr en localhost.
- La seudonimización por retención de datos, descrita en la especificación.

## Nota al desarrollar

`pnpm dev` y `pnpm build` comparten la carpeta `.next`. Si ejecutas la compilación mientras el servidor de desarrollo está en marcha, el servidor se queda sin sus fragmentos y la aplicación empieza a fallar con errores del tipo `Cannot find module './2007.js'`. Detén el servidor antes de compilar, o reinícialo después.
