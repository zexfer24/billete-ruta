# Sistema de diseño TicketRuta — marca, interfaz y experiencia

Fecha: 2026-09-30. Rama: `feat/brand-redesign`. Estado: aprobado por el operador para ejecución autónoma. Revisión 2 (2026-10-01): describe el sistema tal como quedó en el código tras el rediseño y las seis rondas de calidad con capturas y revisores.

Este documento es la fuente de verdad visual y de experiencia de uso para las tres interfaces (pasajero, operador de agencia y administrador del terminal). Todo subagente que toque la interfaz lo sigue al pie de la letra. Si algo no está aquí, se decide a favor de la claridad para una persona que nunca ha usado un sistema.

## 1. Principios

1. **Una acción principal por pantalla.** Es el único botón morado relleno visible sin desplazarse. Todo lo demás es secundario (contorno), fantasma (texto) o enlace. Cuando una pantalla tiene un paso que manda (por ejemplo el escáner en una salida con pasajeros por abordar), los demás disparadores bajan a secundario aunque sus diálogos conserven el tono de peligro.
2. **Lenguaje llano.** Tuteo, frases cortas, verbos concretos en los botones ("Pagar mi viaje", "Subir foto de la cédula", "Revisar este comprobante"). Nada de jerga interna, claves técnicas, estados en mayúsculas ni plurales con paréntesis ("reserva(s)"): se escribe el singular o el plural correcto según el número. Una misma acción se dice siempre con la misma raíz en todas las pantallas (`reservationActionLabel`).
3. **Divulgación progresiva.** Se muestra lo esencial; el detalle vive detrás de "Ver detalle", un panel lateral, una pestaña o un `<details>` nativo. Ninguna pantalla muestra más de 4 cifras destacadas a la vez.
4. **Siempre se sabe dónde se está, qué pasó y qué sigue.** Título de página claro, elemento del menú activo marcado (`aria-current="page"`), botón de volver en pantallas de detalle, y tras cada acción un aviso con icono que dice el resultado y el paso siguiente.
5. **Cada icono va con texto.** Los iconos solos solo se permiten dentro de botones o enlaces que además tienen `aria-label` o texto `sr-only`, y, en la app del pasajero, una etiqueta visible debajo o al lado.
6. **Nada se pierde ni se hace dos veces.** Todo envío de formulario muestra estado pendiente (`SubmitButton`) y bloquea el reenvío mientras dura, sin quitarle el foco al botón. Las acciones irreversibles o de alto impacto piden confirmación con sus consecuencias en números ("Se anularán 3 reservas sin abordar"), y esa confirmación no se puede cerrar mientras la acción ya va en camino. En el dominio, los cobros y las revisiones de comprobantes bloquean la fila de la reserva antes de leer su saldo.
7. **Estados vacíos útiles.** Icono + una frase de qué significa + una acción para salir de ahí.
8. **Carga percibida inmediata.** Toda ruta con datos tiene `loading.tsx` con un skeleton que reproduce la silueta real de la pantalla. Los cambios de pestaña, filtro o página por `searchParams` usan `<Suspense key={...}>` con su skeleton, y el control pulsado muestra su propia espera en el mismo instante.
9. **Robustez.** Ninguna URL manipulada tumba una pantalla: los `searchParams` se validan con `safeParse`, `z.enum` o `.catch()` y caen a un valor por defecto. Los códigos `?ok=` se traducen con un `Record` cerrado (con `Object.hasOwn`, así `?ok=constructor` no rompe nada) y los `?error=` largos se recortan.
10. **Accesibilidad WCAG 2.2 AA** como piso: contraste 4.5:1 en texto, 3:1 en bordes de controles y en iconos informativos, foco visible siempre y nunca tapado por una barra fija (2.4.11), objetivos táctiles de 44 × 44 px como mínimo, un solo `h1` por página, etiquetas visibles en todos los campos, un estado nunca se distingue solo por el color (1.4.1), `prefers-reduced-motion` respetado.

## 2. Marca

### 2.1 Logo

El logo oficial es el texto isométrico "TICKET RUTA" sobre el frente de un autobús, en blanco sobre morado `#601DBF`. Se vectorizó a SVG de un solo trazado.

| Archivo en `public/brand/` | Uso |
|---|---|
| `logo-blanco.svg` | Logo completo en blanco, sobre fondos morados (portada, barra del panel, pantallas de marca). viewBox `0 0 2283 1997`. |
| `logo-morado.svg` | Logo completo en morado, sobre fondos claros (ingresar, registro, errores, ticket). |
| `isotipo-blanco.svg` / `isotipo-morado.svg` | Solo el frente del autobús. viewBox `0 0 930 1262`. Para cabeceras compactas, el menú móvil y el icono de la app. |
| `logo-original.webp` | Imagen original entregada por el operador, como referencia. No se usa en la interfaz. |

Iconos de aplicación (en `src/app/`): `icon.svg` (cuadrado redondeado morado con el isotipo blanco), `apple-icon.png` (180 px), `manifest.ts` con `icon-192.png` e `icon-512.png` en `public/brand/`, y `opengraph-image.png` (1200 × 630, morado con el logo blanco centrado). `favicon.ico` de la plantilla de Next se eliminó.

Componentes en `src/components/logo.tsx` (servidor, sin hooks):

- `Logo({ tone = "marca" | "blanco", className, priority?, decorative? })`: logo completo como `next/image` con `unoptimized`, `width={2283} height={1997}`; el tamaño lo fija `className` (por ejemplo `h-24 w-auto`). `alt="TicketRuta"`, o `alt=""` si `decorative`.
- `Isotipo({ tone, className, decorative? })`: frente del autobús, `width={930} height={1262}`. Carga con `loading="eager"`, porque siempre va arriba y a la vista: con la carga diferida aparecía un instante después que la banda morada.
- `LogoLockup({ tone, className, label? })`: isotipo decorativo de 36 px + la palabra "TicketRuta" en `text-xl font-extrabold tracking-tight` (el texto va en HTML, no en imagen); `label` opcional debajo en `text-sm` ("Panel de agencia", "Terminal de pasajeros"). Es la versión horizontal para cabeceras compactas.

Reglas del logo:
- Área de respeto mínima: la altura de la letra "R" alrededor del logo.
- Tamaño mínimo del logo completo: 64 px de alto. Por debajo se usa `LogoLockup` o `Isotipo`.
- Nunca se deforma, se rota, se le aplican sombras ni se coloca sobre fotos o colores que no sean morado de marca, blanco o lienzo.

### 2.2 Dónde va el logo

1. Portada (`/`): logo completo blanco en el héroe morado (`h-24 sm:h-28`, con `priority`).
2. `/ingresar`, `/registro`, `/panel/ingresar` y lista de espera: logo completo morado `h-20` encima de la tarjeta del formulario (`PublicShell` y `PublicCard` de `src/app/_publico/`), con el enlace "Volver al inicio" arriba.
3. Cabecera de la app del pasajero (`AppHeader`): `LogoLockup` blanco, enlaza al inicio. Por debajo de 375 px se muestra solo el isotipo blanco, con su texto alternativo.
4. Barra lateral del panel de agencia y del terminal: banda superior morada con el logo completo blanco (`h-18`, 72 px) y debajo el rol y el nombre de la agencia o "Terminal". Por debajo de `lg`, barra superior pegajosa con `LogoLockup`.
5. Ticket en pantalla (`TicketCard`): `LogoLockup` blanco en la cabecera del ticket grande e isotipo en el compacto (morados si la reserva ya no sirve). El PDF del ticket lleva el logo en la cabecera.
6. Páginas de error, 404 y enlace vencido: logo morado `h-20` arriba del mensaje.
7. Skeleton de la portada y de ingresar: el logo real se pinta desde el primer instante (presencia de marca mientras carga). Los skeletons del ticket usan el isotipo y el `LogoLockup` reales.
8. Pie de la portada: `LogoLockup` morado con "Terminal de pasajeros" (alineado a la izquierda junto al isotipo, el conjunto centrado) y el acceso del personal.
9. Pie del panel (`PanelFooter`): isotipo pequeño con "TicketRuta".

