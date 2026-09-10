# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Metodología de trabajo

Este proyecto se rige por la metodología Liminal Flows (`/liminalwork`). Todo cambio de diseño, lógica o código pasa por: contexto → Plan Mode (Fable/Opus, razonamiento alto) → explicación al operador → tests propuestos → descomposición en tareas → aprobación → subagentes (Sonnet, uno por tarea) → reporte al orquestador → validación → tests en verde. El orquestador no implementa; coordina, delega y valida.

Idioma de trabajo: español (documentación, comentarios, comunicación). Identificadores de código en inglés.

## Estado del proyecto

Proyecto nuevo (septiembre 2026). Diseño aprobado y especificado en `docs/superpowers/specs/2026-09-10-ticketruta-design.md`; esa spec es la fuente de verdad para modelo de datos, estados, jobs, mensajería y tests. Código todavía por escribir.

## Stack y decisiones fijas

- Next.js 15 (App Router, TypeScript estricto) como monolito: formulario público, panel y API en un repo. Proceso `worker` aparte para jobs con pg-boss sobre PostgreSQL 16. Prisma como ORM. Tailwind. Vitest + Playwright. pnpm.
- WhatsApp: Meta Cloud API detrás de la interfaz `WhatsAppProvider`; `FakeProvider` en tests y desarrollo.
- Hosting: VPS propio con Docker Compose (`app`, `worker`, `db`, `caddy`). Comprobantes y tickets en volumen `uploads`.
- Cupo total por salida, sin asientos numerados. Roles `ADMIN`, `FINANZAS`, `OPERACIONES` con auth propia. Precio base USD por ruta + tasas VES/COP configurables. Solo `PAGO_EN_SITIO` se libera automáticamente (12 h antes sin reconfirmar).
- Zona horaria de negocio `America/Caracas`; almacenamiento en UTC.
- Módulos en `src/modules/*`, cada uno exporta su API pública desde `index.ts`; nadie importa internos de otro módulo.

## Comandos (previstos; confirmar cuando exista el scaffold)

```
pnpm dev / pnpm worker:dev
pnpm build / pnpm lint / pnpm typecheck
pnpm test                       unitarios
pnpm test:integration           necesita docker compose -f docker/docker-compose.test.yml up -d
pnpm test:e2e
pnpm test -- tests/unit/booking/state-machine.test.ts   un archivo
pnpm prisma migrate dev / pnpm seed:admin
```

## Qué es TicketRuta

Sistema de reservas y emisión de tickets para un operador de transporte terrestre interurbano (autobuses), pensado para un operador estatal o regulado por el gobierno. Sustituye el registro manual en papel/cuadernos y el cobro informal en taquilla por un embudo 100% automatizado: captación en Instagram → formulario web progresivo → pago dentro del flujo → base de datos → ticket digital por WhatsApp → recordatorios → control de abordaje.

Contexto geográfico implícito: Venezuela y corredor hacia Colombia (Pago Móvil, Bolívares, Zelle, Nequi, Pesos Colombianos, USDT).

## Flujo de negocio (5 fases)

1. **Captación (Instagram + ManyChat)**: el usuario comenta una palabra clave o envía DM; ManyChat responde con el enlace al sistema de reservas. Sin intervención humana.
2. **Registro dinámico (web/app)**: el usuario elige fecha, ruta y horario; selecciona cantidad de pasajeros (1 a 6); el formulario despliega campos de **nombre completo y cédula** del titular y de cada acompañante; acepta obligatoriamente políticas de cancelación y manejo de datos.
3. **Pago integrado en el flujo**: el pago es requisito para completar la solicitud, no un paso posterior por WhatsApp. Ver reglas de pago abajo.
4. **Base de datos y emisión del ticket**: al enviar, se registra el grupo completo con su comprobante y se genera un **Código de Reserva Único** (formato de referencia: `UT-0815-4PAX`, donde el sufijo indica el tamaño del grupo). Se envía WhatsApp de "solicitud recibida". Finanzas valida el comprobante cambiando el estatus de `Pendiente` a `Pagado`; ese cambio dispara automáticamente el envío del ticket digital definitivo (PDF o imagen, con QR) por WhatsApp.
5. **Recordatorios y abordaje**: 24 h antes, recordatorio con punto de encuentro, hora y recomendaciones. 2 h antes, mensaje con botones interactivos de confirmación ("Sí, confirmamos" / "Tuvimos un inconveniente"). En el abordaje, el equipo busca el código del titular o escanea el QR y el sistema confirma que cubre a todo el grupo.

