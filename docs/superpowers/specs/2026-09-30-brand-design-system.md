# Sistema de diseño TicketRuta — marca, interfaz y experiencia

Fecha: 2026-09-30. Rama: `feat/brand-redesign`. Estado: aprobado por el operador para ejecución autónoma.

Este documento es la fuente de verdad visual y de experiencia de uso para las tres interfaces (pasajero, operador de agencia y administrador del terminal). Todo subagente que toque la interfaz lo sigue al pie de la letra. Si algo no está aquí, se decide a favor de la claridad para una persona que nunca ha usado un sistema.

## 1. Principios

1. **Una acción principal por pantalla.** Es el único botón morado relleno visible sin desplazarse. Todo lo demás es secundario (contorno), fantasma (texto) o enlace.
2. **Lenguaje llano.** Tuteo, frases cortas, verbos concretos en los botones ("Pagar mi pasaje", "Subir foto de la cédula", "Confirmar pago"). Nada de jerga interna, claves técnicas, estados en mayúsculas ni plurales con paréntesis ("reserva(s)"): se escribe el singular o el plural correcto según el número.
3. **Divulgación progresiva.** Se muestra lo esencial; el detalle vive detrás de "Ver detalle", un panel lateral o una pestaña. Ninguna pantalla muestra más de 4 cifras destacadas a la vez.
4. **Siempre se sabe dónde se está, qué pasó y qué sigue.** Título de página claro, elemento del menú activo marcado (`aria-current="page"`), botón de volver en pantallas de detalle, y tras cada acción un aviso con icono que dice el resultado y el paso siguiente.
5. **Cada icono va con texto.** Los iconos solos solo se permiten dentro de botones que además tienen `aria-label` y, en la app del pasajero, una etiqueta visible debajo o al lado.
6. **Nada se pierde ni se hace dos veces.** Todo envío de formulario muestra estado pendiente (`SubmitButton`) y se deshabilita mientras dura. Las acciones irreversibles o de alto impacto piden confirmación con sus consecuencias en números ("Se anularán 3 reservas sin abordar").
7. **Estados vacíos útiles.** Icono + una frase de qué significa + una acción para salir de ahí.
8. **Carga percibida inmediata.** Toda ruta con datos tiene `loading.tsx` con un skeleton que reproduce la silueta real de la pantalla. Los cambios de pestaña, filtro o página por `searchParams` usan `<Suspense key={...}>` con su skeleton.
9. **Robustez.** Ninguna URL manipulada tumba una pantalla: los `searchParams` se validan con `safeParse` o `.catch()` y caen a un valor por defecto.
10. **Accesibilidad WCAG 2.2 AA** como piso: contraste 4.5:1 en texto, 3:1 en bordes de controles y en iconos informativos, foco visible siempre, objetivos táctiles de 44 × 44 px como mínimo, un solo `h1` por página, etiquetas visibles en todos los campos, `prefers-reduced-motion` respetado.

## 2. Marca

### 2.1 Logo

El logo oficial es el texto isométrico "TICKET RUTA" sobre el frente de un autobús, en blanco sobre morado `#601DBF`. Se vectorizó a SVG de un solo trazado.

| Archivo en `public/brand/` | Uso |
|---|---|
| `logo-blanco.svg` | Logo completo en blanco, sobre fondos morados (portada, barra del panel, pantallas de marca). viewBox `0 0 2283 1997`. |
| `logo-morado.svg` | Logo completo en morado, sobre fondos claros (ingresar, registro, errores, ticket). |
| `isotipo-blanco.svg` / `isotipo-morado.svg` | Solo el frente del autobús. viewBox `0 0 930 1262`. Para cabeceras compactas, el menú móvil y el icono de la app. |
| `logo-original.webp` | Imagen original entregada por el operador, como referencia. No se usa en la interfaz. |

Iconos de aplicación (en `src/app/`): `icon.svg` (cuadrado redondeado morado con el isotipo blanco), `apple-icon.png` (180 px), `manifest.ts` con `icon-192.png` e `icon-512.png` en `public/brand/`, y `opengraph-image.png` (1200 × 630, morado con el logo blanco centrado). `favicon.ico` de la plantilla de Next se elimina.

Componentes en `src/components/logo.tsx` (servidor, sin hooks):