## 3. Paleta

Todos los colores se definen como variables en `:root` de `src/app/globals.css` y se exponen como utilidades de Tailwind con `@theme inline`. **Ningún componente usa hex, `bg-[var(--...)]`, ni colores de Tailwind fijos (`bg-red-50`, `text-slate-500`, `bg-blue-600`).** Se usan las utilidades: `bg-marca-600`, `text-tinta-suave`, `border-borde`, etc. La única excepción es el chevron de los selectores del panel, dibujado como data-URI dentro de `globals.css` (un `url()` no acepta `var()`), con el valor de `tinta-suave`.

### 3.1 Morado de marca (primario)

| Token | Hex | Uso |
|---|---|---|
| `marca-50` | `#F6F2FD` | Fondo de fila activa, de pestaña activa, de ficha elegida y de los círculos de icono, superficie de acento muy suave |
| `marca-100` | `#ECE3FB` | Fondo de insignias de marca, hover suave, pastilla detrás del icono activo de `BottomNav`, pista del skeleton |
| `marca-200` | `#D9C7F7` | Bordes de acento, separadores sobre morado claro |
| `marca-300` | `#BB9CF0` | Iconos decorativos sobre morado oscuro |
| `marca-400` | `#9565E3` | Solo decorativo (no texto sobre blanco: 4.0:1) |
| `marca-500` | `#7838D3` | Hover de superficies moradas |
| `marca-600` | `#601DBF` | **Color de marca.** Botón primario, enlaces, foco, cabeceras, barra de la pestaña activa. 8.7:1 sobre blanco |
| `marca-700` | `#4E169D` | Hover y pulsado del primario, texto de marca sobre `marca-50/100`, texto de los botones quietos del skeleton |
| `marca-800` | `#3D117C` | Texto de marca fuerte (pestaña y ficha activas), bordes sobre morado |
| `marca-900` | `#2C0C5B` | Barra lateral del terminal (admin), fondos profundos |
| `marca-950` | `#1C063C` | Texto sobre amarillo sol, borde de la barra del terminal |

### 3.2 Sol (secundario de acento)

Amarillo cálido, complementario del morado. Se usa con moderación: resalta lo excepcional, nunca compite con el primario sobre fondo blanco.

| Token | Hex | Uso |
|---|---|---|
| `sol` | `#FFC629` | Botón de acción principal **solo sobre fondos morados** (texto `marca-950`, 11.7:1) y anillo de foco sobre fondos morados |
| `sol-suave` | `#FFF4D1` | Fondo de avisos destacados positivos no críticos |
| `sol-oscuro` | `#8A5A00` | Texto sobre `sol-suave` (5.4:1) |

### 3.3 Neutros (tinta y lienzo)

| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#1A1530` | Texto principal (17.6:1 sobre blanco) |
| `tinta-suave` | `#57526B` | Texto secundario (7.4:1 sobre blanco, 6.8:1 sobre lienzo) |
| `tinta-tenue` | `#6E6982` | Texto terciario, marcas de tiempo, marcadores de campo (5.2:1 sobre blanco) |
| `borde` | `#E3DFEC` | Bordes de tarjetas y separadores (decorativos) |
| `borde-control` | `#857E99` | Borde de campos de formulario, casillas y controles (3.9:1, cumple 3:1) |
| `lienzo` | `#F6F4FA` | Fondo de todas las páginas; `body` lo declara de forma explícita |
| `superficie` | `#FFFFFF` | Tarjetas, paneles, tablas |

### 3.4 Semánticos

Cada estado se expresa con color **y** con icono **y** con texto. Nunca solo color.

| Tono | Texto/relleno | Fondo suave | Significado |
|---|---|---|---|
| `exito` | `#137A46` | `exito-suave #E6F4EC` | Pagado, confirmado, a bordo, guardado |
| `alerta` | `#A15C00` | `alerta-suave #FFF3DC` | Pendiente, por vencer, atrasado, requiere atención |
| `peligro` | `#C0262D` | `peligro-suave #FDECEC` | Error, rechazado, cancelado, acción destructiva |
| `info` | `#1F5FBF` | `info-suave #E8F0FC` | Información neutra, ayuda, en validación, a la espera de otro |

Todos superan 4.5:1 como texto sobre blanco y sobre su fondo suave.

`StatusTone` (en `src/lib/labels.ts`) es `"marca" | "exito" | "alerta" | "peligro" | "info" | "neutro"` y es el mismo tipo que usan `Pill` y `StatusBadge` (`PillTone = StatusTone`). `neutro` es borde `borde`, fondo `lienzo` y texto `tinta-suave`. Mapeo vigente, fijado por tests:

| Qué | Tonos |
|---|---|
| Reserva en el panel (`reservationStatusTone`) | `PAGADA` y `ABORDADA` éxito; `EN_VALIDACION` info; `ABONADA` marca (como la barra del pago parcial); `PENDIENTE_PAGO` y `PAGO_EN_SITIO` alerta (los dos son deuda con plazo; el texto los distingue); `LIBERADA`, `CANCELADA` y `NO_SHOW` neutro |
| Reserva para el pasajero (`passengerStatusTone`) | Ámbar si le toca actuar a él (`PENDIENTE_PAGO`, `ABONADA`); azul si espera a otro (`EN_VALIDACION`, `PAGO_EN_SITIO`); verde si está listo (`PAGADA`, `ABORDADA`); neutro si ya no sirve |
| Cobertura de un comprobante (`coverageBadge`) | "Paga una parte" y "Completa el pago" en info (nunca verde mientras nadie lo aprueba); "Paga de más: $ X" en alerta |
| Salida (`departureStatusTone`) | `PROGRAMADA` marca, `MANIFIESTO_CERRADO` alerta, `EN_RUTA` éxito, `FINALIZADA` neutro, `CANCELADA` peligro. En la lista de salidas una `PROGRAMADA` en hora no lleva pastilla; una atrasada lleva "Atrasada" en alerta |
| Unidad de flota (`unitStateTone`) | `EN_RUTA` éxito; `ATRASADO` y `EMBARCANDO` alerta; `ASIGNADO` marca; `DISPONIBLE` neutro; `FUERA_DE_SERVICIO` peligro |
| Mensaje (`messageStatusTone`) | Enviado, entregado y leído en éxito; "En espera" en alerta; "No se pudo enviar" en peligro |
| Actividad del tablero | Un comprobante cargado va en info |

### 3.5 Colores de agencia

Seis bloques con texto blanco, todos ≥ 5.4:1, ninguno parecido al morado de marca: `#C62828` rojo, `#0B5CAD` azul, `#1E7A34` verde, `#B3480C` naranja, `#0B7285` turquesa, `#44546A` pizarra. Se asignan con `agencyColor(agencyId)` de `src/lib/brand.ts` y un test verifica el contraste. `AgencyBadge` acepta `decorative` (sin nombre para lectores de pantalla) cuando el nombre de la agencia ya se lee al lado, como en el ticket y en las tarjetas de agencias.

### 3.6 Tokens retirados

Los alias de compatibilidad del sistema anterior (`--marca`, `--marca-oscura`, `--marca-clara`, `--acento`, `--acento-suave`, `--cta`, `--ruta`, `--ruta-oscura`, `--en-vivo`, `--fondo`, `--texto`, `--texto-suave`) y sus utilidades se eliminaron en la tarea de cierre, junto con la variante de botón `ruta` y la variante `verde` de `SearchCard`. Ningún archivo los usa; quien los necesite usa el token nuevo equivalente.

## 4. Tipografía

- Familia única: **Atkinson Hyperlegible Next** (Google Fonts, variable 200–800, cargada con `next/font/google`, variable CSS `--font-atkinson`). Diseñada por el Braille Institute para distinguir caracteres parecidos (`I l 1`, `O 0`, `S 5`): crucial para códigos de reserva (`TR-0914-1PAX-SA7D`), cédulas y montos. Reemplaza a Rubik.
- Cifras de dinero, horas, cupos y códigos: clase `.tabular` (`font-variant-numeric: tabular-nums`).
- Escala:

