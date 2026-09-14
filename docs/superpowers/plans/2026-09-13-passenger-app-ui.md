# Plan: interfaz de pasajero al estilo app de transporte (ronda 2)

## Contexto

El operador pidió armar la interfaz de TicketRuta basándose al 100 % en nueve capturas de referencia: la app **Transit** (tarjeta verde de búsqueda con "Ubicación actual / destino", lista de salidas con línea de tiempo y "Salir en 4 min", tarjetas de alerta de servicio, filas de salidas cercanas en bloques de color por línea) y la app **Omio** (portada con "¿Adónde vamos?" sobre fondo azul marino, comparador de opciones con hora, duración y precio, ticket digital con QR en tarjeta, tarjetas de tendencias). El objetivo declarado: un sistema que facilite el uso del sistema.

Las nueve capturas son pantallas **de pasajero en móvil**. Por eso esta ronda rediseña únicamente la experiencia del pasajero: portada (`/`), ingreso, registro, todo `/mi/*` y la página pública de lista de espera. Los paneles de operador y admin (`/panel/*`) no se tocan; conservan sus tokens y su shell actual.

Estado del código hoy (explorado el 2026-09-13, rama `feat/panel-round-1`, 12 commits sin integrar sobre `main`):

- El shell del pasajero es `src/app/mi/layout.tsx`: cabecera con nombre y cédula enmascarada y cuatro enlaces en fila. No hay barra inferior, ni pantalla de inicio (`/mi` no existe), ni avisos.
- `src/app/mi/reservar/booking-form.tsx` (667 líneas, cliente) es un asistente de 4 pasos con dos `<select>` de origen y destino y una lista plana de salidas. Toda la lógica de negocio del cliente (tope de 6 pasajeros, pago en sitio solo con 12 h de antelación, aviso de menor, validación de acompañantes) ya está ahí y se conserva.
- El detalle de reserva (`src/app/mi/reservas/[code]/page.tsx`) solo ofrece el PDF del ticket. El modelo `Ticket` ya guarda `qrPayload` (`prisma/schema.prisma:453`), así que el QR se puede mostrar en pantalla sin abrir el PDF.
- Tokens: diez variables CSS en `src/app/globals.css` (Tailwind v4, `@theme inline`), fuente del sistema, sin `next/font`, sin iconos propios ni logo en `public/`.
- No hay dependencia de iconos instalada ni tests de componentes ni Playwright configurado. Las verificaciones automáticas de UI son `pnpm typecheck`, `pnpm lint` y los unitarios de `src/lib`.

## Lenguaje visual derivado de las capturas

Un solo sistema, no dos marcas mezcladas. Se toma de **Omio** el fondo azul marino de portada y el ticket con QR; de **Transit** la tarjeta de búsqueda en verde, la línea de tiempo de salidas, el "Sale en N min", las tarjetas de alerta y los bloques de color por línea (aquí, por agencia).

Tokens nuevos en `src/app/globals.css`, aditivos (los diez actuales siguen intactos para el panel):

| Token | Valor | Uso |
|---|---|---|
| `--marca` | `#1e3a8a` | Fondo de portada, cabecera de la app y tarjeta del ticket (Omio) |
| `--marca-oscura` | `#172a63` | Bloques dentro de la tarjeta del ticket, botón de notificaciones |
| `--marca-clara` | `#dbe6ff` | Fondo suave detrás de tarjetas en portada |
| `--ruta` | `#15803d` | Tarjeta de búsqueda y botón "Buscar" (Transit) |
| `--ruta-oscura` | `#166534` | Cajas de origen y destino dentro de la tarjeta verde |
| `--en-vivo` | `#16a34a` | Texto "Sale en 4 min" con el icono de señal |
| `--cta` | `#d93a4f` | Botón principal de acción (coral de Omio, contraste ≥ 4.5:1 con blanco) |
| `--tinta` | `#0f172a` | Texto principal sobre superficies claras |
| `--tinta-suave` | `#475569` | Texto secundario |
| `--lienzo` | `#eef2f7` | Fondo de la app del pasajero |
| `--radio-tarjeta` | `20px` | Radio de tarjetas y hojas |
| `--radio-pastilla` | `999px` | Botones redondeados |

