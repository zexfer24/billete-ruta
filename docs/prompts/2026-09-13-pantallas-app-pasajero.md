# Prompt: pantallas de la experiencia del pasajero de TicketRuta

Fecha: 2026-09-13. Rama de referencia: `feat/passenger-app-ui`. Fuente: código real de `src/app/**` y `src/components/**`. Este prompt describe cada pantalla exactamente como está implementada, con textos literales, colores, medidas y estados, para reproducirla en un generador de mockups, en Figma o en un modelo de diseño sin perder detalles.

---

## PROMPT

Eres un diseñador de producto. Vas a producir las pantallas de **TicketRuta**, la app móvil web de un terminal de pasajeros terrestre de Venezuela. Sustituye el registro en papel y el cobro informal por identidad verificada con cédula, pago con comprobante, ticket digital con QR y control de embarque. Dibuja cada pantalla en un marco de teléfono de **390 × 844 px** (iPhone 14), en español con acentos correctos, con los textos exactamente como se indican. Cuando una pantalla tenga variantes, entrega cada variante como una lámina aparte. No inventes elementos que no estén descritos.

### 1. Sistema visual común (aplica a todas las pantallas)

**Referencias de estilo.** Omio para las tarjetas de ticket con muesca lateral, Transit para la pizarra de bloques de color y el raíl vertical de origen y destino.

**Tipografía.** Rubik en pesos 400, 500, 600, 700 y 800. Texto base 16 px. Todas las cifras de dinero, cupos y horas usan dígitos tabulares. Horas siempre en formato de 24 horas (`14:30`), zona de Caracas. Dinero en formato venezolano con coma decimal y espacio tras el signo: `$ 45,00`.

**Colores (tokens).**

| Token | Hex | Uso |
|---|---|---|
| lienzo | `#eef2f7` | Fondo de todas las pantallas |
| marca | `#1e3a8a` | Cabeceras, cabecera del ticket, texto de enlaces, acentos activos |
| marca-oscura | `#172a63` | Texto sobre marca-clara |
| marca-clara | `#dbe6ff` | Fondos suaves, pastillas azules, hover |
| ruta | `#15803d` | Tarjeta de búsqueda verde del paso 1 |
| ruta-oscura | `#166534` | Campos dentro de la tarjeta verde |
| en-vivo | `#16a34a` | Texto "Sale en N min" y barra de progreso |
| cta | `#d93a4f` | Botón primario, punto de la marca, contador de avisos |
| tinta | `#0f172a` | Texto principal |
| tinta-suave | `#475569` | Texto secundario |
| borde | `#e2e2dd` | Bordes de campos y separadores |
| éxito | `#15803d` | Estados positivos |
| alerta | `#b45309` | Estados de atención (ámbar) |
| peligro | `#b91c1c` | Errores y rechazos |

**Colores de agencia.** Cada agencia recibe un bloque de color fijo de esta paleta (texto siempre blanco): rojo `#d41f1f`, azul `#0b62b5`, verde `#2e8b3a`, naranja `#d9581d`, morado `#6b3fa0`, turquesa `#0e8a8a`. Para los ejemplos usa: **Expresos Los Andes = rojo `#d41f1f`, iniciales "ELA"**; **Transporte Caribe = azul `#0b62b5`, iniciales "TC"**.

**Radios.** Tarjetas 20 px. Botones y pastillas completamente redondeados (999 px). Campos de formulario 12 px. Cabecera azul con esquinas inferiores de 28 px.

**Botones.** Alto mínimo 44 px, padding horizontal 20 px, texto semibold 16 px, forma de píldora, icono opcional a la izquierda con separación de 8 px. Variantes:
- `primario`: fondo cta `#d93a4f`, texto blanco.
- `secundario`: fondo blanco, texto marca, borde marca al 20 %.
- `fantasma`: sin fondo, texto marca.
- `ruta`: fondo verde `#15803d`, texto blanco.
- Deshabilitado: opacidad 60 %. Foco: anillo de 2 px color marca con desplazamiento de 2 px.

**Tarjeta (`Card`).** Fondo blanco, radio 20 px, padding 20 px, sombra muy suave.

**Campo de formulario (`Field`).** Etiqueta 14 px medium color tinta encima. Entrada de 44 px de alto, radio 12 px, borde `#e2e2dd`, padding horizontal 16 px, texto 16 px. Al enfocar: borde marca y anillo azul de 2 px. Pista debajo en 14 px tinta-suave. Error debajo en 14 px semibold color peligro y borde del campo en peligro.

**Pastilla de estado (`Pill`).** Píldora con padding 12 × 4 px, texto 14 px semibold. Tonos: `marca` (fondo `#dbe6ff`, texto `#172a63`), `éxito` (fondo verde al 15 %, texto `#15803d`), `alerta` (fondo ámbar al 15 %, texto `#b45309`), `peligro` (fondo rojo al 15 %, texto `#b91c1c`), `neutro` (fondo tinta al 10 %, texto `#475569`).

**Título de sección (`SectionTitle`).** Texto 14 px semibold en MAYÚSCULAS con tracking amplio, color tinta-suave. Opcionalmente una acción a la derecha en 14 px semibold color marca ("Ver todas").

**Iconos.** Set propio de trazo: 24 × 24 px, grosor 2 px, extremos y uniones redondeados, color heredado del texto. Los usados: navegación (triángulo relleno tipo flecha de ubicación), punto relleno, intercambiar (dos flechas verticales opuestas), señal en vivo (tres arcos), campana, triángulo de advertencia, ticket con muesca, QR, documento con líneas, casa, calendario, dos personas, aspa, chevron derecha, chevron abajo, autobús, salir, check, reloj, marcador de mapa.