| Rol | Clases |
|---|---|
| Título de página (`h1`) | `text-2xl sm:text-3xl font-bold tracking-tight text-tinta`; en el panel además `text-balance` |
| Título de sección (`h2`) | `text-lg font-semibold text-tinta` (oración normal, **no** mayúsculas) |
| Subtítulo (`h3`) | `text-base font-semibold` |
| Cuerpo | `text-base leading-relaxed` (16 px) |
| Secundario | `text-sm text-tinta-suave` (14 px) |
| Mínimo absoluto | `text-sm` (14 px). `text-xs` solo para contadores numéricos de insignias y pestañas |
| Cifra destacada | `text-3xl font-bold tabular` |

- Cortes de línea: los títulos llevan `text-balance` y las ayudas, errores de campo, descripciones de cabecera y títulos de aviso llevan `text-pretty`, para no dejar una palabra sola en la última línea. Cuando eso no basta, el final de una frase de ayuda se une con espacio de no separación (U+00A0, escrito como escape en el código).
- Dinero: `formatMoney` y `formatUsdString` (`src/lib/decimal.ts`) pegan el prefijo a la cifra con `MONEY_SPACE` (U+00A0): "$ 46,00", "Bs. 955,27", "COP 12.000,00", "USDT 10,00". Los formateadores del cliente (`formatCents` del asistente) dan exactamente el mismo texto, y un test lo comprueba. Los montos de las tablas llevan además `whitespace-nowrap`.
- Códigos de reserva: nunca se parten. En pantalla van en un `span` con `whitespace-nowrap` (detectados con una expresión regular dentro de textos de mensajes y avisos). No se usa el guion de no separación U+2011 en los códigos, porque al copiarlos se llevaría otro carácter y la búsqueda en taquilla fallaría; en la vista previa de mensajes guardados se inserta U+2060 (invisible) tras cada guion, y lo enviado y lo guardado conservan el código ASCII. El ejemplo de teléfono sí usa U+2011: "0412‑1234567".
- Fechas y horas: siempre en 24 horas y hora de Caracas, con frases de `passenger-copy.ts` y `src/lib/time.ts`: "hoy a las 13:00", "mañana a las 07:00", "el jue 1 oct a las 06:00" (`whenPhrase`, `dayTimePhrase`), "Paga hoy antes de las 21:02" y "…, cuando sale el bus" (`deadlineBeforePhrase`), "Sale en 15 min" (`formatRelativeDeparture`). En las tablas del panel, "Hoy 19:00", "Mañana 07:00" o "Sábado 03/10 19:00"; en el admin, "el 30/09/2026 a las 01:12" con la fecha y la hora indivisibles. Nada de dd/mm/aaaa suelto en la app del pasajero.
- Rutas: siempre "Origen → Destino" (`arrowRouteName` de `src/app/panel/_shared/route-text.ts`, que también convierte el guion del nombre de catálogo). Solo los CSV conservan el nombre original de la ruta. `routeSubtitle` no repite el par de ciudades si el nombre de la ruta ya lo dice.

## 5. Forma, espacio y elevación

- Radios: `--radio-tarjeta: 16px` (tarjetas y paneles), `--radio-control: 12px` (campos y botones de panel), `--radio-pastilla: 999px` (botones del pasajero, insignias, fichas). Utilidades `rounded-tarjeta`, `rounded-control`, `rounded-pastilla`.
- Espaciado en múltiplos de 4 px; separación entre bloques de una página: `gap-6` (24 px); dentro de una tarjeta: `gap-3`/`gap-4`.
- Sombras: `--sombra-1` (tarjetas: `0 1px 2px rgb(26 21 48 / 0.06), 0 1px 3px rgb(26 21 48 / 0.04)`), `--sombra-2` (paneles flotantes, barras fijas y hover: `0 8px 24px rgb(26 21 48 / 0.10)`). Utilidades `shadow-1`, `shadow-2`. Las tarjetas llevan `border border-borde` + `shadow-1`.
- Movimiento: transiciones de 150–200 ms `ease-out` solo en color, opacidad y `transform`; nunca en `width`/`height`. Todo con `motion-reduce:transition-none` / `motion-reduce:animate-none`. `globals.css` incluye una regla `@media (prefers-reduced-motion: reduce)` global que anula animaciones y transiciones; el desplazamiento suave (`scroll-behavior: smooth` y `scrollIntoView`) solo se usa sin movimiento reducido. El veredicto del escáner no tiene animaciones.
- Foco: clases `.foco` y `.foco-sobre-marca` en la capa `components` de `globals.css`. `.foco:focus-visible` pinta un contorno de 3 px en `marca-600` separado 2 px del control; `.foco-sobre-marca` lo pinta en `sol` sobre fondos morados. Sobre los fondos verde y rojo del veredicto del escáner el contorno es blanco.
- Campo con error: todo control `.foco` con `aria-invalid="true"` suma una sombra interior de 1 px en `peligro` (el borde rojo se lee de 2 px sin mover la caja) y su contorno de foco pasa a `peligro`.
- Foco nunca tapado (WCAG 2.4.11): cada barra fija se marca con un atributo y `globals.css` reserva su alto con `scroll-padding` en el documento. `data-barra-inferior` (`BottomNav`): `scroll-padding-bottom: calc(5.5rem + safe-area)`. `data-acciones-fijas` (`StickyActions`): `calc(8rem + safe-area)`. `data-barra-panel` (barra superior del panel por debajo de `lg`): `scroll-padding-top: 5rem`. El panel lateral lleva `scroll-pt-32`. `tests/unit/components/fixed-bars.test.ts` verifica que cada regla exista y que cada componente emita su atributo.

## 6. Componentes compartidos

Se mantienen las API existentes (los tests y las páginas las usan) y se amplían. Ningún subagente de pantalla edita estos archivos: si necesita algo nuevo lo construye local en su carpeta y lo reporta. Excepción: se pueden **agregar** iconos al final de `src/components/icons.tsx` (releyendo el archivo justo antes de editar, sin tocar los existentes). Las clases puras del kit (botones, campos, pestañas, tonos, stepper, tamaños de archivo) viven en `src/components/ui-classes.ts`, sin React, y las prueba `tests/unit/components/ui-classes.test.ts`.

### 6.1 Botones

- Pasajero, `buttonClass(variant, extra?, size = "md")`. Variantes: `primario` (marca-600 relleno, texto blanco, hover marca-700), `secundario` (blanco, texto marca-700, borde `borde-control`, hover borde marca-600 y fondo marca-50), `fantasma` (texto marca-700, hover marca-50), `acento` (sol relleno, texto marca-950: solo sobre morado), `sobre-marca` (blanco relleno, texto marca-700: sobre morado), `peligro` (peligro relleno, texto blanco). Tamaños: `sm` = `min-h-11` (44 px), `md` = `min-h-12` (48 px), `lg` = `min-h-14 text-lg` (56 px, la acción principal de un paso). Forma pastilla.
- Panel, `panelButtonClass(variant, size = "md", extra?)`. Variantes: `primario`, `secundario` (texto tinta, hover marca), `exito`, `peligro`, `fantasma`. Tamaños: `sm` = `min-h-10` (solo dentro de tablas en escritorio), `md` = `min-h-11`, `lg` = `min-h-12`. Forma `rounded-control`. En el teléfono, las acciones de cabecera del tablero y de Pasajeros ocupan todo el ancho (`w-full sm:w-auto`).
- Los dos estilos atenúan por igual `disabled` y `aria-disabled` (opacidad 60 % y cursor no permitido).
- `SubmitButton` en `src/components/submit-button.tsx` (cliente, `useFormStatus`): `children`, `pendingLabel` (por defecto "Guardando…"), `className`, resto de atributos de botón. Mientras envía **no usa el `disabled` nativo**: queda con `aria-disabled="true"` y un `onClick` que cancela el reenvío (cubre también el Enter), muestra el spinner con `motion-reduce` y el texto `pendingLabel`, y una región `role="status"` fuera del botón anuncia la espera. Así quien usa teclado o lector de pantalla no pierde su lugar. La prop `disabled` sí deshabilita de verdad. Con varios botones `name`/`value` en el mismo formulario, todos se bloquean y solo el pulsado muestra la espera. **Todo `<form action={...}>` de servidor usa `SubmitButton` como botón de envío.** Los botones de espera hechos a mano (`PendingButton` del escáner, "Sí, cobrar" de la taquilla, "Cancelar" de `ConfirmDialog`, "Intentar de nuevo" de las páginas de error) siguen la misma regla: `aria-disabled` y clic ignorado, sin `disabled` nativo.
- Formularios GET del panel (filtros, buscadores, periodos): `GetForm` y `GetSubmitButton` de `src/app/panel/_shared/get-form.tsx`, sobre `next/form`. Con `next/form` el `useFormStatus` nunca queda pendiente, así que `SubmitButton` no mostraría la espera; `GetForm` la lleva a mano ("Buscando…" desde el envío hasta que cambia la URL, con tope de 15 s) y reenvía cualquier atributo de `<form>` (`aria-label`, `role`, `id`).