- `Logo({ tone = "marca" | "blanco", className, priority?, decorative? })`: logo completo como `next/image` con `unoptimized`, `width={2283} height={1997}`; el tamaño lo fija `className` (por ejemplo `h-24 w-auto`). `alt="TicketRuta"`, o `alt=""` si `decorative`.
- `Isotipo({ tone, className, decorative? })`: frente del autobús, `width={930} height={1262}`.
- `LogoLockup({ tone, className, label? })`: isotipo + la palabra "TicketRuta" en `font-extrabold tracking-tight` (el texto va en HTML, no en imagen); `label` opcional debajo en tamaño pequeño ("Panel de agencia", "Terminal"). Es la versión horizontal para cabeceras compactas.

Reglas del logo:
- Área de respeto mínima: la altura de la letra "R" alrededor del logo.
- Tamaño mínimo del logo completo: 64 px de alto. Por debajo se usa `LogoLockup` o `Isotipo`.
- Nunca se deforma, se rota, se le aplican sombras ni se coloca sobre fotos o colores que no sean morado de marca, blanco o lienzo.

### 2.2 Dónde va el logo

1. Portada (`/`): logo completo blanco grande en el héroe morado.
2. `/ingresar`, `/registro`, `/panel/ingresar`: logo completo morado sobre la tarjeta del formulario.
3. Cabecera de la app del pasajero (`AppHeader`): `LogoLockup` blanco, enlaza al inicio.
4. Barra lateral del panel de agencia y del terminal: banda superior morada con el logo completo blanco (72–80 px de alto) y debajo el rol y el nombre de la agencia o "Terminal". En móvil, barra superior con `LogoLockup`.
5. Ticket en pantalla (`TicketCard`) y PDF del ticket: isotipo o logo en la cabecera del ticket.
6. Páginas de error, 404 y estado vencido: logo morado arriba del mensaje.
7. Skeleton de la portada y de ingresar: el logo real se pinta desde el primer instante (presencia de marca mientras carga).
8. Pie de la portada: `LogoLockup` pequeño con "Terminal de pasajeros" y el acceso del personal.

## 3. Paleta

Todos los colores se definen como variables en `:root` de `src/app/globals.css` y se exponen como utilidades de Tailwind con `@theme inline`. **Ningún componente usa hex, `bg-[var(--...)]`, ni colores de Tailwind fijos (`bg-red-50`, `text-slate-500`, `bg-blue-600`).** Se usan las utilidades: `bg-marca-600`, `text-tinta-suave`, `border-borde`, etc.

### 3.1 Morado de marca (primario)

| Token | Hex | Uso |
|---|---|---|
| `marca-50` | `#F6F2FD` | Fondo de fila activa, fondo de pestaña activa, superficie de acento muy suave |
| `marca-100` | `#ECE3FB` | Fondo de insignias de marca, hover suave, pista del skeleton |
| `marca-200` | `#D9C7F7` | Bordes de acento, separadores sobre morado claro |
| `marca-300` | `#BB9CF0` | Iconos decorativos sobre morado oscuro |
| `marca-400` | `#9565E3` | Solo decorativo (no texto sobre blanco: 4.0:1) |
| `marca-500` | `#7838D3` | Hover de superficies moradas |
| `marca-600` | `#601DBF` | **Color de marca.** Botón primario, enlaces, foco, cabeceras. 8.7:1 sobre blanco |
| `marca-700` | `#4E169D` | Hover y pulsado del primario, texto de marca sobre `marca-50/100` |
| `marca-800` | `#3D117C` | Texto de marca fuerte, bordes sobre morado |
| `marca-900` | `#2C0C5B` | Barra lateral del terminal (admin), fondos profundos |
| `marca-950` | `#1C063C` | Texto sobre amarillo sol, sombras de marca |

### 3.2 Sol (secundario de acento)

Amarillo cálido, complementario del morado. Se usa con moderación: resalta lo excepcional, nunca compite con el primario sobre fondo blanco.

| Token | Hex | Uso |
|---|---|---|
| `sol` | `#FFC629` | Botón de acción principal **solo sobre fondos morados** (texto `marca-950`, 11.7:1), anillo de foco sobre fondos morados, marca "Nuevo" y "Tu ticket está listo" |
| `sol-suave` | `#FFF4D1` | Fondo de avisos destacados positivos no críticos |
| `sol-oscuro` | `#8A5A00` | Texto sobre `sol-suave` (5.4:1) |

### 3.3 Neutros (tinta y lienzo)

| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#1A1530` | Texto principal (17.6:1 sobre blanco) |
| `tinta-suave` | `#57526B` | Texto secundario (7.4:1 sobre blanco, 6.8:1 sobre lienzo) |
| `tinta-tenue` | `#6E6982` | Texto terciario, marcas de tiempo (5.2:1 sobre blanco) |
| `borde` | `#E3DFEC` | Bordes de tarjetas y separadores (decorativos) |
| `borde-control` | `#857E99` | Borde de campos de formulario, casillas y controles (3.9:1, cumple 3:1) |
| `lienzo` | `#F6F4FA` | Fondo de todas las páginas |
| `superficie` | `#FFFFFF` | Tarjetas, paneles, tablas |

### 3.4 Semánticos

Cada estado se expresa con color **y** con icono **y** con texto. Nunca solo color.

| Tono | Texto/relleno | Fondo suave | Significado |
|---|---|---|---|
| `exito` | `#137A46` | `exito-suave #E6F4EC` | Pagado, confirmado, a bordo, guardado |
| `alerta` | `#A15C00` | `alerta-suave #FFF3DC` | Pendiente, por vencer, requiere atención |
| `peligro` | `#C0262D` | `peligro-suave #FDECEC` | Error, rechazado, cancelado, acción destructiva |
| `info` | `#1F5FBF` | `info-suave #E8F0FC` | Información neutra, ayuda, en validación |

Todos superan 4.5:1 como texto sobre blanco y sobre su fondo suave.

### 3.5 Colores de agencia

Seis bloques con texto blanco, todos ≥ 5.4:1, ninguno parecido al morado de marca: `#C62828` rojo, `#0B5CAD` azul, `#1E7A34` verde, `#B3480C` naranja, `#0B7285` turquesa, `#44546A` pizarra. Se asignan con `agencyColor(agencyId)` de `src/lib/brand.ts` y un test verifica el contraste.

### 3.6 Alias de compatibilidad

Los tokens viejos siguen existiendo como alias para que nada se rompa durante la migración; **ningún archivo nuevo o rediseñado los usa**, y la tarea de cierre elimina los que queden sin uso:

`--marca → marca-600`, `--marca-oscura → marca-800`, `--marca-clara → marca-100`, `--acento → marca-600`, `--acento-suave → marca-50`, `--cta → marca-600`, `--ruta → marca-600`, `--ruta-oscura → marca-700`, `--en-vivo → exito`, `--fondo → lienzo`, `--texto → tinta`, `--texto-suave → tinta-suave`.

## 4. Tipografía

- Familia única: **Atkinson Hyperlegible Next** (Google Fonts, variable 200–800, cargada con `next/font/google`, variable CSS `--font-atkinson`). Diseñada por el Braille Institute para distinguir caracteres parecidos (`I l 1`, `O 0`, `S 5`): crucial para códigos de reserva (`TR-0914-1PAX-SA7D`), cédulas y montos. Reemplaza a Rubik.
- Cifras de dinero, horas, cupos y códigos: clase `.tabular` (`font-variant-numeric: tabular-nums`).
- Escala:

| Rol | Clases |
|---|---|
| Título de página (`h1`) | `text-2xl sm:text-3xl font-bold tracking-tight text-tinta` |
| Título de sección (`h2`) | `text-lg font-semibold text-tinta` (oración normal, **no** mayúsculas) |
| Subtítulo (`h3`) | `text-base font-semibold` |
| Cuerpo | `text-base leading-relaxed` (16 px) |
| Secundario | `text-sm text-tinta-suave` (14 px) |
| Mínimo absoluto | `text-sm` (14 px). `text-xs` solo para contadores numéricos de insignias |
| Cifra destacada | `text-3xl font-bold tabular` |

## 5. Forma, espacio y elevación

- Radios: `--radio-tarjeta: 16px` (tarjetas y paneles), `--radio-control: 12px` (campos y botones de panel), `--radio-pastilla: 999px` (botones del pasajero, insignias, pestañas). Utilidades `rounded-tarjeta`, `rounded-control`, `rounded-pastilla`.
- Espaciado en múltiplos de 4 px; separación entre bloques de una página: `gap-6` (24 px); dentro de una tarjeta: `gap-3`/`gap-4`.
- Sombras: `--sombra-1` (tarjetas: `0 1px 2px rgb(26 21 48 / 0.06), 0 1px 3px rgb(26 21 48 / 0.04)`), `--sombra-2` (paneles flotantes y hover: `0 8px 24px rgb(26 21 48 / 0.10)`). Utilidades `shadow-1`, `shadow-2`. Las tarjetas llevan `border border-borde` + `shadow-1`.
- Movimiento: transiciones de 150–200 ms `ease-out` solo en color, opacidad y `transform`; nunca en `width`/`height`. Todo con `motion-reduce:transition-none` / `motion-reduce:animate-none`. `globals.css` incluye una regla `@media (prefers-reduced-motion: reduce)` global que anula animaciones y transiciones.
- Foco: `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white`; sobre fondos morados, `focus-visible:ring-sol focus-visible:ring-offset-marca-600`. Clases utilitarias `.foco` y `.foco-sobre-marca` en `globals.css` para no repetirlo.