**Etiquetas de estado de reserva** (texto de pastilla y tono): Pendiente de pago (alerta), En validación (marca), Abonada (marca), Pagada (éxito), Pago en sitio (marca), Liberada (neutro), Cancelada (neutro), Abordada (éxito), No se presentó (neutro).

**Etiquetas de estado de comprobante**: Pendiente de revisión (alerta), Aprobado (éxito), Rechazado (peligro).

**Etiquetas de estado de mensaje**: Encolado (alerta), Enviado / Entregado / Leído (éxito), Fallido (peligro).

### 2. Componentes compuestos reutilizados

**Cabecera de la app (`AppHeader`).** Bloque de fondo marca `#1e3a8a`, texto blanco, esquinas inferiores 28 px, padding horizontal 16 px. Primera línea: punto rojo cta de 6 px seguido de "TicketRuta" en 12 px semibold con tracking amplio, blanco al 80 %. Segunda fila: botón circular de volver de 44 × 44 px con chevron apuntando a la izquierda (solo cuando hay ruta de retorno), título en 24 px extrabold truncado a una línea, subtítulo en 14 px blanco al 80 % con dígitos tabulares (solo en la versión no compacta), y a la derecha hasta dos botones circulares de 44 × 44 px con fondo blanco al 10 % e icono blanco. Versión normal: padding superior 16 px e inferior 24 px. Versión compacta: padding superior 12 px e inferior 16 px, sin subtítulo.

**Barra inferior de navegación (`BottomNav`).** Fija al pie, fondo blanco, borde superior `#e2e2dd`, respeta el área segura inferior. Cuatro destinos de igual ancho y 64 px de alto, cada uno con icono de 24 px arriba y etiqueta de 12 px medium debajo: **Inicio** (casa), **Reservar** (autobús), **Mis viajes** (ticket), **Avisos** (campana). Ítem activo: icono y texto color marca, con una línea de 2 px color marca en el borde superior del ítem, con márgenes laterales de 24 px. Ítems inactivos: tinta-suave. Sobre la campana, cuando hay avisos de nivel alerta, un contador redondo de fondo cta con el número en blanco de 10 px bold, alto 16 px, desplazado arriba a la derecha del icono. En pantallas medianas la barra deja de ser fija y se vuelve una píldora blanca centrada con borde, bajo la cabecera.

**Bloque de agencia (`AgencyBadge`).** Rectángulo de color de la agencia con radio 12 px, iniciales en blanco extrabold, padding horizontal 8 px. Tamaños: sm 32 px de alto y 48 px de ancho mínimo, texto 14 px; md 44 × 64 px, texto 18 px; lg 56 × 80 px, texto 24 px.

**Pizarra de salidas (`DepartureBoard`).** Lista de bloques a ancho completo, apilados sin separación, contenedor con radio 20 px recortado. Cada bloque tiene el color de fondo de su agencia, alto mínimo 96 px, padding 20 × 16 px, texto blanco. Columna izquierda: hora de salida en 36 px extrabold tabular (`14:30`), debajo el destino en 20 px bold precedido por el icono de navegación de 18 px, debajo "Agencia · Origen" en 14 px blanco al 90 % (por ejemplo "Expresos Los Andes · Caracas"). Columna derecha alineada a la derecha: si faltan menos de 60 minutos, icono de señal en vivo y los minutos restantes en 36 px extrabold, con "min" en 14 px debajo; si faltan 60 minutos o más, la hora en 24 px bold tabular. Si no hay salidas: una tarjeta blanca con el texto "No hay salidas en las próximas horas.".

**Fila de salida (`DepartureRow`).** Tarjeta blanca, radio 20 px, padding 16 px. Línea 1 (raíl): punto gris de 8 px, línea horizontal de 1 px `#e2e2dd`, bloque de agencia tamaño md, línea, punto gris, y a la derecha la duración del recorrido en 14 px tinta-suave ("14 h", "5 h 30 min"). Línea 2: a la izquierda el tiempo relativo de salida: "Sale ahora", "Sale en 25 min" (en verde en-vivo, bold, con icono de señal cuando faltan menos de 60 min), "Sale a las 14:30" (mismo día) o "14/09 06:00" (otro día), o "Salió"; a la derecha el precio "$ 45,00" en bold tabular y debajo "12 cupos" en 14 px tinta-suave o "Sin cupo" en color peligro. Línea 3: "Caracas → San Cristóbal · Expresos Los Andes" en 14 px tinta-suave. Opcionalmente un botón de acción alineado a la derecha debajo. Estado seleccionado: anillo de 2 px color marca alrededor de la tarjeta. Si la fila es un enlace, al pasar el cursor el fondo pasa a marca-clara al 40 %.

**Tarjeta de búsqueda (`SearchCard`).** Dos variantes.
- Variante *azul* (portada): tarjeta blanca, radio 20 px, padding 16 px, título "¿Adónde vamos?" en bold color tinta. A la izquierda un raíl vertical color marca: triángulo de navegación de 18 px, línea vertical de 1 px marca al 30 %, punto relleno de 18 px. Al centro dos campos apilados con fondo lienzo `#eef2f7`, radio 12 px, alto 48 px: etiqueta "Origen" / "Destino" en 12 px medium al 80 % y debajo un selector en 16 px semibold cuyo valor por defecto es "Todos". A la derecha, centrado verticalmente, un botón circular de 44 px con fondo lienzo e icono de intercambiar en color marca. Debajo, los hijos (botón "Buscar salidas").
- Variante *verde* (paso 1 de reservar): fondo ruta `#15803d`, sin título, raíl blanco (línea blanca al 50 %), campos con fondo ruta-oscura `#166534` y texto blanco, botón de intercambio ruta-oscura con icono blanco. Debajo, tres pastillas de filtro de tiempo.