Colores de agencia (bloques tipo "línea 25 / 38 / B" de Transit): seis pares fondo/texto blanco en `src/lib/brand.ts`: rojo `#d41f1f`, azul `#0b62b5`, verde `#2e8b3a`, naranja `#d9581d`, morado `#6b3fa0`, verde azulado `#0e8a8a`. El índice se deriva del `agencyId` con una suma estable de códigos de carácter módulo 6, para que cada agencia tenga siempre el mismo color sin tocar el esquema de base de datos. El rótulo del bloque son las iniciales de la agencia (`firstNamePart` de `src/lib/identity.ts` para la primera palabra, hasta 3 letras en mayúsculas).

Tipografía: **Rubik** (Google Fonts) vía `next/font/google` en `src/app/layout.tsx`, pesos 400 a 800, `display: swap`, con `system-ui` de respaldo. Es la más cercana a la rotulación redondeada y gruesa de las capturas. Se aplica a todo el sitio; el panel solo cambia de tipografía, no de disposición. Base 16 px, titulares de portada 32 a 36 px en peso 800, cifras con `.tabular`.

Iconos: sin dependencia nueva. `src/components/icons.tsx` con doce SVG de trazo (24 px, `currentColor`, `aria-hidden` por defecto): flecha de navegación, punto de destino, intercambio, deslizadores, actualizar, señal en vivo, campana, alerta, ticket, QR, documento, casa, calendario, personas, cerrar, chevron. El diseño de Omio muestra iconos redondos rellenos para los modos; aquí el único modo es autobús, así que el icono de autobús aparece en la portada y en el ticket.

Reglas de accesibilidad y uso móvil (de `ui-ux-pro-max`, prioridades 1, 2, 5 y 8): objetivos táctiles de 44 px mínimo con 8 px de separación, foco visible (`focus-visible:ring`), contraste 4.5:1 en todo texto, `inputmode="numeric"` en cédula, teléfono y año, etiquetas visibles en todos los campos (nunca solo placeholder), error junto al campo y bajo el botón, `motion-reduce` en toda animación, sin desplazamiento horizontal, sin emojis como iconos, indicador "Paso N de 4" en el asistente.

## Mapa de pantallas

Todas mobile-first: contenedor `max-w-md` centrado a partir de `md`, con fondo `--lienzo`. En pantallas ≥ `md` la barra inferior pasa a ser una fila de pestañas bajo la cabecera, como en la vista de tableta de Omio.

### Públicas

1. **Portada `/`** (Omio, captura 3 y 8). Fondo `--marca`. Rótulo "TicketRuta" con punto coral, titular "Reserva tu pasaje en el terminal", icono de autobús. Tarjeta blanca "¿Adónde vamos?" con origen, destino e intercambio (componente `SearchCard`) y botón coral "Buscar salidas" que navega a `/mi/reservar?origen=&destino=`. Debajo, sección "Próximas salidas" con el tablero de bloques de color (`DepartureBoard`, Transit captura 8) alimentado por `listBookableDepartures({ to: ahora + 6 h, onlyWithSeats: true })`; son datos públicos (ruta, hora, precio, cupos), sin datos personales. Al final, dos accesos secundarios: "Ingresar con mi cédula" y "Acceso del personal".
2. **Ingresar `/ingresar`** y **Registro `/registro`**. Misma cabecera azul compacta, formulario en tarjeta blanca redondeada, campos con etiqueta visible, `inputmode` adecuado, botón coral de ancho completo. `ingresarAction` acepta un campo oculto `next` (solo rutas internas que empiecen por `/`, validado con zod) para volver a `/mi/reservar?origen=...` tras iniciar sesión; si no viene, redirige a `/mi` (nuevo inicio). `registrarAction` sigue yendo a `/mi/documentos`.
3. **Lista de espera `/lista-espera/[token]`**. Misma tarjeta de salida que el resto de la app (`DepartureRow`) y botón coral "Reservar este puesto". Sin cambios de lógica.

### Con sesión (`/mi/*`, shell nuevo)

