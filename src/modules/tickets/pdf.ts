import { readFile } from "node:fs/promises";
import path from "node:path";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import {
  LineCapStyle,
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import { BUSINESS_TZ, formatCaracasDateTime24, formatCaracasTime24 } from "@/lib/time";

export interface TicketPassenger {
  fullName: string;
  idNumber: string;
}

export interface TicketPdfData {
  code: string;
  qrPayload: string;
  agencyName: string;
  routeName: string;
  origin: string;
  destination: string;
  departsAt: Date;
  meetingPoint: string;
  vehiclePlate: string;
  passengers: TicketPassenger[];
  paymentMethodName: string;
  fareLabel: string;
  taxLabel: string;
  totalLabel: string;
}

/** Opciones de dibujo del PDF. Solo existen para poder probar la degradación sin logo. */
export interface TicketPdfOptions {
  /** Ruta del PNG del logo. Por defecto, `public/brand/logo-morado-1200.png` del proyecto. */
  logoPath?: string;
}

/** Ruta del logo morado, resuelta desde la raíz del proyecto (Next y el worker arrancan ahí). */
export const TICKET_LOGO_PATH = path.join(process.cwd(), "public", "brand", "logo-morado-1200.png");

/** Estado de pago que muestra el ticket: solo se emite cuando el saldo llega a cero. */
const PAYMENT_STATE_LABEL = "Pagado";
const BOARDING_HINT = "Muestra este código QR al abordar.";

/** "1 pasajero", "3 pasajeros": singular o plural según el número. */
function passengerCountLabel(count: number): string {
  return count === 1 ? "1 pasajero" : `${count} pasajeros`;
}

/** Fecha de salida en palabras, en hora de Caracas: "Miércoles 30 de septiembre de 2026". */
function departureDateWords(date: Date): { weekday: string; date: string } {
  const weekday = formatInTimeZone(date, BUSINESS_TZ, "EEEE", { locale: es });
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    date: formatInTimeZone(date, BUSINESS_TZ, "d 'de' MMMM 'de' yyyy", { locale: es }),
  };
}

/** Líneas de texto del ticket, expuestas aparte para poder verificarlas en tests. */
export function buildTicketLines(data: TicketPdfData): string[] {
  return [
    "TicketRuta — Terminal de pasajeros",
    data.agencyName,
    `Código del ticket: ${data.code}`,
    `Desde: ${data.origin}`,
    `Hasta: ${data.destination}`,
    `Ruta: ${data.routeName}`,
    `Salida: ${formatCaracasDateTime24(data.departsAt)} (hora de Venezuela, formato de 24 horas)`,
    `Estado del pago: ${PAYMENT_STATE_LABEL}`,
    `Punto de encuentro: ${data.meetingPoint}`,
    `Unidad: ${data.vehiclePlate}`,
    `Método de pago: ${data.paymentMethodName}`,
    `${passengerCountLabel(data.passengers.length)}:`,
    ...data.passengers.map((p, i) => `  ${i + 1}. ${p.fullName} — Cédula ${p.idNumber}`),
    `Tarifa: ${data.fareLabel}`,
    `Tasa del terminal: ${data.taxLabel}`,
    `Total pagado: ${data.totalLabel}`,
    BOARDING_HINT,
  ];
}

// ---------------------------------------------------------------------------
// Paleta de marca (spec §3). El PDF no lee CSS, así que replica los valores.
// ---------------------------------------------------------------------------