**Tarjeta de aviso (`NoticeCard`).** Tarjeta blanca, radio 20 px, padding 16 px, disposición horizontal con separación de 12 px: icono de 24 px a la izquierda según nivel (alerta: triángulo de advertencia en ámbar; info: campana en marca; éxito: check en verde), luego título en bold del mismo color, cuerpo en color tinta, y fecha y hora en 14 px tinta-suave ("13/09/2026 14:30"). Si el aviso enlaza a una reserva, un chevron derecho gris centrado verticalmente al borde derecho.

**Tarjeta de ticket (`TicketCard`).** Contenedor con radio 20 px recortado.
- Cabecera de fondo marca `#1e3a8a`, padding 16 px, texto blanco: a la izquierda "SALIDA" en 11 px con tracking muy amplio al 80 % y debajo la fecha "sáb 13 sep · 14:30" en semibold tabular; a la derecha el icono de autobús. Debajo, alineado a la derecha: "SERIAL " en 11 px normal con tracking amplio al 80 % seguido del código de reserva en monoespaciada 14 px semibold (por ejemplo "TR-8K3M2Q").
- Muesca: línea punteada horizontal de 2 px blanca al 40 % sobre el fondo marca, con dos círculos de 24 px del color del lienzo que sobresalen por el borde izquierdo y derecho, simulando el recorte de un ticket físico.
- Cuerpo blanco con esquinas inferiores de 20 px, padding 16 px: bloque de agencia md, "Caracas → San Cristóbal" en bold, y a la derecha la pastilla de estado de la reserva.
- Tamaño *compacta*: si hay saldo pendiente, debajo "Saldo $ 20,00" en 14 px semibold tinta-suave. Toda la tarjeta es un enlace al detalle.
- Tamaño *grande con ticket emitido*: imagen del código QR de 240 × 240 px centrada debajo de la fila de agencia.
- Tamaño *grande sin ticket*: barra de progreso de 8 px de alto, fondo lienzo, relleno verde éxito con el porcentaje pagado; debajo tres columnas en 14 px con etiquetas tinta-suave y valores bold tabulares: "Total $ 95,00", "Abonado $ 50,00", "Saldo $ 45,00".

**Barra de acciones fija (`StickyActions`).** Barra fija justo encima de la barra de navegación (a 64 px del pie), fondo blanco al 95 % con desenfoque, borde superior, padding 16 × 12 px. Contiene dos botones que reparten el ancho por igual: "Atrás" secundario y el botón de avance primario.

**Indicador de pasos (`StepIndicator`).** Texto "Paso N de 4 · Nombre" en 14 px semibold tinta-suave y debajo cuatro segmentos horizontales de 6 px de alto y radio completo, separados 8 px: el activo en marca, los completados en marca al 60 %, los pendientes en `#e2e2dd`. Nombres: Salida, Pasajeros, Políticas, Pago.

### 3. Datos de ejemplo (úsalos en todas las láminas)

- Pasajera con sesión: **María Pérez**, cédula `V12345678` (en cabecera se muestra enmascarada como `V*****678`), teléfono `0412-1234567`.
- Agencias: **Expresos Los Andes** (rojo, "ELA") y **Transporte Caribe** (azul, "TC").
- Rutas y tarifas: Caracas – San Cristóbal $ 45,00 (14 h, andén 12); Caracas – Mérida $ 40,00 (12 h, andén 8); Caracas – Barinas $ 30,00 (9 h, andén 5); Caracas – Puerto La Cruz $ 25,00 (5 h 30 min, andén 2); Caracas – Cumaná $ 28,00 (7 h, andén 3). Punto de encuentro: "Terminal La Bandera, andén N".
- Tasa de salida del terminal: **$ 2,50 por pasajero**, siempre separada de la tarifa.
- Métodos de pago: Zelle (Digital · USD, datos: titular "Terminal TicketRuta C.A.", correo "pagos@ticketruta.test"); Pago Móvil (Digital · VES, datos: banco "0102 Banco de Venezuela", rif "J-408112233", telefono "0412-1112233"); Binance USDT (Digital · USDT, datos: red "TRC20", wallet "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"); Nequi (Digital · COP, datos: titular "TicketRuta SAS", telefono "300 111 2233"); Efectivo en taquilla (divisas) (En sitio); Bolívares en efectivo (En sitio).
- Código de reserva de ejemplo: `TR-8K3M2Q`. Fecha de referencia: sábado 13 de septiembre de 2026, 13:05.

---

### PANTALLA 1 · Portada `/`

Pantalla pública, sin sesión. Fondo lienzo.