## 6. Componentes compartidos

Se mantienen las API existentes (los tests y las páginas las usan) y se amplían. Ningún subagente de pantalla edita estos archivos: si necesita algo nuevo lo construye local en su carpeta y lo reporta. Excepción: se pueden **agregar** iconos al final de `src/components/icons.tsx` (releyendo el archivo justo antes de editar, sin tocar los existentes).

### 6.1 Botones

- Pasajero, `buttonClass(variant, extra?, size = "md")` en `ui.tsx`. Variantes: `primario` (marca-600 relleno, texto blanco, hover marca-700), `secundario` (blanco, texto marca-700, borde `borde-control`/marca-200, hover marca-50), `fantasma` (texto marca-700, hover marca-50), `acento` (sol relleno, texto marca-950: solo sobre morado), `sobre-marca` (blanco relleno, texto marca-700: sobre morado), `peligro` (peligro relleno, texto blanco), `ruta` (alias de `primario`). Tamaños: `sm` = `min-h-11` (44 px), `md` = `min-h-12` (48 px), `lg` = `min-h-14 text-lg` (56 px, la acción principal de un paso). Forma pastilla.
- Panel, `panelButtonClass(variant, size = "md", extra?)` en `panel-ui.tsx`. Variantes: `primario`, `secundario`, `exito`, `peligro`, `fantasma`. Tamaños: `sm` = `min-h-10` (solo dentro de tablas en escritorio), `md` = `min-h-11`, `lg` = `min-h-12`. Forma `rounded-control`.
- `SubmitButton` en `src/components/submit-button.tsx` (cliente, `useFormStatus`): `children`, `pendingLabel` (por defecto "Guardando…"), `className`, resto de atributos de botón. Mientras envía: deshabilitado, `aria-disabled`, spinner con `motion-reduce` y el texto `pendingLabel`. **Todo `<form action={...}>` de servidor usa `SubmitButton` como botón de envío.**

### 6.2 Formularios

- `Field` (pasajero) y `panelInputClass` (panel): etiqueta visible siempre, ayuda debajo (`hint`), error debajo del campo con icono y `aria-invalid`. Campos de `min-h-12` en el pasajero y `min-h-11` en el panel, borde `borde-control`, fondo blanco, texto 16 px (evita el zoom de iOS), foco con anillo marca.
- `Select` y `FileField` en `ui.tsx` (misma apariencia que `Field`). `FileField` acepta `capture="environment"` para abrir la cámara, muestra el nombre del archivo elegido y una vista previa si es imagen (cliente, en `src/components/file-field.tsx`).
- El error de un campo usa `role="alert"` solo cuando aparece tras enviar, no mientras se escribe.

### 6.3 Avisos y estados

- `Alert({ tone: "exito" | "peligro" | "alerta" | "info", title?, children, action? })` en `src/components/alert.tsx`: icono por tono, título en negrita, texto y acción opcional. `role="status"` (éxito e info) o `role="alert"` (peligro y alerta).
- `PanelFeedback` usa `Alert` y además limpia `?ok=` y `?error=` de la URL con `history.replaceState` después de mostrarse, para que al recargar no reaparezca (componente cliente `ClearFeedbackParams`).
- `StatusBadge({ label, tone })` (panel) y `Pill({ tone, children })` (pasajero) comparten implementación: `text-sm font-medium`, punto o icono, fondo suave del tono, texto del tono, `whitespace-normal` para que no se desborde.
- `EmptyState({ icon?, title, description?, action? })`: icono en círculo `marca-50`, título, una frase y una acción.
- `ConfirmDialog` en `src/components/confirm-dialog.tsx` (cliente, `<dialog>` nativo): `triggerLabel`, `triggerClassName`, `title`, `description` (ReactNode con las consecuencias), `confirmLabel`, `confirmClassName`, `action` (acción de servidor) y `fields` (campos ocultos). Foco inicial en "Cancelar", cierre con Escape, el botón de confirmar es un `SubmitButton`.
- `ProgressBar({ value, max, label, tone? })` en `panel-ui.tsx`: pista de 8 px, `role="progressbar"` con `aria-valuenow` y etiqueta de texto visible ("12 de 40 puestos").