function hex(value: string): RGB {
  const n = Number.parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const COLOR = {
  marca: rgb(96 / 255, 29 / 255, 191 / 255), // marca-600 #601DBF
  marca50: hex("#F6F2FD"),
  marca200: hex("#D9C7F7"),
  tinta: hex("#1A1530"),
  tintaSuave: hex("#57526B"),
  borde: hex("#E3DFEC"),
  exito: hex("#137A46"),
  exitoSuave: hex("#E6F4EC"),
  blanco: rgb(1, 1, 1),
};

// A5 vertical en puntos.
const PAGE_WIDTH = 419.53;
const PAGE_HEIGHT = 595.28;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT = PAGE_WIDTH - MARGIN;
/** Línea base más baja que puede ocupar el contenido sin pisar el pie. */
const CONTENT_FLOOR = MARGIN + 26;
/** Separación normal entre filas de pasajeros y la mínima legible para no partir la lista. */
const ROW_STEP = 14;
const ROW_STEP_COMPACT = 11.5;

// ---------------------------------------------------------------------------
// Texto seguro para las fuentes estándar (WinAnsi) y medidas.
// ---------------------------------------------------------------------------

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  /** Caracteres que las fuentes estándar pueden dibujar. */
  charset: Set<number>;
}

/**
 * Deja solo caracteres que Helvetica puede codificar: colapsa espacios y saltos
 * de línea, quita tildes que no existan en la fuente y cambia lo demás por "?".
 * Así un nombre con un carácter raro nunca impide emitir el ticket.
 */
function safeText(value: string, fonts: Fonts): string {
  let salida = "";
  for (const char of value.replace(/\s+/g, " ").trim()) {
    const code = char.codePointAt(0) ?? 0;
    if (fonts.charset.has(code)) {
      salida += char;
      continue;
    }
    const base = char.normalize("NFD").replace(/\p{M}/gu, "");
    const baseCode = base.codePointAt(0);
    salida += base.length === 1 && baseCode !== undefined && fonts.charset.has(baseCode) ? base : "?";
  }
  return salida;
}

/** Recorta el texto con puntos suspensivos para que quepa en el ancho indicado. */
function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length > 0 && font.widthOfTextAtSize(`${chars.join("").trimEnd()}…`, size) > maxWidth) {
    chars.pop();
  }
  return chars.length > 0 ? `${chars.join("").trimEnd()}…` : "";
}

/** Tamaño de letra más grande, entre `max` y `min`, con el que el texto cabe completo. */
function fitSize(text: string, font: PDFFont, max: number, min: number, maxWidth: number): number {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

/** Parte el texto en líneas por palabras; la última se recorta si no alcanza. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lineas: string[] = [];
  let actual = "";
  const palabras = text.split(" ").filter(Boolean);
  for (const [indice, palabra] of palabras.entries()) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(candidata, size) <= maxWidth || !actual) {
      actual = candidata;
      continue;
    }
    if (lineas.length === maxLines - 1) {
      // Última línea permitida: se queda con todo lo que falta y fitText la recorta.
      actual = [actual, ...palabras.slice(indice)].join(" ");
      break;
    }
    lineas.push(actual);
    actual = palabra;
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, maxLines).map((linea) => fitText(linea, font, size, maxWidth));
}

function textRight(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  right: number,
  y: number,
  color: RGB,
): void {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color });
}

/** Rectángulo de esquinas redondeadas con su esquina inferior izquierda en (x, y). */
function roundedRect(
  page: PDFPage,
  box: { x: number; y: number; width: number; height: number; radius: number },
  style: { color?: RGB; borderColor?: RGB; borderWidth?: number },
): void {
  const { x, y, width: w, height: h } = box;
  const r = Math.min(box.radius, w / 2, h / 2);
  // drawSvgPath usa coordenadas de SVG: origen arriba a la izquierda y el eje y hacia abajo.
  const d = [
    `M ${r} 0`,
    `H ${w - r}`,
    `Q ${w} 0 ${w} ${r}`,
    `V ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `H ${r}`,
    `Q 0 ${h} 0 ${h - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    "Z",
  ].join(" ");
  page.drawSvgPath(d, { x, y: y + h, ...style });
}

function divider(page: PDFPage, y: number): void {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 0.8,
    color: COLOR.borde,
  });
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

const logoCache = new Map<string, Uint8Array>();

/**
 * Lee el PNG del logo. Devuelve `null` si el archivo no existe o no se puede leer:
 * el ticket se emite igual, sin logo. Solo se guardan en memoria las lecturas exitosas.
 */
export async function loadTicketLogo(filePath: string = TICKET_LOGO_PATH): Promise<Uint8Array | null> {
  const cached = logoCache.get(filePath);
  if (cached) return cached;
  try {
    const bytes = new Uint8Array(await readFile(filePath));
    logoCache.set(filePath, bytes);
    return bytes;
  } catch {
    return null;
  }
}

async function embedLogo(doc: PDFDocument, filePath: string): Promise<PDFImage | null> {
  const bytes = await loadTicketLogo(filePath);
  if (!bytes) return null;
  try {
    return await doc.embedPng(bytes);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Piezas de la página
// ---------------------------------------------------------------------------

function drawAccentBar(page: PDFPage): void {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 6, width: PAGE_WIDTH, height: 6, color: COLOR.marca });
}

function drawFooter(page: PDFPage, fonts: Fonts, pageNumber: number, totalPages: number): void {
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 14 },
    end: { x: RIGHT, y: MARGIN + 14 },
    thickness: 0.8,
    color: COLOR.borde,
  });
  const marca = "TicketRuta";
  page.drawText(marca, { x: MARGIN, y: MARGIN, size: 9, font: fonts.bold, color: COLOR.marca });
  page.drawText(" · Terminal de pasajeros", {
    x: MARGIN + fonts.bold.widthOfTextAtSize(marca, 9),
    y: MARGIN,
    size: 9,
    font: fonts.regular,
    color: COLOR.tintaSuave,
  });
  if (totalPages > 1) {
    textRight(
      page,
      `Página ${pageNumber} de ${totalPages}`,
      fonts.regular,
      9,
      RIGHT,
      MARGIN,
      COLOR.tintaSuave,
    );
  }
}