4. **Shell `src/app/mi/layout.tsx`**. Cabecera azul con saludo "Hola, {firstNamePart(fullName)}" y cédula enmascarada; barra inferior `BottomNav` con cuatro destinos: Inicio (`/mi`), Reservar (`/mi/reservar`), Mis viajes (`/mi/reservas`), Avisos (`/mi/avisos`), con contador de avisos pendientes; Documentos y Salir viven en la cabecera (icono de documento y menú). `main` con `pb-24` para no quedar bajo la barra.
5. **Inicio `/mi`** (Transit captura 2). Pila de tarjetas de aviso (`NoticeCard`) derivadas del estado real: falta la foto de cédula, reserva que se libera en N min por falta de pago, comprobante rechazado, pago en sitio por reconfirmar, ticket listo. Luego "Tu próximo viaje" (tarjeta de ticket compacta si hay reserva `PAGADA`/`ABONADA`/`EN_VALIDACION` futura) y "Próximas salidas" (tablero de bloques). Si no hay nada, estado vacío con botón "Reservar un puesto".
6. **Reservar `/mi/reservar`** (Transit captura 1). Paso 1: tarjeta verde de búsqueda con origen y destino (misma `SearchCard`, en variante verde), pastilla "Salir ahora" que fija el filtro a las próximas 3 horas, y la lista de salidas como línea de tiempo: bloque de color de agencia, hora, "Sale en 4 min" en verde con icono de señal, duración con `formatDuration`, precio y cupos. Los `searchParams` `origen` y `destino` precargan los filtros. Pasos 2 a 4 conservan campos, acciones de servidor y nombres de campo exactos (`departureId`, `companions` JSON, `policiesAccepted`, `paymentMethodId`); cambian a tarjetas apiladas con indicador "Paso N de 4" y una barra inferior fija con "Atrás" y el botón coral de avance. El bloque de lista de espera se mantiene.
7. **Mis viajes `/mi/reservas`**. Segmentos "Próximos" y "Pasados" (por `departsAt`). Cada reserva como tarjeta de ticket compacta (`TicketCard`, Omio captura 5): fecha y hora de salida en 24 h, origen → destino, bloque de agencia, estado con color semántico y saldo pendiente si lo hay.
8. **Detalle `/mi/reservas/[code]`**. Tarjeta de ticket grande azul marino con muesca lateral: cabecera "SALIDA / dd MMM HH:mm", "SERIAL {code}", cuerpo blanco con el QR renderizado en pantalla desde `ticket.qrPayload` (función nueva `renderQrDataUrl` del módulo `tickets`) y botón "Descargar PDF" debajo. Si no hay ticket, el cuerpo muestra la línea de progreso de pago (total, abonado, saldo) y el estado. Debajo: pasajeros, historial de pagos y el formulario de abono (`PayForm`) con confirmación visible tras enviar (hoy no se limpia ni confirma: se añade `success` al estado de `subirComprobanteAction` y se muestra una tarjeta verde).
9. **Avisos `/mi/avisos`** (Transit captura 2). Lista de `NoticeCard` derivadas (mismo origen que Inicio) más el historial de mensajes de WhatsApp de la cuenta, renderizados con `renderPreview` (función nueva `listMessagesForPhone` en `messaging`). Cada tarjeta lleva icono, título, texto, hora en 24 h y enlace a la reserva.
10. **Documentos `/mi/documentos`**. Dos tarjetas de estado con icono y borde verde/ámbar, y el formulario de carga en tarjeta. Sin cambio de lógica.

## Componentes y helpers nuevos

| Archivo | Tipo | Qué es |
|---|---|---|
| `src/components/icons.tsx` | servidor | Set de iconos SVG inline |
| `src/components/app-header.tsx` | servidor | Cabecera azul del pasajero |
| `src/components/bottom-nav.tsx` | cliente (`usePathname`) | Barra inferior de 4 destinos, `aria-current="page"` |
| `src/components/search-card.tsx` | cliente | Origen, destino, botón de intercambio; variantes `azul` (portada) y `verde` (reservar); emite cambios por `onChange` o navega con `href` |
| `src/components/agency-badge.tsx` | servidor | Bloque de color con iniciales de la agencia |
| `src/components/departure-row.tsx` | servidor | Fila de salida en línea de tiempo (Transit captura 1) |
| `src/components/departure-board.tsx` | servidor | Bloques de color a ancho completo (Transit captura 8) |
| `src/components/notice-card.tsx` | servidor | Tarjeta de aviso con icono, título, texto y hora |
| `src/components/ticket-card.tsx` | servidor | Tarjeta de ticket compacta y grande con QR opcional |
| `src/components/sticky-actions.tsx` | servidor | Barra inferior fija de botones del asistente |
| `src/lib/brand.ts` | puro | `agencyColor(agencyId)`, `agencyInitials(name)` |
| `src/lib/time.ts` | puro, se amplía | `minutesUntil(date, now)` y `formatRelativeDeparture(date, now)`: "Sale ahora" (< 1 min), "Sale en N min" (< 60), "Sale a las HH:mm" (mismo día en Caracas), "dd/MM HH:mm" (otro día), "Salió" (pasado) |
| `src/modules/notices/` | módulo nuevo | `buildNotices(input, now)` puro y `listNoticesForAccount(accountId)` que consulta reservas, comprobantes, ticket y documentos por `prisma` |
| `src/modules/messaging` | se amplía | `listMessagesForPhone(phone, limit = 50)` devuelve `{ id, templateKey, text, sentAt, createdAt, reservationCode? }` usando `renderPreview` |
| `src/modules/tickets` | se amplía | `renderQrDataUrl(payload)` con `qrcode.toDataURL` |