### 6.2 Formularios

- `Field` (pasajero) y `panelInputClass` (panel): etiqueta visible siempre, ayuda debajo (`FieldHint`), error debajo del campo con icono y `aria-invalid`. Campos de `min-h-12` en el pasajero y `min-h-11` en el panel, borde `borde-control`, fondo blanco, texto 16 px (evita el zoom de iOS), foco con contorno marca.
- Sin ejemplos dentro de los campos: los marcadores (`placeholder`) con valores reales se quitaron. El ejemplo va en la ayuda ("Por ejemplo: TR-0911-3PAX-Y962", "La letra y el número, por ejemplo V12345678. Con o sin puntos."). La ayuda de la cédula es una sola constante (`ID_NUMBER_HINT` de `src/app/registro/texts.ts`) que comparten ingresar, registro, chofer y taquilla.
- Cuando un campo tiene error, en ingresar y registro el error reemplaza a la ayuda y trae el ejemplo que daba la ayuda; `aria-describedby` apunta al error. Los formularios validan por su cuenta (`noValidate`) y llevan el foco al primer campo con error.
- `Select` y `FileField` en `ui.tsx` (misma apariencia que `Field`). `FileField` (cliente, `src/components/file-field.tsx`) acepta `capture="environment"` para abrir la cámara, muestra el nombre del archivo elegido y una vista previa si es imagen, dice "Aún no has elegido ninguna foto" o "…ningún archivo" según `accept` (o `emptyLabel`), y cuando el campo obligatorio queda vacío cancela la burbuja nativa y muestra su propio error ("Elige la foto antes de enviar.").
- Los `<select>` con `panelInputClass` llevan la marca `campo-panel`: `globals.css` cambia la flecha nativa por el chevron de la marca (trazo de `IconChevronDown`, 20 px, a 12 px del borde). Los que ya dibujan su propio icono usan `appearance-none` y quedan fuera de la regla.
- `FieldErrorSlot` (en `ui.tsx`): una sola región viva por mensaje. El error que llega tras enviar va con `role="alert"` fuera de la región cortés; el que aparece mientras se escribe entra en una región `aria-live="polite"` que existe siempre. Nunca se anidan las dos, porque varios lectores leerían el mismo error dos veces. Lo usan `Field`, `Select`, `FileField`, `PasswordField` y los campos de la taquilla.
- Contraseñas: botón "Mostrar"/"Ocultar" fantasma de 44 px dentro del campo, con texto visible y "contraseña" en `sr-only`, sin `aria-pressed` ni etiqueta cambiante.

### 6.3 Avisos y estados

- `Alert({ tone: "exito" | "peligro" | "alerta" | "info", title?, children, action?, role?, className? })` en `src/components/alert.tsx`: icono por tono (`IconCheckCircle`, `IconAlertCircle`, `IconWarning`, `IconInfo`), título en negrita, texto y acción opcional. `role="status"` (éxito e info) o `role="alert"` (peligro y alerta); `role="none"` para una advertencia fija de la página que no debe interrumpir al cargar. Cuando un aviso lleva varios botones, el texto va en un `<p>` y los botones debajo, en una fila que baja de línea.
- `PanelFeedback` usa `Alert` y además limpia `?ok=` y `?error=` de la URL con `history.replaceState` después de mostrarse, para que al recargar no reaparezca (componente cliente `ClearFeedbackParams`).
- `StatusBadge({ label, tone })` (panel) y `Pill({ tone, children })` (pasajero) comparten implementación (`pillClass`): `text-sm font-medium`, fondo suave del tono, texto del tono, `whitespace-normal` para que no se desborde. Los tonos son los de 3.4.
- `EmptyState({ icon?, title, description?, action? })`: icono en círculo `marca-50`, título, una frase y una acción.
- `ConfirmDialog` en `src/components/confirm-dialog.tsx` (cliente, `<dialog>` nativo): `triggerLabel`, `triggerClassName`, `title`, `description` (ReactNode con las consecuencias), `confirmLabel`, `confirmClassName`, `pendingLabel`, `cancelLabel`, `action` (acción de servidor), `fields` (campos ocultos), `tone: "normal" | "peligro"` (botón rojo e icono de advertencia) y `disabled`. Foco inicial en "Cancelar", cierre con Escape, el botón de confirmar es un `SubmitButton` y el diálogo se cierra solo al terminar la acción. Mientras la acción corre, ni Escape (tampoco un segundo Escape seguido), ni un clic en el fondo, ni "Cancelar" lo cierran. Cuando la confirmación necesita ver lo que la persona escribió en el formulario (el monto de un cobro), se usa un diálogo propio dentro del mismo formulario que copia este comportamiento (`CashConfirmSubmit`, `ChargeDialog`).
- `ProgressBar({ value, max, label, tone?, detail?, className? })` en `ui.tsx` (reexportado por `panel-ui.tsx`): pista de 8 px, `role="progressbar"` con `aria-valuenow` y etiqueta de texto visible ("12 de 40 puestos").
- `StatCard({ label, value, detail?, href?, tone = "neutro", icon? })` en `panel-ui.tsx`: etiqueta, cifra tabular de `text-3xl`, detalle y, con `href`, toda la tarjeta es un enlace con "Ver detalle ›". Los tonos `marca`, `exito`, `alerta` y `peligro` pintan una franja superior de 4 px; el tono `neutro` no lleva franja. El icono va en un círculo `marca-50`. Una cifra solo enlaza si el destino muestra el mismo número que la tarjeta.
- `SidePanel` (panel lateral controlado por la URL, con `CloseOnEscape`): título, botón "Cerrar" de 44 px, cierre con Escape o tocando el fondo, foco atrapado y devuelto al enlace que lo abrió (si el origen ya no existe, lo busca en `main a[href]` por la URL de apertura). Su cuerpo lleva la clase `panel-lateral-cuerpo`: una barra `sticky bottom-0` puesta al final del contenido (directa o dentro de su raíz) queda pegada al pie del panel, con poco o mucho contenido. Así va la barra "Aprobar pago" / "Rechazar" de la revisión de comprobantes.

### 6.4 Navegación y estructura