**Bloque superior azul** (fondo marca, sin radio inferior, padding superior 24 px, inferior 32 px, contenido con ancho máximo 448 px y padding lateral 16 px):
1. Marca: punto rojo cta de 8 px y "TicketRuta" en 24 px extrabold blanco.
2. Título H1 en 30 px extrabold blanco: "Reserva tu pasaje en el terminal".
3. Párrafo blanco al 80 %: "Identidad verificada, pago con comprobante y ticket digital con QR".
4. Icono de autobús de 80 × 80 px en blanco al 25 %, como marca de agua decorativa.
5. Tarjeta de búsqueda variante azul con el título "¿Adónde vamos?", campos Origen y Destino en "Todos", botón de intercambio, y debajo un botón primario de ancho completo "Buscar salidas".

**Cuerpo** (padding 16 × 24 px, separación 12 px):
1. Título de sección "PRÓXIMAS SALIDAS".
2. Pizarra de salidas con hasta 6 bloques (solo salidas de las próximas 6 horas con cupo). Ejemplo: bloque rojo `13:30` / ▶ San Cristóbal / "Expresos Los Andes · Caracas" con "25 min" a la derecha en grande con icono de señal; bloque azul `14:00` / ▶ Puerto La Cruz / "Transporte Caribe · Caracas" con "55 min"; bloque rojo `16:00` / ▶ Mérida con `16:00` a la derecha; bloque azul `17:30` / ▶ Cumaná con `17:30`.
3. Tarjeta blanca con margen superior 12 px y tres elementos apilados: botón secundario ancho completo "Ingresar con mi cédula", botón fantasma ancho completo "Crear cuenta", enlace centrado en 14 px tinta-suave "Acceso del personal".

**Variante 1b · Portada con sesión iniciada.** Igual, pero la tarjeta final muestra un único botón primario de ancho completo "Ir a mi cuenta" y debajo el enlace "Acceso del personal". Al tocar un bloque de la pizarra se va directo al asistente de reserva con esa salida preseleccionada.

---

### PANTALLA 2 · Ingresar `/ingresar`

Cabecera compacta con botón de volver (a la portada) y título "Ingresar". Fondo lienzo. Contenido centrado con ancho máximo 448 px y padding 16 × 24 px.

Tarjeta blanca con formulario en columna (separación 16 px):
1. Campo "Cédula", placeholder `V12345678`, enfocado al abrir (borde y anillo marca), teclado en mayúsculas.
2. Campo "Contraseña", tipo contraseña.
3. Botón primario de ancho completo "Ingresar". Mientras envía: "Ingresando..." deshabilitado.
4. Debajo del formulario, texto centrado en 14 px tinta-suave: "¿Todavía no tienes cuenta? " seguido del enlace "Regístrate aquí" en semibold color marca.

**Variante 2b · Error.** Entre la contraseña y el botón, un texto en 14 px semibold color peligro: "Credenciales inválidas." (otros mensajes posibles: "Ingresa tu cédula y tu contraseña." y "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.").

---

### PANTALLA 3 · Crear cuenta `/registro`

Cabecera compacta con botón de volver (a Ingresar) y título "Crear cuenta". Fondo lienzo. Contenido centrado, ancho máximo 448 px.

Tarjeta blanca con formulario (separación 16 px):
1. "Cédula", placeholder `V12345678`.
2. "Nombres".
3. "Apellidos".
4. "Teléfono", placeholder `0412-1234567`, pista debajo: "Con el código de área, por ejemplo 0412-1234567".
5. "Año de nacimiento", numérico.
6. "Contraseña", pista: "Mínimo 8 caracteres".
7. "Confirmar contraseña".
8. Botón primario ancho completo "Crear cuenta". Mientras envía: "Creando cuenta...".
9. Texto centrado 14 px tinta-suave: "¿Ya tienes cuenta? " y enlace "Ingresa aquí" en semibold marca.

**Variante 3b · Error.** Texto en peligro sobre el botón con el mensaje de validación (por ejemplo "Revisa los datos del formulario." o "La cuenta se creó, pero no fue posible iniciar sesión. Intenta ingresar.").

---

### Marco común de las pantallas `/mi/*` (pantallas 4 a 12)

Todas comparten:
- **Cabecera normal** (no compacta), sin botón de volver: título "Hola, María" en 24 px extrabold y subtítulo con la cédula enmascarada `V*****678` en 14 px blanco al 80 %. A la derecha dos botones circulares de 44 px con fondo blanco al 10 %: icono de documento ("Mis documentos") e icono de salir ("Salir").
- **Barra inferior** de cuatro destinos con el ítem de la pantalla actual activo. En el ejemplo, la campana lleva el contador rojo "2".
- **Contenido** con ancho máximo 448 px, padding lateral 16 px, superior 16 px e inferior 112 px para no quedar bajo la barra.

---

### PANTALLA 4 · Inicio `/mi`

Ítem activo: Inicio. Contenido en columna con separación 24 px.

1. **Avisos** (solo si existen; máximo 3 tarjetas, separación 12 px). Ejemplo: tarjeta de alerta con triángulo ámbar, título "Falta la foto de tu cédula", cuerpo "Carga la foto de tu cédula para poder completar una reserva.", hora "13/09/2026 13:05", chevron a la derecha; tarjeta de alerta "Tu reserva está por liberarse" con cuerpo "Faltan 45 min para que se libere el cupo si no completas el pago." y chevron. Si hay más de 3 avisos, debajo un enlace centrado en 14 px semibold marca: "Ver todos los avisos".
2. Título de sección "TU PRÓXIMO VIAJE" y debajo una **tarjeta de ticket compacta** enlazada al detalle: cabecera azul con "SALIDA" / "sáb 13 sep · 16:00", icono de bus, "SERIAL TR-8K3M2Q"; muesca; cuerpo con bloque rojo "ELA", "Caracas → Mérida", pastilla "Abonada" (tono marca) y "Saldo $ 45,00".
   - **Variante 4b · sin viaje próximo:** tarjeta blanca con el texto "Todavía no tienes viajes próximos." y un botón primario "Reservar un puesto" alineado a la izquierda.