Reutilizado sin cambios: `listBookableDepartures` y `DepartureFilter` (`src/modules/catalog/queries.ts:34`), `balanceUsd`, `listActivePaymentMethods`, `requirePassenger`/`currentPassenger`, `maskIdNumber`, `firstNamePart`, `formatCaracasTime24`, `formatDuration`, `isMinor`, `SidePanel` (no se usa en el pasajero), y todas las acciones de servidor existentes.

Regla de módulos: todo import va por `@/modules/<x>` (barril). El módulo `notices` importa `renderPreview` solo si lo necesita desde `@/modules/messaging`, nunca de internos.

## Tests propuestos

Unitarios (`pnpm test`, Vitest en `node`):

- `tests/unit/lib/time.test.ts`: `minutesUntil` y `formatRelativeDeparture` en los cinco tramos, con `now` fijo en hora de Caracas y un caso de cambio de día.
- `tests/unit/lib/brand.test.ts`: `agencyColor` estable para el mismo id, distribuido en el rango 0 a 5; `agencyInitials` con nombres compuestos ("Expresos Los Andes" → "ELA", "Transporte Caribe" → "TC", una palabra → hasta 3 letras).
- `tests/unit/notices/build-notices.test.ts`: sin cédula cargada produce aviso de documento; reserva `PENDIENTE_PAGO` con `expiresAt` en 40 min produce aviso con minutos; comprobante `RECHAZADO` produce aviso con motivo; `PAGO_EN_SITIO` sin `reconfirmedAt` a menos de 24 h produce aviso; ticket emitido produce aviso de ticket listo; orden por urgencia; reservas finales no generan avisos.
- `tests/unit/tickets/qr-render.test.ts`: `renderQrDataUrl` devuelve una cadena que empieza por `data:image/png;base64,`.

Integración (`pnpm test:integration`, un solo subagente a la vez porque comparten la base):

- `tests/integration/messaging/list-messages.test.ts`: encola dos mensajes a un teléfono y uno a otro; `listMessagesForPhone` devuelve solo los del primero, del más reciente al más antiguo, con `text` renderizado.
- `tests/integration/notices/list-notices.test.ts`: cuenta con reserva pendiente y sin documento devuelve dos avisos.

Estáticos y manuales:

- `pnpm typecheck` y `pnpm lint` en verde al cerrar cada tarea.
- Revisión visual en el navegador integrado a 375, 768 y 1024 px de `/`, `/ingresar`, `/registro` y `/lista-espera/token-falso` (públicas). Las pantallas `/mi/*` las revisa el operador tras iniciar sesión con la pasajera `V12345678` (Claude no escribe contraseñas en el navegador).
- Lista de comprobación de `ui-ux-pro-max` antes de cerrar: sin emojis como iconos, `cursor-pointer` en clicables, foco visible, contraste 4.5:1, `prefers-reduced-motion`, sin desplazamiento horizontal.

Criterio de "terminado" por tarea: tests de la tarea en verde, `typecheck` y `lint` limpios, reporte al orquestador con archivos tocados y desvíos.

## Descomposición en tareas (un subagente `implementador` por tarea)

Dependencias: T1 y T2 en paralelo; T3 después de T1; T4, T5, T6 y T7 después de T2 y T3 (T4 y T5 pueden ir en paralelo; T6 y T7 también, pero T7 espera a T2 por las funciones de módulos); T8 al final.