- `Stepper({ steps, current })` en `src/components/stepper.tsx`: pasos numerados con etiqueta visible, paso actual con `aria-current="step"`, pasos hechos con marca de verificación. Lo usan el asistente de reserva del pasajero y la taquilla. En la taquilla, por debajo de `sm`, el `Stepper` se oculta y lo reemplaza una línea visible "Paso N de 4 · Etapa" (`counterStepLine`).
- `AppHeader` (pasajero, cliente): banda `marca-600` con esquinas inferiores redondeadas. Fila superior con `LogoLockup` blanco (enlace al inicio) y acciones a la derecha (`AppHeaderAction`: icono con etiqueta visible debajo, 56 px). Debajo, botón "Volver" opcional (con la palabra siempre visible), título y subtítulo. La prop `titleOnlyAt` muestra el título y el subtítulo solo en esa ruta: el layout de `/mi` la fija en `/mi`, así el saludo "Hola, Ana" y la cédula enmascarada salen solo en el inicio (como `p`, no como `h1`), y en las demás pantallas la banda queda en la fila del logo (unos 72 px). Cada página pone su propio `h1` sobre el lienzo, al principio del contenido; el detalle de una reserva pagada lo deja solo para lectores de pantalla, porque el ticket ya dice la ruta y la hora. `AppHeaderAction` marca su ruta y sus subrutas con `aria-current="page"`, fondo blanco al 15 %, texto en negrita y una barra blanca bajo la etiqueta; un enlace `plain` ("Salir") nunca se marca. El contenido usa el mismo contenedor que `<main>` (`max-w-md md:max-w-2xl`, `px-4` dentro). Se eliminó la marca de texto con punto rojo.
- `BottomNav` (pasajero): cuatro destinos (Inicio, Reservar, Mis viajes, Avisos) con icono y etiqueta de 14 px, activo en `marca-600` en negrita con una pastilla `marca-100` detrás del icono y `aria-current="page"`. Contador de avisos de nivel alerta en `peligro` ("9+" desde diez), con la frase completa para lectores de pantalla; va en su propio `<Suspense>`. En el teléfono ocupa todo el ancho; desde `md` es una tarjeta centrada de `max-w-2xl` con esquinas superiores redondeadas. Lleva `data-barra-inferior` y va después de `<main>` en el DOM.
- `StickyActions` (pasajero): barra fija con los botones de avance y retroceso de los pasos 2 a 4 del asistente de reserva y una línea de resumen opcional (el total). Lleva `data-acciones-fijas`. Mientras está montada, `globals.css` oculta `BottomNav` (`html:has([data-acciones-fijas]) [data-barra-inferior] { display: none }`, que también la saca del orden de tabulación): en el asistente queda una sola barra fija y un solo camino, y el borrador guarda lo elegido. La barra suma el área segura del teléfono y desde `md` tiene el mismo ancho y bordes que la columna.
- `PanelNav` (panel, cliente): recibe `variant: "agencia" | "terminal"`, `groups`, `title` (nombre de la agencia o "Terminal de pasajeros"), `userName` y `badges`. Barra lateral de 272 px (`w-68`) desde `lg`: banda superior morada (`marca-600` para agencia; toda la barra `marca-900` para terminal) con el logo blanco, etiqueta de rol ("Panel de agencia" / "Administración del terminal") y nombre; grupos con título; enlaces con icono y texto de 15 px, `min-h-11`, activo con fondo `marca-50` y texto `marca-700` (agencia) o `white/10` (terminal), indicador lateral y `aria-current="page"`. El enlace activo **no** cambia el peso de la letra, para que una etiqueta larga no salte de línea. "Salir" al final. Por debajo de `lg`, barra superior pegajosa (`data-barra-panel`) con `LogoLockup` y botón "Menú" que despliega el mismo contenido. La insignia de comprobantes por revisar es ámbar (`alerta`): en el botón "Menú" muestra solo el número en el teléfono y "73 por revisar" desde `sm`; el lector de pantalla oye siempre la frase completa. `PanelSkipLink` ("Saltar al contenido") va antes del menú. `ADMIN_NAV` vive en `src/lib/panel-nav.ts` junto a `OPERATOR_NAV` (que no cambia); su grupo "Terminal" nombra "Tasas del terminal".
- `PanelPageHeader({ title, description?, actions?, back? })`: `h1` único con `text-balance`, una frase de ayuda que diga para qué sirve la pantalla (no notas técnicas como "Hora de Caracas"), enlace de volver opcional y acciones a la derecha. En el teléfono la caja de acciones no pasa del ancho disponible y sus botones bajan de línea (`min-w-0 max-w-full flex-wrap`); desde `sm` conserva su ancho natural.
- `PanelTabs({ label, tabs })`: pestañas de navegación de 44 px dentro de una tarjeta. **No se desplazan de lado**: cuando no caben bajan a la fila siguiente (`flex-wrap`) y en el teléfono cada fila se reparte el ancho (`grow`), así todas las opciones y la activa se ven siempre. La activa usa `PANEL_TAB_ACTIVE_CLASS`: fondo `marca-50`, texto `marca-800` y una barra inferior de 3 px en `marca-600` dibujada con `::after` (la señal que no depende del tono), con el mismo peso de letra que la inactiva. Contador opcional con separador de miles es-VE ("1.234"), relleno `marca-600` en la activa. Las pestañas propias de Pasajeros (`ViewTabs`) y del terminal (`AdminTabs`) y sus skeletons usan las mismas constantes (`PANEL_TAB_ACTIVE_CLASS`, `PANEL_TAB_INACTIVE_CLASS`), y además muestran la espera con `useLinkStatus`: la pestaña pulsada cambia su contador por un spinner y una región `role="status"` siempre montada dice "Abriendo…". En Pasajeros, en el teléfono, las cinco pestañas van en una rejilla de dos columnas con "Todas" a lo ancho; en el periodo del terminal, en una rejilla 2 × 2.
- Fichas de periodo (`PeriodChips` de `src/app/panel/_shared/period-chips.tsx`): filtro con etiqueta, usado por el tablero del operador y por Reportes ("Hoy", "7 días", "30 días" y "Otras fechas"; "Hoy" es el valor por defecto, sin parámetro). La ficha elegida va en `marca-50` con borde y anillo interior `marca-600`, texto `marca-800` y marca de verificación delante; nunca rellena de morado. Las fichas de día de la taquilla siguen el mismo patrón con una barra inferior en vez de la marca de verificación.
- Tablas del panel: `TableShell` en escritorio y lista de tarjetas en móvil (`MobileCard`) con los 3–4 datos esenciales y la acción. `TableShell` envuelve la tabla en un contenedor `relative overflow-x-auto`: el desplazamiento horizontal es la red de seguridad para que nada desborde la página, y `relative` mantiene dentro de él los textos `sr-only` de cabeceras y captions (sin él, ensanchaban la página entera). Las tablas se diseñan para caber sin desplazarse a 820 px (la tableta de mostrador): sin `min-w` fijos, columnas unidas ("Hora y ruta" por debajo de `xl` en Salidas), `table-fixed` con `colgroup` solo desde `xl`, `whitespace-nowrap` en horas, montos, códigos y placas, y `break-words` (nunca `break-all`) en correos y nombres. No hay indicador visual de desplazamiento. Cabeceras de tabla en oración normal y `text-sm` (`PANEL_TH_CLASS`, `PANEL_TD_CLASS`).
- `MobileCard({ title, subtitle?, status?, details?, action? })`: el estado va siempre arriba a la derecha (`shrink-0 max-w-[55%]`) y el título envuelve su texto. Cuando la tarjeta entera es un enlace, lo dice con una flecha, el texto visible ("Ver detalle ›", "Revisar ›") forma parte del nombre accesible y el indicador de espera va dentro del enlace.
- `SectionCard({ title, description?, action?, children })`: sección con cabecera `h2` y cuerpo. La acción baja bajo el texto en el teléfono.
- `ClickableRow`: fila de tabla que navega al hacer clic, ignorando los clics sobre enlaces propios de la fila.
- La nota "Horas en formato de 24 horas, hora de Caracas." aparece **una sola vez** en el pie del panel (`PanelFooter`), no en cada página. En la portada el pie dice "Las horas se muestran en hora de Venezuela."
- Grupos de rutas: la portada vive en `src/app/(portada)/` (página, skeleton, buscador y secciones) y el tablero del operador en `src/app/panel/(tablero)/`, para que cada uno tenga su propio `loading.tsx` sin tapar las demás rutas de `/` y `/panel`. El código compartido de las pantallas públicas está en `src/app/_publico/` y el del panel en `src/app/panel/_shared/`, `_dashboard/` y `_forms/`.

### 6.5 Skeletons