### 6.4 Navegación y estructura

- `Stepper({ steps, current })` en `src/components/stepper.tsx`: pasos numerados con etiqueta visible, paso actual con `aria-current="step"`, pasos hechos con marca de verificación. Lo usan el asistente de reserva del pasajero y la taquilla.
- `AppHeader` (pasajero): banda `marca-600` con esquinas inferiores redondeadas; fila superior con `LogoLockup` blanco (enlace al inicio) y acciones a la derecha con etiqueta visible debajo del icono; debajo, botón de volver opcional, título (`h1` único de la página) y subtítulo. Se elimina la marca de texto con punto rojo.
- `BottomNav` (pasajero): cuatro destinos con icono y etiqueta de 13–14 px, activo en `marca-600` con indicador, contador de avisos en `peligro` con texto para lectores de pantalla. En escritorio sigue fija abajo, centrada, con ancho máximo.
- `PanelNav` (panel): recibe `variant: "agencia" | "terminal"`, `groups`, `title` (nombre de la agencia o "Terminal de pasajeros"), `userName` y `badges`. Barra lateral de 272 px desde `lg`: banda superior morada (`marca-600` para agencia, `marca-900` para terminal) con el logo blanco, etiqueta de rol ("Panel de agencia" / "Administración del terminal") y nombre; grupos con título; enlaces con icono y texto de 15 px, `min-h-11`, activo con fondo `marca-50` (agencia) o `white/10` (terminal) e indicador lateral; "Salir" al final. Por debajo de `lg`, barra superior con `LogoLockup` y botón "Menú" que despliega el mismo contenido. `ADMIN_NAV` vive en `src/lib/panel-nav.ts` junto a `OPERATOR_NAV` (que no cambia).
- `PanelPageHeader({ title, description?, actions? })`: `h1` único, una frase de ayuda que diga para qué sirve la pantalla (no notas técnicas como "Hora de Caracas"), acciones a la derecha.
- Tablas del panel: `TableShell` en escritorio (`hidden md:block`) y lista de tarjetas en móvil (`md:hidden`) con los 3–4 datos esenciales y la acción. Cabeceras de tabla en oración normal y `text-sm`.
- La nota "Horas en formato de 24 horas, hora de Caracas" aparece **una sola vez** en el pie del panel, no en cada página.

### 6.5 Skeletons

- `src/components/skeleton.tsx` (servidor): `Skeleton({ className })` (bloque con clase `.esqueleto`), `SkeletonText({ lines = 3, className })` (barras de ancho decreciente), `SkeletonCircle({ className })` y `SkeletonScreen({ label = "Cargando…", children, className })`, contenedor con `role="status"`, `aria-live="polite"`, `aria-busy="true"` y el texto `label` solo para lectores de pantalla.
- `.esqueleto` en `globals.css`: fondo `marca-100` al 60 %, radio `rounded-control`, brillo suave que recorre de izquierda a derecha en 1.6 s; con movimiento reducido queda estático.
- Cada `loading.tsx` reproduce la silueta real: mismas alturas, mismos radios, mismo número aproximado de filas, mismo ancho máximo. No inventa bloques que la página no tiene. El logo y los textos fijos (títulos de página conocidos) se pintan reales, no como barras.
- Los layouts no bloquean el skeleton: las consultas lentas de un layout (contador de avisos del pasajero, insignia de comprobantes del panel) van dentro de su propio `<Suspense>` para que la estructura y el skeleton aparezcan al instante.
- Las navegaciones que solo cambian `searchParams` (pestañas, filtros, páginas, paneles laterales) envuelven la zona de datos en `<Suspense key={clave de los parámetros} fallback={skeleton de esa zona}>`.

### 6.6 Errores y 404

`src/app/error.tsx`, `src/app/not-found.tsx` y `src/app/global-error.tsx` con el logo, una frase llana ("No encontramos esta página", "Algo salió mal de nuestro lado"), qué hacer y un botón a inicio o "Intentar de nuevo". Se permiten versiones específicas en `/mi` y `/panel` si mejoran la orientación (volver a Mis viajes, volver al tablero).