3. Título de sección "PRÓXIMAS SALIDAS" con la acción "Ver todas" a la derecha en color marca, y debajo la **pizarra de salidas** con hasta 5 bloques (próximas 6 horas, solo con cupo), cada uno enlazando al asistente de reserva con la salida preseleccionada. Vacía: "No hay salidas en las próximas horas.".

---

### PANTALLA 5 · Reservar, paso 1 "Salida" `/mi/reservar`

Ítem activo: Reservar. Encabezado de página: H1 "Reservar un puesto" en 24 px extrabold color tinta y debajo "Elige tu salida, agrega a tus acompañantes y paga o abona en línea." en tinta-suave. Contenido con padding inferior extra de 96 px.

1. Indicador de pasos: "Paso 1 de 4 · Salida", primer segmento en marca, los otros tres en gris.
2. **Tarjeta de búsqueda verde**: raíl blanco, campos "Origen" y "Destino" con fondo verde oscuro y texto blanco (valor "Todos" o el filtro que llegó por URL), botón circular de intercambio verde oscuro. Debajo tres pastillas de filtro de tiempo de 44 px de alto con texto semibold tinta: "Salir ahora", "Hoy", "Todas". La activa tiene fondo blanco sólido con anillo blanco de 2 px; las demás fondo blanco al 90 %. Por defecto está activa "Todas".
3. Lista de salidas agrupada en secciones con título de sección: **"PRÓXIMAS"** (salen en menos de 60 min), **"HOY"** (hoy pero en 60 min o más) y **"OTROS DÍAS"**. Cada salida es una **fila de salida** con un botón de acción abajo a la derecha: botón primario "Elegir" si hay cupo, o botón secundario "Lista de espera" si dice "Sin cupo".
   - Ejemplo en PRÓXIMAS: raíl con bloque rojo "ELA" y "14 h"; "Sale en 25 min" en verde con icono de señal; "$ 45,00" y "12 cupos"; "Caracas → San Cristóbal · Expresos Los Andes"; botón "Elegir".
   - Ejemplo en HOY: bloque azul "TC" y "5 h 30 min"; "Sale a las 17:30"; "$ 25,00" y "Sin cupo" en rojo; "Caracas → Puerto La Cruz · Transporte Caribe"; botón "Lista de espera".
   - Ejemplo en OTROS DÍAS: bloque rojo "ELA" y "12 h"; "14/09 06:00"; "$ 40,00" y "30 cupos"; "Caracas → Mérida · Expresos Los Andes"; botón "Elegir".
4. **Variante 5b · sin resultados:** en lugar de la lista, tarjeta blanca con "No hay salidas con ese filtro." y botón fantasma "Ver todas" (restablece filtros y tiempo).
5. **Variante 5c · sin salidas en el sistema:** no se muestra el asistente; solo el encabezado y una tarjeta con texto 14 px tinta-suave: "No hay salidas disponibles por ahora. Vuelve a intentarlo más tarde.".

Sin barra de acciones fija en este paso: elegir una salida avanza directamente al paso 2.

---

### PANTALLA 6 · Reservar, paso 2 "Pasajeros"

Mismo encabezado de página. Indicador "Paso 2 de 4 · Pasajeros" (segmento 1 en marca al 60 %, segmento 2 en marca).

1. **Fila de salida seleccionada** con anillo de 2 px marca (misma información que en el paso 1, sin botón).
2. Selector "Cantidad de pasajeros (máximo 6)" en 14 px medium tinta, ancho máximo 320 px, con lista desplegable de 1 a N (N es el menor entre 6 y los cupos disponibles). Valor de ejemplo: 2.
3. Si hay más de un pasajero, subtítulo "Acompañantes" en semibold y una tarjeta blanca por acompañante con título "Acompañante 1" en semibold y tres campos: "Nombre completo", "Cédula" (mayúsculas automáticas; error inline "Cédula inválida." si el formato no es válido), "Año de nacimiento" (numérico; error inline "Año inválido.").
4. **Variante 6b · viaja un menor:** debajo de los acompañantes, tarjeta blanca con borde ámbar de 1 px y texto 14 px ámbar: "Viaja un menor de edad: recuerda cargar el permiso de viaje en Documentos." donde "Documentos" es un enlace subrayado semibold.
5. **Barra de acciones fija:** "Atrás" (secundario) y "Continuar" (primario). "Continuar" queda deshabilitado hasta que todos los acompañantes tengan nombre de al menos 3 caracteres, cédula válida y año válido.

**Variante 6c · salida sin cupo (lista de espera).** En lugar del selector y los acompañantes, un formulario en tarjeta blanca con borde ámbar: texto 14 px ámbar "Esta salida no tiene cupo disponible en este momento. Puedes anotarte en la lista de espera.", selector "Cantidad de pasajeros" de 1 a 6, botón primario "Unirme a la lista de espera" (mientras envía: "Enviando…") y, si falla, texto en peligro. Tras enviar con éxito, la tarjeta se reemplaza por otra con borde verde y texto verde: "Te anotamos en la lista de espera. Te avisaremos si se libera un puesto.". La barra fija sigue mostrando "Atrás" y "Continuar" deshabilitado.