- `src/components/skeleton.tsx` (servidor): `Skeleton({ className })` (bloque con clase `.esqueleto`), `SkeletonText({ lines = 3, className })` (barras de ancho decreciente), `SkeletonCircle({ className })`, `SkeletonButton` y `SkeletonScreen({ label = "Cargando…", children, className })`, contenedor con `role="status"`, `aria-live="polite"` y el texto `label` solo para lectores de pantalla. **`SkeletonScreen` no lleva `aria-busy`**: en una región viva los lectores retienen los anuncios mientras está ocupada y, como el nodo se desmonta sin volver a `false`, nunca dirían "Cargando…". Ninguna silueta usa `aria-busy`.
- `.esqueleto` en `globals.css` (capa `components`): fondo `marca-100` al 60 %, radio `rounded-control`, brillo suave que recorre de izquierda a derecha en 1.6 s; con movimiento reducido queda estático. El bloque aísla su contexto de apilamiento (`isolation: isolate`) y el brillo va con `z-index: -1`: pasa sobre la pista pero debajo de cualquier hijo, así la etiqueta real de un botón quieto nunca se ve lavada.
- **Controles quietos.** Un `loading.tsx` no pinta botones ni campos que se vean vivos: quien nunca usó un sistema los toca y no pasa nada. Un botón quieto (`SkeletonButton({ children, shape: "control" | "pastilla", size, ghost?, onMarca? })`) es un `span` con `aria-hidden`, sin foco, `cursor-default` y `select-none`, con las mismas medidas que el botón real de su forma y tamaño, el brillo de `.esqueleto` en lugar del relleno o el borde, y su texto real en `marca-700` para leer qué hará. `ghost` deja el texto sin fondo en `tinta-suave` (botones fantasma como "Actualizar" o "Descargar en Excel (CSV)"); `onMarca` usa fondo blanco al 15 % y texto blanco sobre la banda morada (el "Buscar salidas" de la portada, en vez del amarillo). Un campo quieto es un bloque `.esqueleto` con la altura del campo real y sin borde de control. Las piezas locales del admin (`ButtonSkeleton`, `InputSkeleton`), de las pantallas públicas (`FieldPreview`, `PrimaryButtonPreview`) y del panel (`SkeletonButton` de `_shared/skeletons.tsx`) siguen esta misma convención.
- Cada `loading.tsx` reproduce la silueta real: mismas alturas, mismos radios, mismo número aproximado de filas, mismo ancho máximo y mismo orden. No inventa bloques que la página no tiene. Se pintan reales el logo, los títulos de página y de sección conocidos, las etiquetas y ayudas de los campos, las cabeceras de tabla, las etiquetas e iconos de las tarjetas de cifra, las etiquetas de las pestañas y el texto de los botones. El `h1` de una silueta se pinta como `<p aria-hidden>` con las clases del `h1`, para no anunciar dos títulos. Las pestañas de una silueta no marcan ninguna como activa (el `loading.tsx` no recibe `searchParams` y marcar una sería adivinar), y las tarjetas de cifra neutras no llevan franja. Los textos fijos se comparten como constantes entre la página y su silueta, para que no se desincronicen.
- Los layouts no bloquean el skeleton: las consultas lentas de un layout (contador de avisos del pasajero, insignia de comprobantes del panel) van dentro de su propio `<Suspense>` para que la estructura y el skeleton aparezcan al instante. Las lecturas de sesión se memorizan por solicitud con `React.cache`, así el layout y la página no repiten la consulta. Los paneles laterales que no necesitan datos (registrar una agencia, un vehículo o un chofer) se pintan sin esperar a la lista.
- Las navegaciones que solo cambian `searchParams` (pestañas, filtros, páginas, paneles laterales) envuelven la zona de datos en `<Suspense key={clave de los parámetros} fallback={skeleton de esa zona}>`. La cabecera y las pestañas quedan fuera de esa frontera, y el control pulsado responde al instante con `useLinkStatus` o con `GetForm`.
- Galería `/dev/esqueletos`: muestra lado a lado cada `loading.tsx` dentro del marco real de su interfaz (cabecera y barra inferior del pasajero, barra lateral de 272 px de agencia o de terminal, barra superior por debajo de `lg`), a sangre hasta 1280 px. Solo existe en desarrollo (`notFound()` fuera de `NODE_ENV=development`, con `noindex`). Todo cambio de silueta se revisa ahí.

### 6.6 Errores y 404

`src/app/error.tsx`, `src/app/not-found.tsx` y `src/app/global-error.tsx` llevan el logo morado `h-20`, un círculo de 56 px con icono (lupa en `marca-50` para la 404, `IconAlertCircle` en `peligro-suave` para el error), una frase llana con `text-balance` ("No encontramos esta página", "Algo salió mal de nuestro lado"), qué hacer y un solo botón principal `lg` a todo el ancho ("Ir al inicio" o "Intentar de nuevo"). "Intentar de nuevo" ejecuta `router.refresh()` y `reset()` dentro de una transición, queda con `aria-disabled` y "Intentando…" mientras espera y anuncia la espera en una región `role="status"` siempre montada; en `global-error.tsx`, que sustituye al layout raíz, recarga la página entera. Hay versiones propias en `/mi` (`mi/error.tsx`), en `/panel` (`panel/not-found.tsx` y `panel/error.tsx`, dentro del marco del panel, con "Volver al tablero" hacia el inicio del rol) y en `/lista-espera` (`not-found.tsx` con la pantalla de marca "Este enlace ya no está activo", respuesta 404 y `noindex`; el layout de `[token]` llama a `notFound()` antes de la frontera de carga para que el estado sea 404 de verdad).

## 7. Experiencia por rol

### 7.1 Pasajero (móvil primero)

- Portada (`/`, sin sesión): héroe morado con el logo blanco, una frase de propósito ("Compra tu pasaje sin hacer cola"), buscador de origen y destino (`SearchCard`, con el botón "Cambiar" para intercambiarlos) con el botón principal `acento` "Buscar salidas", y debajo la nota "Al buscar o reservar te pediremos que ingreses con tu cédula." Luego tres pasos con icono (Busca, Paga, Viaja), el tablero de próximas salidas (`DepartureBoard`: bloque de color de la agencia con la hora y el día, destino como título, "Desde X · Agencia", "18 puestos libres"), la nota del precio una sola vez (`DeparturePriceNote`: "Precio por persona + tasa del terminal de $ 1,00") y el botón secundario "Ver todas las salidas". La tarjeta "¿Primera vez aquí?" ofrece solo "Crear mi cuenta". Pie con logo y acceso del personal.
- Ingresar y registro: tarjeta con el logo morado encima, título, campos grandes, un botón principal y enlaces claros a la otra opción conservando `next`. Si `next` es el asistente de reserva, la descripción dice que se ingresa para ver las salidas y reservar. El registro agrupa sus campos en "Tus datos", "Cómo te avisamos" y "Tu acceso" (cada grupo con su `h2`). `/registro?modo=activar` es el modo para activar una cuenta creada en taquilla: cambian el título ("Activa tu cuenta"), la descripción, el botón ("Activar mi cuenta") y los enlaces del pie; a él llevan "¿Te registraron en la taquilla? Activa tu cuenta" en ingresar y en registro, y la acción del error de ingreso. Tras registrarse se va a `next`, o a `/mi/documentos` si falta la cédula, o a `/mi`.
- `/mi`: la próxima acción en grande. El héroe (`pickHeroReservation`) es el viaje más cercano si sale dentro de 3 horas, sea cual sea su estado; si no, sube la reserva cuyo plazo de pago vence primero, y la ABONADA que sale en menos de 24 horas sube cuando la más cercana ya no pide nada. El título dice lo que importa ("Tu viaje sale en 34 min", "Paga para no perder tu puesto" solo cuando se ve el plazo, "Termina de pagar tu viaje", "Tu próximo viaje"), debajo va el ticket compacto con su plazo, el botón de la acción y "Aborda en: <punto de encuentro>". La sección "Tu otro viaje" / "Tus otros viajes" muestra el siguiente con su estado, plazo y acción. "Lo importante ahora" lista los avisos sin repetir lo que ya dicen el héroe o el otro viaje (`homeNotices`). "Salen pronto" aparece solo si no hay viaje próximo.
- Mis viajes: "Próximos" y "Pasados" como control segmentado. Encima de "Próximos", un solo aviso con la reserva cuyo plazo vence primero y su botón; la lista sigue en orden cronológico y, dentro de una misma salida, por urgencia.
- Asistente de reserva (`/mi/reservar`): `Stepper` visible, un paso por pantalla, botón de avance grande abajo. Paso 1: fichas solo para los días con salidas ("Hoy · 8 salidas"), en una fila que se desliza con ajuste en el teléfono y que baja de línea desde `sm`; el día queda en `?dia=AAAA-MM-DD` y en el borrador. En "Hoy", "Salen pronto" arriba y "Más tarde" debajo; las llenas al final con "Lista de espera"; un tope de 8 salidas por día con "Ver N salidas más de este día". Cada tarjeta es un botón entero con la hora, la agencia, la duración y "Elegir ›". Pasos 2 a 4: la salida elegida arriba (`ChosenDeparture`: "Sale hoy a las 06:00", o "Sale en N min" si es urgente), la barra fija con el desglose ("$ 45,00 + $ 1,00 del terminal · Total $ 46,00") y sin `BottomNav`. Si el bus sale antes de que venza el plazo normal, el plazo es la salida ("Tienes que pagar antes de que salga el bus, hoy a las HH:mm") y la opción de pagar en taquilla no se ofrece a menos de 12 horas. Un paso incompleto lleva el foco y la vista al primer pendiente (`revealAndFocus`). El borrador queda atado a la cuenta.
- Ticket (`TicketCard`, compacto o grande): cabecera morada con el logo, ruta, día ("Hoy, jueves 1 de octubre"), hora grandes; cuerpo con la agencia, el estado en palabras del pasajero y el código de reserva legible. La versión grande lleva el QR grande, "Dónde abordar" con el punto de encuentro mientras la reserva sirve, y el estado de pago: barra de progreso con lo que falta, "Total a pagar: $ X" si aún no hay pagos, o "Enviaste $ Y: lo estamos revisando" si todo está en revisión. Con plazo, una línea en alerta con reloj ("Paga hoy antes de las 21:02"). Una reserva que ya no sirve se muestra apagada.
- Detalle de la reserva: los avisos dicen la hora del plazo; la forma de pago resalta una sola cifra (en el recuadro del método, con "Equivale a $ X" para bolívares y pesos), permite pagar una parte y ofrece "Usar el monto completo: $ X". "Tus pagos" usa sus propias etiquetas ("En revisión", "Aprobado", "Rechazado") y un estado vacío con icono. No se ofrece enviar comprobante cuando la salida ya pasó.
- Documentos: con la foto guardada, el reemplazo queda plegado tras "Cambiar la foto" y la tarjeta dice "Tu cédula está lista. Ya puedes reservar." con el botón para seguir.
- Avisos: los mensajes de los últimos 7 días abiertos (hasta 5) y los anteriores plegados en "Ver N mensajes anteriores".
- Estados del pasajero en lenguaje propio (`passengerStatusLabel` en `src/lib/labels.ts`): "Falta pagar", "Revisando tu pago", "Pagado en parte", "Pagado", "Pagas en taquilla", "Puesto liberado", "Cancelada", "Viaje realizado", "No te presentaste". Las etiquetas del panel (`reservationStatusLabel`) no cambian.