**T1. Fundamentos visuales y helpers** — `src/app/globals.css` (tokens nuevos), `src/app/layout.tsx` (Rubik con `next/font/google`, `lang="es"`, `viewport` con `themeColor` `--marca`), `src/components/icons.tsx`, `src/lib/brand.ts`, `src/lib/time.ts` (dos funciones nuevas), tests de `time` y `brand`. No toca pantallas.

**T2. Módulos de datos** — `src/modules/notices/{index,build,queries}.ts` con su tipo `Notice { kind, level: "info"|"alerta"|"exito", title, body, at?, href? }`; `listMessagesForPhone` en `src/modules/messaging/queries.ts` exportado por el barril; `renderQrDataUrl` en `src/modules/tickets/qr.ts` exportado por el barril; unitarios de `notices` y `qr-render`; integración de `messaging` y `notices`. Corre `pnpm test:integration` con la base de test levantada (`pnpm db:test:up`).

**T3. Componentes compartidos y shell** — los nueve componentes de la tabla, `src/app/mi/layout.tsx` nuevo (cabecera + `BottomNav`), `src/app/mi/page.tsx` (Inicio, consume `listNoticesForAccount` y `listBookableDepartures`). Prueba: `typecheck`, `lint` y revisión visual de que `/mi` compila (la visual con sesión la hace el operador).

**T4. Pantallas públicas** — `src/app/page.tsx` (portada con `SearchCard` y `DepartureBoard`), `src/app/ingresar/{page,actions}.tsx` (campo `next` validado, redirección a `/mi`), `src/app/registro/page.tsx` (estilo), `src/app/lista-espera/[token]/page.tsx` (estilo). Revisión visual en navegador a tres anchos.

**T5. Asistente de reserva** — `src/app/mi/reservar/page.tsx` (lee `origen` y `destino`, paraleliza `listActivePaymentMethods` con `Promise.all`) y `booking-form.tsx` (paso 1 con `SearchCard` verde, pastilla "Salir ahora", `DepartureRow`; pasos 2 a 4 con `StickyActions` e indicador de paso). Contrato de campos y acciones intacto. Se divide `booking-form.tsx` en `booking-form.tsx`, `step-departures.tsx`, `step-passengers.tsx`, `step-policies.tsx`, `step-payment.tsx` dentro de la misma carpeta para que ningún archivo pase de 250 líneas; `DetailsView` pasa a `src/components/details-view.tsx` y lo comparte con `pay-form.tsx`.

**T6. Mis viajes, detalle y abono** — `src/app/mi/reservas/page.tsx` (segmentos y `TicketCard`), `src/app/mi/reservas/[code]/page.tsx` (ticket grande con QR desde `renderQrDataUrl(reserva.ticket.qrPayload)`, progreso de pago), `pay-form.tsx` y `actions.ts` (`success: boolean` en `SubirComprobanteState`, tarjeta de confirmación, formulario que se limpia con `key`). Mapa `ESTADOS` único en `src/app/mi/reservas/estados.ts` compartido por lista y detalle.

**T7. Avisos y documentos** — `src/app/mi/avisos/page.tsx` (avisos derivados + mensajes) y `src/app/mi/documentos/page.tsx` (estilo). Contador de avisos en `BottomNav` alimentado desde el layout.

**T8. Documentación y cierre** — `CLAUDE.md` (glosario: módulo `notices`, helpers nuevos de `lib`, componentes nuevos, nota de que el pasajero usa Rubik y tokens `--marca/--ruta/--cta`), `README.md` (recorrido del pasajero con Inicio y Avisos), `docs/superpowers/plans/2026-09-13-passenger-app-ui.md` con este plan y el resultado. Sin código.

## Supuestos declarados

- Alcance: solo pasajero. Los paneles no cambian de disposición; solo heredan la fuente Rubik del layout raíz.
- Portada pública muestra próximas salidas sin sesión porque son datos de catálogo, no personales. Reservar sigue exigiendo sesión.
- Sin dependencias nuevas de runtime: iconos SVG propios y `qrcode` ya instalado. `next/font/google` descarga Rubik en `pnpm build`/`pnpm dev` la primera vez (necesita red).
- Los colores de agencia se derivan del id, no se guardan en base de datos. Si más adelante el admin quiere elegirlos, se añade una columna.
- La rama de trabajo sigue siendo `feat/panel-round-1`; el orquestador propone abrir `feat/passenger-app-ui` desde ella antes de T1 para no mezclar rondas, salvo indicación contraria.