## 7. Experiencia por rol

### 7.1 Pasajero (móvil primero)

- Portada: héroe morado con el logo blanco, una frase de propósito ("Compra tu pasaje sin hacer cola"), buscador de origen y destino con el botón principal `acento` (amarillo sobre morado), tres pasos ilustrados con icono (Busca, Paga, Viaja), tablero de próximas salidas con precio y puestos, y pie con logo y acceso del personal. Si no hay sesión, el buscador avisa en una línea que se pedirá la cédula para reservar.
- Ingresar y registro: tarjeta centrada con el logo morado, título, campos grandes, un botón principal, enlace claro a la otra opción conservando `next`. Errores por campo.
- `/mi`: saludo, la próxima acción en grande (pagar, subir documento, ver ticket), próximos viajes y avisos. Nada de números sueltos sin contexto.
- Asistente de reserva: `Stepper` visible, un paso por pantalla, resumen del costo siempre visible (tarifa + tasa de salida = total), botón de avance grande abajo. Tras reservar, confirmación con instrucciones de pago.
- Ticket: tarjeta con logo, ruta, fecha y hora grandes, QR grande y el código legible; estado de pago con barra de progreso y la frase de qué falta.
- Estados del pasajero en lenguaje propio (`passengerStatusLabel` en `src/lib/labels.ts`): "Falta pagar", "Revisando tu pago", "Pagado en parte", "Pagado", "Pagas en taquilla", "Puesto liberado", "Cancelada", "Viaje realizado", "No te presentaste". Las etiquetas del panel (`reservationStatusLabel`) no cambian.

### 7.2 Operador de agencia (tablet de mostrador y escritorio)

- Tablero: arriba, "Lo que necesita tu atención" (comprobantes por revisar, salidas que embarcan pronto) con un botón por tarjeta; luego como máximo 4 cifras del periodo; el resto (flota, tickets nuevos, bitácora) debajo en secciones plegables o con "Ver todo".
- Taquilla: flujo guiado de 4 pasos con `Stepper`, botones grandes (`lg`), el total y el vuelto en cifras muy grandes.
- Pasajeros y pagos: pestañas con contador, fila → panel lateral de detalle, acción principal del panel lateral destacada.
- Salidas y abordaje: la hoja de salida muestra solo los botones válidos para su estado (ya existe `availableTripActions`), con `ConfirmDialog` para registrar salida y llegada; el escáner muestra el resultado a pantalla completa en verde o rojo con el nombre del pasajero.

### 7.3 Administrador del terminal (escritorio)

- Misma estructura que el panel de agencia (barra lateral con grupos) en variante `terminal` (morado profundo), para que un administrador que conoce una pantalla conozca la otra.
- Tablero: tasa de salida en vivo destacada, 3–4 cifras, recorridos y usuarios nuevos en tablas con estado vacío útil.
- Agencias y tasas: formularios con `ConfirmDialog` para desactivar una agencia o cambiar una tasa.
- Mensajes: etiquetas y tonos de `labels.ts` (`MESSAGE_STATUS_LABELS`, `messageStatusTone`) en vez de textos propios.

## 8. Glosario de textos de interfaz

| En vez de | Escribe |
|---|---|
| Cupos | Puestos |
| SERIAL | Código del ticket |
| Credenciales inválidas | La cédula o la contraseña no coinciden |
| Pago en sitio | Pagar en la taquilla |
| Tasa de salida (al pasajero) | Tasa del terminal |
| Encolado / Fallido (mensajes) | Usar `MESSAGE_STATUS_LABELS` |
| Exportar CSV | Descargar en Excel (CSV) |
| reserva(s), cuenta(s) | singular o plural según el número |
| C.I. | Cédula |
| Origen: Todos | Cualquier origen |
| min (suelto) | "Sale en 15 min" (`formatRelativeDeparture`) |

Los textos fijados por tests (`labels.ts`, `describeActivity`, `formatRelativeDeparture`, mensajes de error de dominio en `feedback.ts` y en los módulos) **no se cambian** salvo que la tarea actualice sus tests a la vez y lo reporte.

## 9. Fuera de alcance

Modo oscuro, cambios en reglas de negocio, en el esquema de base de datos o en la matriz de permisos, enmascarado por defecto de datos sensibles del admin (queda como recomendación), y el cálculo de dinero del cliente con `number` (queda como deuda registrada).