### 7.2 Operador de agencia (tablet de mostrador y escritorio)

- Tablero (`/panel`): arriba, "Lo que necesita tu atención" (comprobantes por revisar, salidas que embarcan pronto o están atrasadas con "Sale en 1 h 45 min" o "Debía salir a las 13:00") con un botón por aviso, y una línea neutra en vivo con las reservas por cobrar. Luego las fichas de periodo y 3 cifras (Recaudado a lo ancho en el teléfono, Salidas y Tickets). Debajo, "Salidas de hoy" (tarjetas enteras que enlazan y una línea de movimientos, o "—" si no hay), "Choferes y buses" (en ruta, embarcando, atrasados y quién no tiene viaje hoy), "Tickets nuevos" y la actividad en secciones plegables con el patrón de acordeón (un `h2` con un botón `aria-expanded`). Las dos acciones de cabecera son "Vender un pasaje" y "Registrar un cobro".
- Taquilla: flujo guiado de 4 pasos con `Stepper` y botones grandes. Paso 1: fichas de día (rejilla de 4 columnas con nombres cortos en el teléfono), buscador que mira los 7 días y una sola nota de precio sobre la lista ("Los precios son por persona e incluyen la tasa del terminal de $ X"). Paso 2: la cédula del titular; mientras no hay resultado, el botón de la barra es "Buscar titular". Desde el paso 3, una franja con la salida, el titular y "Cambiar salida". El total y el vuelto en cifras muy grandes, con un diálogo de cobro que no se cierra mientras se envía.
- Cobro en efectivo en dos pasos: primero se busca la reserva por código o por cédula ("Código de la reserva o cédula"; una cédula con una sola reserva por cobrar la abre, con varias abre la lista "Por cobrar" filtrada), y nunca se revela si un código es de otra agencia. Luego, en el detalle de la reserva, el formulario muestra el titular y lo que falta, pide primero la moneda y trae el monto ya convertido con la regla de la reserva (tasa congelada en su moneda, vigente en la otra moneda local, USD y USDT uno a uno; una moneda sin tasa de hoy no se ofrece), sin pisar un monto que el operador ya escribió. "Registrar cobro" abre una confirmación con las cifras (monto, titular, saldo que queda o ticket emitido, aviso destacado si excede el saldo, que no se puede deshacer). Una reserva ya pagada responde "Esta reserva ya está pagada. No se registró ningún cobro."
- Pasajeros y pagos: pestañas con contador (Por revisar, Por cobrar, Pagadas, Anuladas, Todas), fila o tarjeta entera → panel lateral de detalle. La cola "Por revisar" va primero con los de la salida más próxima y marca la urgencia ("Sale en 44 min"). Cada comprobante dice "Si lo apruebas: quedan $ X por pagar" o "queda pagada". La revisión abre la imagen ampliable en un diálogo de la misma página y la barra fija "Aprobar pago" (con `ConfirmDialog` que dice la consecuencia en números) / "Rechazar" (abre el motivo). El detalle de la reserva solo enlaza a "Revisar este comprobante" y vuelve a la reserva al terminar. Descarga "Descargar en Excel (CSV)": punto y coma como separador, coma decimal y protección contra fórmulas.
- Salidas: "Próximas" muestra hoy y mañana (y las de las últimas 2 horas); "Ver los próximos días (N salidas más)" abre `?dias=todos`. Una salida atrasada dice "Debía salir a las 21:00" con la pastilla "Atrasada"; "Casi llena · 4 libres" con 4 puestos o menos. La hoja de salida muestra primero los "Pasos del viaje" y solo los botones válidos para su estado (`availableTripActions`), con `ConfirmDialog` para iniciar el embarque, registrar la salida y la llegada; la confirmación de embarque lista en cifras quién debe dinero y quién espera revisión. Un aviso arriba de los pasajeros dice cuántos deben y cuántos enviaron comprobante, con "Ver las reservas por cobrar" y "Revisar el comprobante". Los pasajeros van agrupados por reserva (primero los que deben o esperan revisión antes del embarque, primero los que faltan por subir después), los acompañantes dicen "Viaja con <titular>" y quienes no viajan quedan plegados al final.
- Abordaje ("Escanear tickets"): el escáner solo se abre con el manifiesto cerrado o el bus en ruta. El resultado se muestra en una capa a pantalla completa (`<dialog>` modal nativo, fondo `exito` o `peligro`, texto blanco, icono muy grande, título `text-4xl` y nombre del titular `text-3xl`): atrapa el foco, se cierra con Escape, bloquea el fondo y no tiene animaciones. El verde solo sale para un ticket sin saldo; un ticket con saldo va directo a la ficha con "Falta cobrar $ X" en alerta. El rojo muestra el nombre del titular solo si la reserva es de la misma agencia. "Listo" muestra a pantalla completa quiénes subieron y "Escanear el siguiente". El campo vacío no abre la capa roja: marca el error junto al campo.
- Flota: estado de cada unidad (En ruta, Atrasado, Embarcando, Asignado, Disponible, Fuera de servicio), con una leyenda: "Asignado" es que sale hoy o en las próximas 12 horas y "Disponible", libre por ahora aunque tenga salidas más adelante. El viaje en curso enlaza a su hoja de salida.
- Reportes: fichas de periodo, "Recaudación" y "Movimientos de choferes", 2 cifras compactas en el teléfono, y la ruta que más cobró marcada en la tabla.