---

### PANTALLA 7 · Reservar, paso 3 "Políticas"

Indicador "Paso 3 de 4 · Políticas".

1. Fila de salida seleccionada con anillo marca.
2. Tarjeta blanca con lista de viñetas en 14 px tinta-suave, separación 8 px:
   - "El puesto se libera automáticamente si no registras ningún pago dentro de las dos horas siguientes a la creación de la reserva."
   - "Si elegiste pago en sitio, debes reconfirmar la reserva hasta 12 horas antes de la salida o se liberará el cupo."
   - "El ticket digital se emite únicamente cuando el saldo de la reserva llega a cero."
   - "Tus datos personales y los de tus acompañantes se usan solo para gestionar esta reserva, verificar tu identidad en el terminal y comunicarte novedades del viaje; no se comparten con terceros ajenos a la operación del terminal."
3. Casilla de verificación de 24 × 24 px con acento marca, alineada arriba, y texto 14 px tinta: "He leído y acepto las políticas de cancelación, liberación de cupo y manejo de mis datos personales."
4. Barra de acciones fija: "Atrás" y "Continuar" (deshabilitado hasta marcar la casilla).

---

### PANTALLA 8 · Reservar, paso 4 "Pago"

Indicador "Paso 4 de 4 · Pago" (tres segmentos en marca al 60 %, el cuarto en marca).

1. Fila de salida seleccionada con anillo marca.
2. Subtítulo "Método de pago" en semibold. Lista vertical (separación 12 px) de opciones de radio, cada una en una tarjeta blanca con radio 20 px, padding 16 px, borde `#e2e2dd`, alto mínimo 44 px: radio circular de 20 px con acento marca a la izquierda, nombre del método en semibold, y a la derecha una pastilla: "Digital · USD" (tono marca) para métodos digitales o "En sitio" (tono neutro) para métodos físicos. La opción marcada lleva borde marca y anillo de 2 px marca. Ejemplo de lista: Zelle (Digital · USD), Pago Móvil (Digital · VES), Binance USDT (Digital · USDT), Nequi (Digital · COP), Efectivo en taquilla (divisas) (En sitio), Bolívares en efectivo (En sitio). Los métodos "En sitio" solo aparecen si faltan 12 horas o más para la salida.
   - Si no hay métodos: texto 14 px tinta-suave "No hay métodos de pago disponibles para esta salida.".
3. **Variante 8a · método digital seleccionado (Pago Móvil):** debajo de la lista, tarjeta blanca en 14 px con título "Datos de cobro" en semibold y una lista de pares clave-valor, clave en tinta-suave a la izquierda y valor en medium a la derecha: banco / 0102 Banco de Venezuela; rif / J-408112233; telefono / 0412-1112233.
4. **Variante 8b · método en sitio seleccionado:** tarjeta blanca con borde ámbar y texto 14 px ámbar: "Tu reserva quedará condicional hasta que la agencia registre el cobro en sitio. Debes reconfirmarla antes de las 12 horas previas a la salida o se liberará el cupo.".
5. Tarjeta blanca "Desglose" (título semibold) con una cuadrícula de dos columnas en 14 px tabular: "Tarifa por pasajero" $ 45,00; "Tasa de salida por pasajero" $ 2,50; "Pasajeros" 2; "Total" en 24 px extrabold $ 95,00. Debajo, nota en 12 px tinta-suave: "Tarifa total $ 90,00 + tasa de salida total $ 5,00.".
6. Si el servidor rechaza: texto en peligro sobre la barra.
7. Barra de acciones fija: "Atrás" y "Confirmar reserva" (deshabilitado hasta elegir método; mientras envía: "Confirmando…"). Al confirmar se navega al detalle de la reserva creada.

---

### PANTALLA 9 · Mis viajes `/mi/reservas`

Ítem activo: Mis viajes. Contenido en columna con separación 24 px.

1. H1 "Mis viajes" en 24 px extrabold tinta.
2. Fila de dos pestañas con forma de botón y padding horizontal 20 px: "Próximos" y "Pasados". La activa es un botón primario rojo; la inactiva, secundario blanco. Por defecto activa "Próximos".
3. Lista vertical (separación 16 px) de **tarjetas de ticket compactas**, cada una enlazando a su detalle, ordenadas por creación descendente. Ejemplos: "sáb 13 sep · 16:00", SERIAL TR-8K3M2Q, ELA, "Caracas → Mérida", pastilla "Abonada", "Saldo $ 45,00"; "lun 15 sep · 06:00", SERIAL TR-2P9XLA, TC, "Caracas → Cumaná", pastilla "Pagada"; "mar 16 sep · 22:00", SERIAL TR-7QW41N, ELA, "Caracas → San Cristóbal", pastilla "Pendiente de pago", "Saldo $ 95,00".
4. **Variante 9b · pestaña Pasados:** mismas tarjetas con estados finales, por ejemplo pastilla "Abordada" (éxito), "Liberada" (neutro) o "No se presentó" (neutro).
5. **Variante 9c · lista vacía:** tarjeta blanca centrada con texto tinta-suave "Todavía no tienes viajes próximos." (o "Todavía no tienes viajes pasados.") y botón primario "Reservar un puesto".

---

### PANTALLA 10 · Detalle de reserva `/mi/reservas/[código]`

Ítem activo: Mis viajes. Contenido en columna con separación 24 px.