## Verificación de cierre (orquestador)

1. `pnpm test` y `pnpm test:integration` en verde (el segundo con `pnpm db:test:up`).
2. `pnpm typecheck` y `pnpm lint` limpios.
3. Con `pnpm dev` activo: capturas en el navegador integrado de `/`, `/ingresar`, `/registro`, `/lista-espera/x` a 375 y 1024 px; verificar sin desplazamiento horizontal, foco visible con Tab, contraste de los bloques de agencia.
4. Entregar al operador la lista de pantallas `/mi/*` para su revisión con sesión, con las credenciales del README.
5. Registrar en memoria el estado de la ronda 2 y actualizar Notion con `/liminalsync` si el operador lo pide.

## Resultado

**Fecha de cierre**: 2026-09-13. **Rama**: `feat/passenger-app-ui`.

### Estado de las tareas

| Tarea | Estado | Desvíos declarados en el reporte |
|---|---|---|
| T1. Fundamentos visuales y helpers | DONE | No se añadió la utilidad `.tarjeta-ticket` en `globals.css` (queda pendiente para T6, que finalmente no la necesitó). Sin verificación visual en navegador porque la tarea no toca pantallas. |
| T2. Módulos de datos (`notices`, `listMessagesForPhone`, `renderQrDataUrl`) | DONE | El caso de integración de avisos crea la reserva directamente con `prisma.reservation.create` en vez de pasar por `createReservation`, porque esta última exige foto de cédula antes de crear la reserva. `RECONFIRMAR_PAGO_EN_SITIO` no tenía texto de cuerpo prescrito por el brief; se redactó uno. El contenedor de la base de test se dejó corriendo para las tareas paralelas siguientes. |
| T3. Componentes compartidos, shell e Inicio | DONE | `search-card.tsx` quedó sin consumidor hasta T4/T5. `DepartureBoard` repite la misma hora en el bloque derecho cuando faltan 60 min o más, tal como lo pedía el brief literalmente. `Pill` usa opacidades (`/15`) en vez de tokens `-suave` dedicados por tono. Revisión visual con sesión de pasajero delegada al operador. |
| T4. Pantallas públicas (portada, ingresar, registro, lista de espera) | DONE | Detectó y corrigió un hallazgo de infraestructura: la caché `.next` estaba desactualizada respecto a los tokens nuevos de `globals.css` y no reflejaba los colores hasta borrarla. `DepartureRowData.agencyName` queda vacío en `/lista-espera/[token]` porque `getWaitlistClaim` no incluye `route.agency` y el brief pide no tocar esa lógica. No se pudo ejercer el estado "feliz" de la lista de espera por falta de un `claimToken` vigente en la base de desarrollo. |
| T5. Asistente de reserva (línea de tiempo) | DONE | Se agregó una barra `StickyActions` con "Atrás" en el paso 2 aunque la salida no tenga cupo (antes no existía ninguna forma de volver). El botón "Ver todas" del estado vacío limpia también origen y destino, no solo el filtro de tiempo. Ninguna pastilla de filtro de tiempo queda activa por defecto. No se agregaron tests unitarios nuevos (el brief no lo pedía). |
| T6. Mis viajes, detalle con QR y abono con confirmación | DONE | El brief pidió sustituir el mapa `ESTADOS` local por `reservationStatusLabel`/`reservationStatusTone`/`PROOF_STATUS_LABELS` de `labels.ts`, así que no se creó el archivo `estados.ts` que mencionaba el plan original — el brief de la tarea prevaleció por ser el documento vinculante. El remontado del formulario de comprobante remonta el componente `UploadForm` completo (no solo `<form>`) porque ahí vive `useActionState`. El detalle ya no repite una fila "Estado" separada, para no duplicar la `Pill` de `TicketCard`. |
| T7. Avisos y documentos | DONE | El enum real `MessageStatus` no tiene el valor `REINTENTO` que mencionaba el brief; se mapearon los cinco valores reales (`ENCOLADO`, `ENVIADO`, `ENTREGADO`, `LEIDO`, `FALLIDO`), con `ENTREGADO`/`LEIDO` como `exito` por analogía con `ENVIADO`. Los `role="status"`/`role="alert"` de `/mi/documentos` se armaron reproduciendo las clases de `Card` en un `div`, en vez de añadirle una prop de `role` al componente compartido. |
| T8. Documentación y cierre | DONE | Ver este mismo documento. |