## Reglas de pago

- **Pagos digitales** (Zelle, Pago Móvil, Nequi, USDT, transferencia): sección desplegable en el paso final; al elegir método se muestran los datos de cobro correspondientes; **es obligatorio subir imagen del comprobante y número de referencia** antes de poder enviar.
- **Pago físico** (divisas, Bolívares, Pesos Colombianos, al abordar o en taquilla): no exige comprobante; genera una **Reserva Condicional** con estatus `Pago en Sitio`.
- **Regla de oro del pago físico**: 12 o 24 h antes del viaje el sistema exige reconfirmación obligatoria por WhatsApp; si no responde, **el cupo se libera automáticamente a la lista de espera**.

## Estados de reserva (derivados de la documentación)

`Pendiente` (comprobante cargado, sin validar) → `Pagado` (validado por finanzas, ticket emitido). Paralelo: `Pago en Sitio` (reserva condicional) → `Pagado` o liberada por falta de reconfirmación. Existe una **lista de espera** a la que se reasignan cupos liberados. Cualquier modelo de datos debe soportar además el resultado de la confirmación de 2 h antes y el registro de abordaje.

## Requisitos de carácter estatal / regulatorio

La documentación enfatiza que el operador es estatal o regulado. Implicaciones de diseño no negociables:

- **Registro de pasajeros auditable e inalterable**: nombre y cédula de cada persona (no solo del titular), vinculados a ruta, fecha y unidad. Pensar en trazabilidad (historial de cambios, no borrado físico).
- **Pista de auditoría financiera**: cada transacción vinculada de forma unívoca al registro del pasajero y al comprobante cargado.
- **Lista de pasajeros cerrada antes de cada salida**: manifiesto por unidad para protocolos de seguridad y emergencias.
- **Data histórica para planificación de flota**: demanda por ruta, día y horario pico debe ser consultable/exportable.
- **Equilibrio de privacidad**: el documento "EN QUE AFECTA E INTERESES DEL ESTADO Y PAÍS" advierte que el punto de equilibrio es información suficiente y agregada para planificar, con acceso individualizado controlado. Diseñar con límites de retención, roles de acceso y estadísticas agregadas por defecto.

## Glosario de documentación (`Documentación/`)

| Archivo | Contenido |
|---|---|
| `ESTRUCTURA DE RESERVA Y CAPTACIÓN DE LEAD.pdf` | Las 5 fases del embudo: captación, registro, pago, emisión, recordatorios/abordaje. Fuente principal de requisitos funcionales. |
| `ESTRUCTURA DE MÉTODOS DE PAGO EN EL FLUJO.pdf` | Categorías de pago (digital vs. físico), comprobante obligatorio, reserva condicional y regla de reconfirmación/liberación de cupo. |
| `SOLUCIONES A SUS PROBLEMAS GUBERNAMENTALES.pdf` | Justificación para operador estatal: trazabilidad de pasajeros, transparencia financiera, inteligencia logística, seguridad ciudadana. |
| `EN QUE AFECTA E INTERESES DEL ESTADO Y PAÍS.pdf` | Contexto sobre datos de movilidad terrestre y el equilibrio entre control estatal y privacidad. Informa decisiones de retención y acceso a datos. |

## Notas operativas

- Los nombres de los PDFs llevan acentos y la herramienta `Read` puede fallar con ellos por normalización Unicode. Solución: copiarlos al scratchpad con nombres ASCII vía PowerShell (`Copy-Item`) y leer la copia.
