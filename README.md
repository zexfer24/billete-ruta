# TicketRuta

Sistema de reservas y control de pasajeros para un **terminal terrestre** que aloja varias agencias de viaje. Sustituye el registro en papel y el cobro informal en taquilla por identidad verificada, pago con comprobante, ticket digital con código QR, control de embarque y desembarque, y estadística en tiempo real para el terminal.

## Los tres actores

| Actor | Entra por | Qué hace |
|---|---|---|
| **Pasajero** | `/` o `/ingresar` con su cédula | Ve sus avisos en Inicio, reserva puestos, sube sus documentos, paga o abona, y muestra su ticket con QR en pantalla o lo descarga en PDF |
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
pnpm db:deploy             # aplica las migraciones a la base de desarrollo
pnpm db:test:deploy        # aplica las migraciones a la base de pruebas
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

El seed carga dos agencias con sus rutas, vehículos y choferes, 63 salidas repartidas en los próximos siete días, ocho métodos de pago (cuatro digitales con comprobante y cuatro en taquilla), la tasa de salida vigente y las tasas de cambio.

### Datos de un día normal de operación

Para ver las pantallas con volumen real en vez de una base casi vacía:

```bash
pnpm mock            # añade los datos
pnpm mock --reset    # los borra y los vuelve a generar
```

Genera unas 1500 cuentas de pasajero, doce días de viajes ya cumplidos con sus recorridos y horas de embarque y desembarque, y unas 1600 reservas repartidas en todos los estados: pagadas, abonadas a medias, en validación, de pago en sitio, liberadas y canceladas. Con eso la cola de pagos del operador, el tablero del terminal y la base de usuarios se ven como en un día cualquiera. Todas las cuentas generadas usan la contraseña `Pasajero.2026`.

El mock también escribe imágenes de demostración en la carpeta de subidas (`UPLOADS_DIR`, que es obligatoria y vale `./uploads` en `.env.example`): una foto de cédula por cada documento generado y una imagen por cada comprobante de pago. Así el operador puede abrir un comprobante en "Por revisar", y el pasajero ve su cédula en Documentos, sin que aparezcan imágenes rotas. Las dos imágenes de origen están en `prisma/mock-assets/` y no contienen datos de personas reales.

## Recorrido sugerido para probarlo

1. Abre `/` sin sesión y mira las próximas salidas; busca una ruta con el buscador de la portada y deja que te lleve a ingresar.
2. Entra como pasajero, sube la foto de cédula en Documentos.
3. Reserva tres puestos en cualquier salida. Verás el desglose de tarifa más tasa de salida.
4. Sube un comprobante por una parte del total. La reserva queda en validación.
5. Entra como el operador de esa agencia y aprueba el comprobante desde "Pasajeros y pagos" (pestaña "Por revisar"). La reserva queda abonada con su saldo.
6. Vuelve como pasajero, sube un segundo comprobante por el saldo, y que el operador lo apruebe. Se emite el ticket con su QR.
7. En Taquilla, vende un pasaje a un pasajero sin cuenta: búscalo por cédula, créale la cuenta sin contraseña, súbele la foto de cédula y cóbrale en efectivo. El ticket sale al momento, con canal "Taquilla".
8. En el panel del operador, abre la salida, inicia el embarque, aborda el grupo por su serial, registra la salida y luego la llegada.
9. Entra como admin y mira el tablero: la tasa de salida recaudada, el recorrido registrado y los usuarios.
10. Como pasajero, abre Inicio para ver tus avisos, revisa Mis viajes y entra al detalle de una reserva con ticket para ver el QR en pantalla.

Los mensajes de WhatsApp no salen a la red en esta versión: quedan registrados y se leen en el panel del admin, en Mensajes.

## Comandos

```bash
pnpm dev                   # aplicación en desarrollo
pnpm worker:dev            # barridos y entrega de mensajes
pnpm build                 # compilación de producción
pnpm typecheck             # tipos
pnpm lint                  # estilo
pnpm test                  # pruebas unitarias
pnpm test:integration      # pruebas contra PostgreSQL real (requiere pnpm db:test:up y pnpm db:test:deploy)
pnpm test -- tests/unit/booking/state-machine.test.ts    # un solo archivo
pnpm seed                  # datos de demostración, idempotente
pnpm db:migrate            # nueva migración en desarrollo
pnpm db:test:deploy        # migraciones de la base de pruebas
pnpm mock --reset          # datos de un día normal de operación
```

### La base de pruebas se borra al reiniciar Docker

El contenedor `ticketruta_db_test` (puerto 5435) guarda sus datos en memoria (`tmpfs`, en `docker/docker-compose.test.yml`), para que las pruebas de integración sean rápidas y siempre empiecen de cero. La consecuencia es que, cada vez que se reinicia Docker o el contenedor, la base queda vacía y sin esquema, y todas las pruebas de integración fallan con errores del tipo ``The table `public.DepartureTax` does not exist``. No es un fallo del código. Antes de correrlas otra vez:

```bash
pnpm db:test:up            # si el contenedor no está en marcha
pnpm db:test:deploy        # vuelve a crear el esquema
pnpm test:integration
```