### Verificación final

Ejecutada por el orquestador el 2026-09-13, sobre el estado integrado de las ocho tareas:

```
pnpm typecheck        → limpio, sin errores.
pnpm lint             → limpio, sin errores ni advertencias.
pnpm test             → 18 archivos, 190 tests, todos en verde.
pnpm test:integration → 10 archivos, 76 tests, todos en verde.
```

### Correcciones tras la revisión con sesión (2026-09-13)

La revisión visual con sesión de pasajero, pendiente al cierre de la verificación final, encontró dos problemas que se resolvieron con dos tareas adicionales:

- **T9. 500 en `/mi/avisos` por payloads incompletos del mock**: la bandeja de avisos lanzaba un error 500 al toparse con mensajes históricos cuyo `payload` no traía todos los parámetros que exige su plantilla, porque `listMessagesForPhone` usaba `renderPreview` (validación estricta pensada para el momento de encolar, no para leer mensajes ya guardados). Se agregó `renderStoredPreview` en `src/modules/messaging/templates.ts`, tolerante a parámetros faltantes o vacíos (los sustituye por `…`), y `listMessagesForPhone` pasó a usarla. Además, `prisma/mock.ts` se completó para que las próximas corridas de `pnpm mock` generen payloads completos en `solicitud_recibida`, `reserva_condicional` y `ticket_emitido`.
- **T10. Correcciones visuales a 375 px**: la cabecera de `TicketCard` partía el serial largo en dos líneas junto al icono de bus; se rehízo en dos filas (salida y fecha arriba, serial abajo alineado a la derecha). `Pill` se estiraba o se partía en algunos contenedores flexibles; se le agregaron las clases `w-fit shrink-0 whitespace-nowrap`. Los montos mostraban punto decimal (`$ 95.00`) en vez de coma venezolana; se agregó `formatUsdString` en `src/lib/decimal.ts` para formatear montos que llegan como `string` desde el servidor, y `TicketCard` la adoptó para Total, Abonado y Saldo.
- **Verificación final tras T9 y T10**: `pnpm typecheck` y `pnpm lint` limpios; `pnpm test` → 19 archivos, 196 tests, todos en verde; `pnpm test:integration` → 10 archivos, 77 tests, todos en verde.

### Pendientes

- Las filas de `OutboundMessage` que el mock anterior dejó incompletas muestran "…" en la bandeja hasta que el operador vuelva a correr `pnpm mock`.
- La ruta larga del ticket puede ocupar tres líneas junto a la pastilla de estado a 375 px (estético, no bloquea).
- **Revisión visual de `/mi/*` con sesión**: todas las tareas confirmaron por código de estado (307 sin sesión, sin ningún 500) y por revisión de tipos y lint, pero ninguna inició sesión como pasajero en el navegador. Esa revisión con la pasajera de prueba `V12345678` (credenciales en el README) corresponde al operador.
- `AgencyBadge` en `/lista-espera/[token]` se ve con el color correcto pero sin iniciales, porque `getWaitlistClaim` no trae `route.agency` y el brief de T4 pidió no tocar esa consulta.
- No se ejerció el estado "feliz" de `/lista-espera/[token]` (con un `claimToken` vigente) por no haber ninguno en la base de desarrollo sin recurrir a `pnpm seed`/`pnpm mock`, fuera de lo permitido en esta ronda.
- `proofStatusTone` (tono de los `Pill` de comprobante en el detalle de reserva) quedó como mapa local en `src/app/mi/reservas/[code]/page.tsx`; si otra pantalla lo necesita, es candidato a subir a `src/lib/labels.ts`.
- `docs/whatsapp-templates.md`, citado en `CLAUDE.md` desde antes de esta ronda, no existe en el repositorio; es un hallazgo preexistente ajeno al alcance de T8 (esta tarea no toca la documentación de WhatsApp), que vale la pena que el orquestador registre para una tarea futura.
- Si el operador levantaba `pnpm dev` desde antes de que T1 tocara `globals.css`, verá los tokens nuevos como transparentes hasta reiniciar ese proceso (la caché `.next` no se invalida sola); T4 ya lo encontró y lo corrigió una vez, pero puede repetirse en otra máquina.