1. Enlace "← Mis viajes" en 14 px medium color marca y debajo H1 "Reserva TR-8K3M2Q" en 24 px extrabold monoespaciada.
2. **Tarjeta de ticket grande.**
   - **Variante 10a · ticket emitido (estado Pagada):** cabecera azul, muesca, fila con bloque de agencia, ruta y pastilla "Pagada" en verde, imagen QR de 240 × 240 px centrada y debajo un botón secundario de ancho completo con icono de documento y texto "Descargar PDF".
   - **Variante 10b · pagada pero ticket aún en generación:** sin QR; debajo de la fila, una pastilla ámbar: "El ticket se está generando; vuelve en unos minutos.".
   - **Variante 10c · con saldo pendiente (Abonada, En validación, Pendiente de pago o Pago en sitio):** sin QR; barra de progreso verde con el porcentaje pagado y tres columnas "Total $ 95,00 · Abonado $ 50,00 · Saldo $ 45,00".
3. Tarjeta blanca con título de sección "DATOS DEL VIAJE" y una cuadrícula de dos columnas en 14 px: cada dato con etiqueta en 12 px mayúsculas tracking amplio tinta-suave y valor medium tabular debajo. Datos: "AGENCIA" Expresos Los Andes; "PUNTO DE ENCUENTRO" Terminal La Bandera, andén 8; "PASAJEROS" 2; "HORA DE SALIDA" 13/09/2026 16:00.
4. Título de sección "PASAJEROS" y una lista de filas blancas con radio 20 px y padding 16 px: icono de dos personas, nombre en medium ("María Pérez") y, en la titular, pastilla "Titular" en tono marca. Segunda fila: "Carlos Pérez" sin pastilla.
5. Título de sección "HISTORIAL DE PAGOS". Si no hay: texto 14 px tinta-suave "Todavía no hay pagos registrados.". Si hay, lista de filas blancas:
   - Comprobante: "$ 50,00 — referencia 4471920" en medium a la izquierda y pastilla a la derecha ("Aprobado" verde, "Pendiente de revisión" ámbar o "Rechazado" rojo). Si está rechazado y hay motivo, debajo en color peligro: "Motivo: la referencia no coincide.".
   - Cobro en efectivo: "Cobro en sitio por $ 25,00 el 12/09/2026 09:40".
6. **Sección "Abonar o completar el pago"** (solo si hay saldo mayor que cero y la reserva no está liberada ni cancelada): tarjeta blanca con título de sección, el saldo en 24 px extrabold tabular ("$ 45,00") y debajo "Saldo pendiente" en 14 px tinta-suave. Luego el **formulario de comprobante**:
   - Selector "Método de pago" con opciones "Zelle (USD)", "Pago Móvil (VES)", "Binance USDT (USDT)", "Nequi (COP)" (solo digitales).
   - Tarjeta con fondo marca-clara en 14 px: "Datos de cobro" en semibold y pares clave-valor del método elegido.
   - Campo "Monto pagado" (decimal, mínimo 0,01).
   - Campo "Referencia" (mínimo 4 caracteres).
   - Campo de archivo "Imagen del comprobante" (JPG, PNG o WebP) en caja de 44 px con radio 12 px.
   - Error opcional en peligro.
   - Botón primario de ancho completo "Enviar comprobante" (mientras envía: "Enviando…").
   - **Variante 10d · comprobante enviado:** el formulario se reemplaza por una tarjeta con borde verde: icono check y texto semibold verde "Comprobante enviado. La agencia lo revisará y te avisaremos por WhatsApp." más un botón fantasma "Enviar otro comprobante".
   - **Variante 10e · sin métodos digitales:** texto 14 px tinta-suave "No hay métodos de pago digitales disponibles en este momento. Contacta a la agencia.".

---

### PANTALLA 11 · Mis documentos `/mi/documentos`

Se abre desde el icono de documento de la cabecera. Ningún ítem de la barra inferior queda activo. Contenido en columna con separación 32 px.

1. H1 "Mis documentos" en 24 px extrabold y párrafo tinta-suave: "La foto de tu cédula es obligatoria para concretar una reserva. El permiso de viaje solo hace falta si en el grupo viaja un menor de edad.".
2. Mensajes opcionales bajo el encabezado: tarjeta blanca con borde peligro y texto peligro (por ejemplo "Selecciona un archivo." o "Tipo de documento inválido.") o tarjeta con borde verde y texto verde "Documento cargado correctamente.".
3. Cuadrícula de dos **tarjetas de estado** (una columna en móvil): cada una con borde de 2 px, icono de documento en marca, título en bold, pastilla de estado y, si está cargado, "Cargado el 10/09/2026 18:22" en 14 px tinta-suave.
   - "Foto de cédula": borde ámbar y pastilla ámbar "Obligatorio" si falta; borde verde y pastilla verde "Cargado" si existe.
   - "Permiso de viaje": borde transparente y pastilla neutra "Opcional" si falta; borde verde y "Cargado" si existe.
4. Tarjeta blanca "Cargar documento" (título bold) con formulario: selector "Tipo de documento" con opciones "Foto de cédula" (por defecto) y "Permiso de viaje"; campo de archivo "Archivo" con botón interno en píldora de fondo marca-clara y texto marca-oscura ("Elegir archivo"), pista "JPG, PNG o WebP de hasta 5 MB"; botón primario "Cargar documento".
5. Si hay documentos, título de sección "DOCUMENTOS CARGADOS" y una tarjeta por documento: icono de documento en marca con el nombre del tipo en bold, "Cargado el 10/09/2026 18:22" en 14 px tinta-suave y la imagen del documento con radio 12 px, borde `#e2e2dd`, ajustada al ancho y altura máxima de 192 px.