### 7.3 Administrador del terminal (escritorio)

- Misma estructura que el panel de agencia (barra lateral con grupos) en variante `terminal` (morado profundo), para que un administrador que conoce una pantalla conozca la otra.
- Tablero: tasa de salida en vivo destacada (la única tarjeta con franja morada, "En vivo", y una región `sr-only` que solo anuncia la pérdida o recuperación de la conexión) junto a "Usuarios recurrentes"; luego "Resumen del periodo" con sus pestañas y las cifras en tono neutro, el gráfico por hora (con su texto equivalente y los rótulos centrados bajo cada barra) y las secciones "Últimos viajes completados" (ordenados por llegada, con la columna "Llegó", cada fila enlaza a su detalle) y "Usuarios nuevos", con estado vacío útil.
- Movimientos: la lista de agencias aplica sola al cambiar (con su propia espera, y un botón "Filtrar" de respaldo sin JavaScript), el periodo y la agencia en una sola barra, y la descarga junto al total. En el teléfono, cada viaje es una tarjeta entera que enlaza a "Ver pasajeros a bordo".
- Usuarios: buscador con ejemplos ("V12345678, María Pérez o 0412 123 4567"), teléfonos con formato de grupos, paginación del servidor y "Ver sus mensajes" en cada fila. Cada consulta queda auditada.
- Agencias y tasas: formularios con `ConfirmDialog` para desactivar una agencia (dice cuántas reservas de viajes próximos se mantienen y que su personal puede seguir cobrándolas y embarcándolas) o cambiar una tasa. "Tasas del terminal" muestra tres secciones hermanas (tasa de salida, del bolívar y del peso colombiano) con el valor vigente, el campo con su ayuda de formato y el historial. La contraseña del operador nuevo se puede mostrar y ocultar.
- Mensajes: búsqueda `?q=` por teléfono, cédula o código de reserva (auditada como `CONSULTA_MENSAJES`), etiquetas y tonos de `labels.ts` (`MESSAGE_STATUS_LABELS`, `messageStatusTone`) en vez de textos propios, columna "Cuándo" ("Salió con N de retraso" solo si pasó del umbral) y un aviso de modo de prueba cuando el proveedor es el falso. En el teléfono el texto se recorta a 3 líneas con "Ver el mensaje completo".

## 8. Glosario de textos de interfaz

| En vez de | Escribe |
|---|---|
| Cupos | Puestos |
| SERIAL, Código del ticket | Código de reserva (es el mismo código impreso en el ticket) |
| Credenciales inválidas | La cédula o la contraseña no coinciden |
| Pago en sitio | Pagar en la taquilla |
| Tasa de salida (al pasajero) | Tasa del terminal |
| Encolado / Fallido (mensajes) | Usar `MESSAGE_STATUS_LABELS`: "En espera", "Enviado", "Entregado", "Leído", "No se pudo enviar" |
| Exportar CSV | Descargar en Excel (CSV) |
| reserva(s), cuenta(s), pasajero(s) | singular o plural según el número ("1 persona", "3 personas") |
| C.I. | Cédula |
| Origen: Todos | Cualquier origen |
| min (suelto) | "Sale en 15 min" (`formatRelativeDeparture`) |
| Caracas – Mérida | Caracas → Mérida (`arrowRouteName`) |
| Total cobrado | Recaudado |
| Recorridos | Viajes completados |
| Abordaje, escáner | Escanear tickets |
| Invertir | Cambiar (origen y destino) |
| Pagar ahora, Paga tu reserva | Pagar mi viaje (o "Pagar mi viaje a {destino}" donde no se ve la ruta) |
| Validar, validado | Revisar, revisando tu pago |
| Reconfirmar | Paga antes de que falten 12 horas para la salida |
| Antes del 01/10/2026 a las… | Hoy antes de las…, mañana antes de las…, el lun 12 oct antes de las… |

Los textos fijados por tests (`labels.ts`, `describeActivity`, `formatRelativeDeparture`, `reservationActionLabel`, las frases de plazo de `passenger-copy.ts`, las plantillas de mensajes, los mensajes de error de dominio en `feedback.ts` y en los módulos) **no se cambian** salvo que la tarea actualice sus tests a la vez y lo reporte.

## 9. Fuera de alcance

Modo oscuro, cambios en reglas de negocio, en el esquema de base de datos o en la matriz de permisos, y el cálculo de dinero del cliente con `number` (queda como deuda registrada). También queda como deuda técnica que `transitionReservation` no bloquea la fila de la reserva: el barrido de 12 horas podría escribir `LIBERADA` sobre una reserva que se acaba de pagar en el mismo instante.

## 10. Decisiones pendientes del operador

Las rondas de calidad dejaron estas preguntas de negocio sin resolver. La interfaz actual toma la opción más prudente que no cambia reglas, indicada en cada punto.

1. **Reconfirmación del pago en taquilla.** Ningún flujo del MVP escribe `reconfirmedAt`: el botón RECONFIRMAR de la plantilla no hace nada y la única forma de conservar un puesto de pago en taquilla es pagar antes de que falten 12 horas. Los textos dicen eso. Hay que decidir si se implementa la reconfirmación (respuesta por WhatsApp o un botón en `/mi`) y, en ese caso, volver al texto "confirma que viajas y paga al llegar".
2. **Embarque con saldo pendiente.** El escáner no muestra el verde a quien debe dinero y la hoja de salida avisa cuántos deben, pero el dominio (`confirmBoarding`) permite que suba. Hay que decidir si se bloquea el embarque con saldo pendiente, se pide una casilla de "ya cobré" o se deja como está.
3. **Escáner solo con manifiesto cerrado o en ruta.** Hoy es una regla de la interfaz. Hay que decidir si se convierte en regla de negocio validada en `confirmBoarding`.
4. **Comprobantes después de la salida.** La app del pasajero no ofrece enviar un comprobante cuando la salida ya pasó, pero `submitProof` lo acepta en el servidor. Hay que decidir si se rechaza también ahí.
5. **Manifiestos cerrados que nunca partieron.** El barrido `sweepAutoClose` no tiene salida para una salida en `MANIFIESTO_CERRADO` que nunca registró su partida. La flota la muestra como "Atrasado" durante 12 horas y después deja de mostrarla, pero en la base sigue cerrada. Hay que decidir si se cancela o finaliza de forma automática y con qué efecto sobre sus reservas.
6. **Enmascarar por defecto los datos sensibles del admin.** Usuarios, Mensajes y el detalle de viaje muestran cédulas y teléfonos completos; cada consulta queda auditada. Queda como recomendación enmascararlos por defecto con "Mostrar" bajo demanda. También aceptado por ahora: la búsqueda de mensajes y de pasajeros lleva la cédula o el teléfono en la URL (`?q=`, `?buscar=`).
7. **Recuperación de contraseña.** No existe. El pasajero de taquilla activa su cuenta desde `/registro?modo=activar`, pero quien olvida su contraseña no tiene camino propio, y el personal solo lee "Pide ayuda a la administración del terminal o al responsable de tu agencia." Hay que decidir el mecanismo (código por WhatsApp, restablecimiento por el admin u otro).
8. **Varias reservas de una misma cuenta en una misma salida.** `createReservation` no lo impide. Hay que decidir si se permite (por ejemplo, para comprar en dos momentos) o se bloquea.
9. **Monto en moneda local en los mensajes.** Los mensajes dicen el monto en dólares. Hay que decidir si muestran también el equivalente ("$ 26,00 (Bs. 955,27)") cuando la reserva es en bolívares o pesos.
10. **Periodos distintos entre roles.** El operador usa "Hoy" (día de calendario de Caracas) y el admin conserva "Últimas 24 horas". Son ventanas distintas a propósito; hay que confirmar si se unifican.
11. **Tope de salidas por día en el asistente.** El paso 1 muestra 8 salidas por día antes de "Ver N salidas más". Es un criterio de interfaz que conviene confirmar con el volumen real del terminal.