/** Etiqueta pequeña y valor en negrita debajo; devuelve la línea base del siguiente bloque. */
function drawField(
  page: PDFPage,
  fonts: Fonts,
  field: { label: string; value: string; x: number; y: number; width: number; maxLines: number },
): number {
  page.drawText(field.label, {
    x: field.x,
    y: field.y,
    size: 9,
    font: fonts.regular,
    color: COLOR.tintaSuave,
  });
  const lineas = wrapText(field.value || "—", fonts.bold, 11, field.width, field.maxLines);
  lineas.forEach((linea, indice) => {
    page.drawText(linea, {
      x: field.x,
      y: field.y - 13 - indice * 13,
      size: 11,
      font: fonts.bold,
      color: COLOR.tinta,
    });
  });
  return field.y - 13 - (lineas.length - 1) * 13 - 17;
}

/** Cabecera de la lista de pasajeros; devuelve la línea base de la primera fila. */
function drawPassengerHeading(page: PDFPage, fonts: Fonts, title: string, y: number): number {
  page.drawText(title, { x: MARGIN, y, size: 11, font: fonts.bold, color: COLOR.tinta });
  textRight(page, "Cédula", fonts.regular, 9, RIGHT, y, COLOR.tintaSuave);
  return y - 17;
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

/**
 * Genera el ticket en A5 vertical con la marca y el código QR firmado.
 * Jerarquía: ruta y hora de salida en grande, QR grande, código del ticket legible
 * con el estado del pago, detalles, pasajeros y pie del terminal. Si los pasajeros
 * no caben, la lista sigue en una página de continuación.
 */
export async function renderTicketPdf(
  data: TicketPdfData,
  options: TicketPdfOptions = {},
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Ticket ${data.code}`);
  doc.setAuthor("TicketRuta · Terminal de pasajeros");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { regular, bold, charset: new Set(regular.getCharacterSet()) };
  const t = (value: string) => safeText(value, fonts);

  const logo = await embedLogo(doc, options.logoPath ?? TICKET_LOGO_PATH);

  // Código QR firmado: el contenido es exactamente `qrPayload`.
  const qrDataUrl = await QRCode.toDataURL(data.qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
  });
  const qrImage = await doc.embedPng(Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64"));

  const pages: PDFPage[] = [];
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  drawAccentBar(page);

  // --- Cabecera: logo, título, agencia y terminal ---------------------------
  const logoTop = PAGE_HEIGHT - 22;
  const logoHeight = 52;
  let textX = MARGIN;
  if (logo) {
    const logoWidth = (logoHeight * logo.width) / logo.height;
    page.drawImage(logo, { x: MARGIN, y: logoTop - logoHeight, width: logoWidth, height: logoHeight });
    textX = MARGIN + logoWidth + 14;
  }
  const headerWidth = RIGHT - textX;
  page.drawText("Ticket de viaje", {
    x: textX,
    y: logoTop - 17,
    size: 18,
    font: bold,
    color: COLOR.tinta,
  });
  page.drawText(fitText(t(data.agencyName), bold, 12, headerWidth), {
    x: textX,
    y: logoTop - 34,
    size: 12,
    font: bold,
    color: COLOR.marca,
  });
  page.drawText("Terminal de pasajeros", {
    x: textX,
    y: logoTop - 48,
    size: 10,
    font: regular,
    color: COLOR.tintaSuave,
  });
  divider(page, PAGE_HEIGHT - 86);

  // --- Cuerpo: ruta y salida a la izquierda, QR a la derecha ---------------
  const bodyTop = PAGE_HEIGHT - 100;

  const qrSize = 136;
  const qrPadding = 10;
  const qrBox = qrSize + qrPadding * 2;
  const qrBoxX = RIGHT - qrBox;
  roundedRect(
    page,
    { x: qrBoxX, y: bodyTop - qrBox, width: qrBox, height: qrBox, radius: 12 },
    { color: COLOR.blanco, borderColor: COLOR.borde, borderWidth: 1 },
  );
  page.drawImage(qrImage, {
    x: qrBoxX + qrPadding,
    y: bodyTop - qrBox + qrPadding,
    width: qrSize,
    height: qrSize,
  });
  const hint = fitText(BOARDING_HINT, regular, 9, qrBox);
  page.drawText(hint, {
    x: qrBoxX + (qrBox - regular.widthOfTextAtSize(hint, 9)) / 2,
    y: bodyTop - qrBox - 14,
    size: 9,
    font: regular,
    color: COLOR.tintaSuave,
  });

  const leftWidth = qrBoxX - 18 - MARGIN;
  const routeX = MARGIN + 18;
  const routeWidth = leftWidth - 18;
  const origin = t(data.origin);
  const destination = t(data.destination);
  const placeSize = Math.min(
    fitSize(origin, bold, 20, 13, routeWidth),
    fitSize(destination, bold, 20, 13, routeWidth),
  );

  page.drawText("Desde", { x: routeX, y: bodyTop - 9, size: 9, font: regular, color: COLOR.tintaSuave });
  page.drawText(fitText(origin, bold, placeSize, routeWidth), {
    x: routeX,
    y: bodyTop - 29,
    size: placeSize,
    font: bold,
    color: COLOR.tinta,
  });
  page.drawText("Hasta", { x: routeX, y: bodyTop - 47, size: 9, font: regular, color: COLOR.tintaSuave });
  page.drawText(fitText(destination, bold, placeSize, routeWidth), {
    x: routeX,
    y: bodyTop - 67,
    size: placeSize,
    font: bold,
    color: COLOR.tinta,
  });
  // Marcador del trayecto: punto lleno en el origen, anillo en el destino.
  const markerX = MARGIN + 5;
  page.drawLine({
    start: { x: markerX, y: bodyTop - 27 },
    end: { x: markerX, y: bodyTop - 58 },
    thickness: 1.5,
    color: COLOR.marca200,
  });
  page.drawCircle({ x: markerX, y: bodyTop - 22, size: 4.5, color: COLOR.marca });
  page.drawCircle({
    x: markerX,
    y: bodyTop - 61,
    size: 4,
    color: COLOR.blanco,
    borderColor: COLOR.marca,
    borderWidth: 1.8,
  });
  page.drawText(fitText(`Ruta: ${t(data.routeName)}`, regular, 9, routeWidth), {
    x: routeX,
    y: bodyTop - 83,
    size: 9,
    font: regular,
    color: COLOR.tintaSuave,
  });

  const fecha = departureDateWords(data.departsAt);
  page.drawText("Salida", { x: MARGIN, y: bodyTop - 104, size: 9, font: regular, color: COLOR.tintaSuave });
  page.drawText(formatCaracasTime24(data.departsAt), {
    x: MARGIN,
    y: bodyTop - 131,
    size: 30,
    font: bold,
    color: COLOR.tinta,
  });
  page.drawText(fitText(t(fecha.weekday), bold, 11, leftWidth), {
    x: MARGIN,
    y: bodyTop - 147,
    size: 11,
    font: bold,
    color: COLOR.tinta,
  });
  page.drawText(fitText(t(fecha.date), regular, 11, leftWidth), {
    x: MARGIN,
    y: bodyTop - 161,
    size: 11,
    font: regular,
    color: COLOR.tinta,
  });
  page.drawText(fitText("Hora de Venezuela, formato de 24 horas", regular, 9, leftWidth), {
    x: MARGIN,
    y: bodyTop - 174,
    size: 9,
    font: regular,
    color: COLOR.tintaSuave,
  });

  // --- Franja: código del ticket y estado del pago -------------------------
  const stripHeight = 46;
  const stripY = bodyTop - 184 - stripHeight;
  roundedRect(
    page,
    { x: MARGIN, y: stripY, width: CONTENT_WIDTH, height: stripHeight, radius: 12 },
    { color: COLOR.marca50 },
  );
  const pillText = PAYMENT_STATE_LABEL;
  const pillHeight = 26;
  const pillWidth = 12 + 11 + 6 + bold.widthOfTextAtSize(pillText, 11) + 12;
  const pillX = RIGHT - 12 - pillWidth;
  const pillY = stripY + (stripHeight - pillHeight) / 2;
  roundedRect(
    page,
    { x: pillX, y: pillY, width: pillWidth, height: pillHeight, radius: pillHeight / 2 },
    { color: COLOR.exitoSuave },
  );
  page.drawSvgPath("M 0 5.5 L 3.8 9.2 L 11 1.8", {
    x: pillX + 12,
    y: pillY + pillHeight / 2 + 5.5,
    borderColor: COLOR.exito,
    borderWidth: 1.8,
    borderLineCap: LineCapStyle.Round,
  });
  page.drawText(pillText, {
    x: pillX + 12 + 11 + 6,
    y: pillY + 9,
    size: 11,
    font: bold,
    color: COLOR.exito,
  });

  const codeWidth = pillX - 14 - (MARGIN + 14);
  page.drawText("Código del ticket", {
    x: MARGIN + 14,
    y: stripY + 29,
    size: 9,
    font: regular,
    color: COLOR.tintaSuave,
  });
  const code = t(data.code);
  const codeSize = fitSize(code, bold, 17, 12, codeWidth);
  page.drawText(fitText(code, bold, codeSize, codeWidth), {
    x: MARGIN + 14,
    y: stripY + 11,
    size: codeSize,
    font: bold,
    color: COLOR.tinta,
  });

  // --- Detalles a la izquierda y montos a la derecha -----------------------
  const detailsTop = stripY - 18;
  const amountsWidth = 150;
  const amountsX = RIGHT - amountsWidth;
  const detailsWidth = amountsX - 24 - MARGIN;

  let leftY = detailsTop;
  leftY = drawField(page, fonts, {
    label: "Punto de encuentro",
    value: t(data.meetingPoint),
    x: MARGIN,
    y: leftY,
    width: detailsWidth,
    maxLines: 2,
  });
  leftY = drawField(page, fonts, {
    label: "Unidad (placa)",
    value: t(data.vehiclePlate),
    x: MARGIN,
    y: leftY,
    width: detailsWidth,
    maxLines: 1,
  });
  leftY = drawField(page, fonts, {
    label: "Método de pago",
    value: t(data.paymentMethodName),
    x: MARGIN,
    y: leftY,
    width: detailsWidth,
    maxLines: 2,
  });

  let rightY = detailsTop;
  const montos: Array<[string, string]> = [
    ["Tarifa", t(data.fareLabel)],
    ["Tasa del terminal", t(data.taxLabel)],
  ];
  for (const [etiqueta, valor] of montos) {
    const valorAncho = regular.widthOfTextAtSize(valor, 10);
    page.drawText(fitText(etiqueta, regular, 10, amountsWidth - valorAncho - 8), {
      x: amountsX,
      y: rightY,
      size: 10,
      font: regular,
      color: COLOR.tintaSuave,
    });
    textRight(page, valor, regular, 10, RIGHT, rightY, COLOR.tinta);
    rightY -= 17;
  }
  page.drawLine({
    start: { x: amountsX, y: rightY + 8 },
    end: { x: RIGHT, y: rightY + 8 },
    thickness: 0.8,
    color: COLOR.borde,
  });
  rightY -= 6;
  const total = t(data.totalLabel);
  const totalAncho = bold.widthOfTextAtSize(total, 12);
  page.drawText(fitText("Total pagado", bold, 12, amountsWidth - totalAncho - 8), {
    x: amountsX,
    y: rightY,
    size: 12,
    font: bold,
    color: COLOR.tinta,
  });
  textRight(page, total, bold, 12, RIGHT, rightY, COLOR.tinta);
  rightY -= 22;

  // --- Pasajeros (siguen en otra página si no caben) -----------------------
  let current = page;
  let y = Math.min(leftY, rightY) + 6;
  divider(current, y);
  y -= 16;
  y = drawPassengerHeading(current, fonts, passengerCountLabel(data.passengers.length), y);

  // Si faltan pocos puntos, se juntan un poco las filas antes que partir la lista.
  const restantes = data.passengers.length - 1;
  const disponible = y - CONTENT_FLOOR;
  let rowStep = ROW_STEP;
  if (restantes > 0 && restantes * ROW_STEP > disponible && restantes * ROW_STEP_COMPACT <= disponible) {
    rowStep = disponible / restantes;
  }

  for (const [indice, pasajero] of data.passengers.entries()) {
    if (y < CONTENT_FLOOR - 0.01) {
      current = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(current);
      drawAccentBar(current);
      current.drawText("Ticket de viaje · continuación", {
        x: MARGIN,
        y: PAGE_HEIGHT - 40,
        size: 14,
        font: bold,
        color: COLOR.tinta,
      });
      current.drawText(fitText(`Código del ticket: ${code}`, regular, 10, CONTENT_WIDTH), {
        x: MARGIN,
        y: PAGE_HEIGHT - 56,
        size: 10,
        font: regular,
        color: COLOR.tintaSuave,
      });
      divider(current, PAGE_HEIGHT - 70);
      y = drawPassengerHeading(current, fonts, "Pasajeros (continuación)", PAGE_HEIGHT - 90);
      rowStep = ROW_STEP;
    }
    const numero = `${indice + 1}.`;
    const cedula = t(pasajero.idNumber);
    const cedulaAncho = bold.widthOfTextAtSize(cedula, 10);
    current.drawText(numero, { x: MARGIN, y, size: 10, font: regular, color: COLOR.tintaSuave });
    current.drawText(fitText(t(pasajero.fullName), regular, 10, CONTENT_WIDTH - 18 - cedulaAncho - 12), {
      x: MARGIN + 18,
      y,
      size: 10,
      font: regular,
      color: COLOR.tinta,
    });
    textRight(current, cedula, bold, 10, RIGHT, y, COLOR.tinta);
    y -= rowStep;
  }

  pages.forEach((p, indice) => drawFooter(p, fonts, indice + 1, pages.length));

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