---

### PANTALLA 12 · Avisos `/mi/avisos`

Ítem activo: Avisos. Contenido en columna con separación 32 px.

1. H1 "Avisos" en 24 px extrabold y debajo "Lo que necesitas hacer y lo que te hemos enviado" en tinta-suave.
2. Título de sección "PENDIENTES" y lista de tarjetas de aviso ordenadas por nivel (alerta, info, éxito) y luego por fecha. Los seis tipos posibles, con sus textos exactos:
   - Alerta "Falta la foto de tu cédula" — "Carga la foto de tu cédula para poder completar una reserva." (enlaza a Documentos).
   - Alerta "Tu reserva está por liberarse" — "Faltan 45 min para que se libere el cupo si no completas el pago." (o "Faltan 1 h 20 min…").
   - Alerta "Tu comprobante fue rechazado" — "No pudimos validar tu comprobante. Motivo: la referencia no coincide." (sin motivo: "No pudimos validar tu comprobante. Carga uno nuevo para continuar.").
   - Alerta "Reconfirma tu pago en sitio" — "Tu viaje Caracas → Cumaná sale el 14/09/2026 06:00. Reconfirma o el cupo se liberará.".
   - Info "Tu comprobante está en validación" — "Estamos revisando tu comprobante. Te avisaremos cuando se confirme el pago.".
   - Éxito "Tu ticket está listo" — "Caracas → Mérida, sale el 13/09/2026 16:00. Presenta el código QR al abordar.".
   - **Variante 12b · sin pendientes:** tarjeta blanca horizontal con icono check verde y texto "Todo en orden. No tienes pendientes.".
3. Título de sección "MENSAJES ENVIADOS" y lista de tarjetas (hasta 50): icono de campana en marca a la izquierda; texto del mensaje en tinta (por ejemplo "TicketRuta: recibimos tu comprobante de $ 50,00 para la reserva TR-8K3M2Q. Te avisaremos cuando la agencia lo valide."); fecha y hora en 14 px tinta-suave "13/09/2026 12:48"; fila con pastilla de estado del mensaje ("Enviado" verde, "Encolado" ámbar, "Fallido" rojo) y, si aplica, enlace "Ver reserva" en 14 px semibold marca.
   - **Variante 12c · sin mensajes:** tarjeta con "Todavía no te hemos enviado mensajes.".
4. Al pie, nota en 14 px tinta-suave: "En esta versión los mensajes de WhatsApp no salen a la red; quedan registrados aquí.".

---

### PANTALLA 13 · Lista de espera `/lista-espera/[token]`

Pantalla que abre el pasajero desde el enlace del mensaje cuando se libera un puesto. Sin barra inferior. Fondo lienzo. Contenido centrado, ancho máximo 448 px, padding 16 × 24 px, separación 16 px.

**Variante 13a · puesto disponible.** Cabecera compacta sin botón de volver, título "Lista de espera" (el subtítulo "¡Hay un puesto para ti!" existe pero no se muestra en la versión compacta). Contenido:
1. Fila de salida de la ruta liberada: raíl con bloque de agencia (sin nombre de agencia en el texto), duración, "Sale a las 17:30" o fecha, precio "$ 25,00", cupos igual a los puestos reservados ("2 cupos"), y "Caracas → Puerto La Cruz · " sin nombre de agencia al final.
2. Tarjeta blanca: "Puestos: 2" en semibold y debajo "Reserva antes de: 13/09/2026 15:05" en 14 px tinta-suave tabular.
3. Botón primario de ancho completo "Reservar este puesto" (lleva al asistente con la salida y la cantidad preseleccionadas).

**Variante 13b · enlace vencido.** Cabecera compacta "Lista de espera". Tarjeta blanca centrada: título "Enlace vencido" en 20 px bold, párrafo tinta-suave "Este aviso de lista de espera ya no está vigente. Si todavía te interesa el puesto, vuelve a intentarlo desde la reserva." y enlace "Ir a reservar" en semibold color marca.

---

### 4. Lista de láminas a entregar

1. Portada sin sesión · 1b Portada con sesión
2. Ingresar · 2b Ingresar con error
3. Crear cuenta · 3b Crear cuenta con error
4. Inicio con avisos y próximo viaje · 4b Inicio sin viaje próximo
5. Reservar paso 1 con las tres secciones · 5b Sin resultados · 5c Sin salidas
6. Reservar paso 2 con dos pasajeros · 6b Con aviso de menor · 6c Lista de espera (formulario y confirmación)
7. Reservar paso 3 Políticas (casilla sin marcar y marcada)
8. Reservar paso 4 · 8a Digital con datos de cobro · 8b En sitio con advertencia
9. Mis viajes Próximos · 9b Pasados · 9c Vacío
10. Detalle con QR (10a) · Ticket en generación (10b) · Con saldo y formulario (10c) · Comprobante enviado (10d) · Sin métodos digitales (10e)
11. Mis documentos sin cédula cargada · con ambos documentos cargados y galería
12. Avisos con los seis tipos y mensajes · 12b Sin pendientes · 12c Sin mensajes
13. Lista de espera vigente (13a) · Enlace vencido (13b)

Mantén la misma cabecera, barra inferior, tipografía y paleta en todas las láminas. No añadas ilustraciones, fotografías de personas ni elementos decorativos que no estén descritos.