La base de desarrollo (puerto 5434) sí usa un volumen persistente y no se ve afectada.

### Galería de skeletons

En desarrollo, `/dev/esqueletos` muestra en una sola página los skeletons de carga de las tres interfaces, sin tener que forzar una carga lenta. Solo existe con `pnpm dev`: en una compilación de producción responde 404.

## Cómo está organizado

```
src/
  app/        rutas de Next.js: portada, acceso, área del pasajero y panel
  modules/    dominio, cada carpeta con su API pública en index.ts
  lib/        utilidades compartidas: base de datos, entorno, dinero, tiempo, identidad, archivos
  components/ piezas de interfaz compartidas: logo, kit de botones y campos, skeletons, navegación
  worker/     proceso aparte que ejecuta los barridos programados
public/brand/ logo e iconos de la marca
prisma/       esquema, migraciones, datos de demostración e imágenes del mock (mock-assets/)
tests/        unit/, integration/ y fixtures/ (imágenes de prueba)
docker/       PostgreSQL de desarrollo y de pruebas
```

Los módulos de dominio son catorce, y ninguno importa archivos internos de otro:

| Módulo | De qué se ocupa |
|---|---|
| `accounts` | Cuentas de pasajero, activación de cuentas de taquilla y documentos |
| `agencies` | Agencias, vehículos y choferes |
| `audit` | Bitácora de solo inserción |
| `auth` | Sesiones de pasajero y de panel, permisos por rol |
| `booking` | Reservas, cupos, estados y lista de espera |
| `catalog` | Rutas, salidas, tasas de salida y de cambio, cálculo de montos |
| `counter` | Venta en la taquilla de la agencia, en una sola transacción |
| `messaging` | Mensajes de WhatsApp con proveedor intercambiable |
| `notices` | Avisos de Inicio derivados del estado del pasajero |
| `payments` | Abonos, comprobantes y cobros en efectivo |
| `reports` | Tableros y reportes de agencia y de terminal |
| `scheduler` | Ventanas de tiempo de los barridos programados |
| `tickets` | Ticket en PDF con QR firmado |
| `trips` | Embarque, salida, llegada y abordaje |

## Identidad visual

- **Logo**: el texto isométrico "TICKET RUTA" sobre el frente de un autobús. Los archivos están en `public/brand/`: `logo-morado.svg` y `logo-blanco.svg` (logo completo), `isotipo-morado.svg` e `isotipo-blanco.svg` (solo el autobús), los iconos de la app (`icon-192.png`, `icon-512.png`) y la imagen original de referencia. En código se usan con `Logo`, `Isotipo` y `LogoLockup` de `src/components/logo.tsx`.
- **Paleta**: morado de marca `#601DBF` (escala `marca-50` a `marca-950`) como color primario, amarillo sol `#FFC629` como acento y solo sobre fondos morados, neutros de tinta y lienzo, y cuatro colores de estado (éxito, alerta, peligro e información). Los tokens viven en `src/app/globals.css` y los componentes usan solo esas utilidades, nunca colores sueltos.
- **Fuente**: Atkinson Hyperlegible Next, diseñada para distinguir caracteres parecidos (`I`, `l`, `1`, `O`, `0`), lo que importa en códigos de reserva, cédulas y montos.
- Las tres interfaces (pasajero, agencia y terminal) comparten el mismo kit y muestran skeletons de carga en todas las rutas con datos.

La fuente de verdad es `docs/superpowers/specs/2026-09-30-brand-design-system.md`: dónde va el logo, la tabla completa de colores con su contraste, la tipografía, los componentes y los textos de interfaz.

## Documentos del proyecto

- `docs/superpowers/specs/2026-09-10-ticketruta-design.md` — especificación aprobada, fuente de verdad del modelo de datos, los estados y las reglas de negocio.
- `docs/superpowers/plans/2026-09-10-ticketruta-mvp.md` — plan de implementación.
- `docs/superpowers/specs/2026-09-30-brand-design-system.md` — sistema de diseño: marca, paleta, tipografía y componentes.
- `docs/superpowers/plans/2026-09-30-brand-redesign.md` — plan y resultado del rediseño de marca.
- `docs/operacion.md` — rutina diaria del operador y del admin.
- `CLAUDE.md` — contexto para trabajar con asistentes de código.
- `Documentación/` — los documentos de negocio originales en PDF.

## Qué queda fuera de esta versión

- El envío real por WhatsApp con la Meta Cloud API. La interfaz `WhatsAppProvider` ya está lista y las plantillas están definidas en `src/modules/messaging/templates.ts`; falta la implementación del proveedor y el registro de las plantillas en Meta.
- La captación desde Instagram con ManyChat, que en la práctica es compartir el enlace público.
- El despliegue con Docker de la aplicación completa. Esta versión está pensada para correr en localhost.
- La seudonimización por retención de datos, descrita en la especificación.

## Nota al desarrollar

`pnpm dev` y `pnpm build` comparten la carpeta `.next`. Si ejecutas la compilación mientras el servidor de desarrollo está en marcha, el servidor se queda sin sus fragmentos y la aplicación empieza a fallar con errores del tipo `Cannot find module './2007.js'`. Detén el servidor antes de compilar, o reinícialo después.
