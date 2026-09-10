import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { formatCaracasDateTime24 } from "@/lib/time";

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

/** Líneas de texto del ticket, expuestas aparte para poder verificarlas en tests. */
export function buildTicketLines(data: TicketPdfData): string[] {
  return [
    "TERMINAL DE PASAJEROS — TicketRuta",
    data.agencyName,
    `Serial: ${data.code}`,
    `Ruta: ${data.routeName}`,
    `Trayecto: ${data.origin} → ${data.destination}`,
    `Salida: ${formatCaracasDateTime24(data.departsAt)} (hora de Venezuela)`,
    `Punto de encuentro: ${data.meetingPoint}`,
    `Unidad: ${data.vehiclePlate}`,
    `Método de pago: ${data.paymentMethodName}`,
    `Pasajeros (${data.passengers.length}):`,
    ...data.passengers.map((p, i) => `  ${i + 1}. ${p.fullName} — ${p.idNumber}`),
    `Tarifa: ${data.fareLabel}`,
    `Tasa de salida: ${data.taxLabel}`,
    `Total pagado: ${data.totalLabel}`,
    "Presenta este código QR al abordar.",
  ];
}

/** Genera el ticket en A5 vertical con el código QR firmado. */
export async function renderTicketPdf(data: TicketPdfData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  // A5 vertical en puntos.
  const page = doc.addPage([419.53, 595.28]);
  const { width, height } = page.getSize();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const tinta = rgb(0.11, 0.11, 0.1);
  const suave = rgb(0.42, 0.42, 0.39);
  const acento = rgb(0.11, 0.31, 0.85);

  const margen = 32;
  let y = height - margen;

  page.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: rgb(0.96, 0.96, 0.95),
  });

  page.drawText("TERMINAL DE PASAJEROS", {
    x: margen,
    y: y - 16,
    size: 9,
    font: regular,
    color: suave,
  });
  page.drawText("TicketRuta", { x: margen, y: y - 38, size: 20, font: bold, color: tinta });
  page.drawText(data.agencyName, {
    x: margen,
    y: y - 54,
    size: 10,
    font: regular,
    color: acento,
  });

  y = height - 92;

  // Código QR firmado.
  const qrDataUrl = await QRCode.toDataURL(data.qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
  const qrImage = await doc.embedPng(Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64"));
  const qrSize = 118;
  page.drawImage(qrImage, { x: width - margen - qrSize, y: y - qrSize, width: qrSize, height: qrSize });

  page.drawText("SERIAL DEL TICKET", { x: margen, y, size: 8, font: regular, color: suave });
  page.drawText(data.code, { x: margen, y: y - 20, size: 15, font: bold, color: tinta });

  y -= 44;
  const campos: Array<[string, string]> = [
    ["Ruta", data.routeName],
    ["Trayecto", `${data.origin} - ${data.destination}`],
    ["Salida", `${formatCaracasDateTime24(data.departsAt)} (hora de Venezuela)`],
  ];
  for (const [etiqueta, valor] of campos) {
    page.drawText(etiqueta, { x: margen, y, size: 8, font: regular, color: suave });
    page.drawText(valor, { x: margen, y: y - 13, size: 10, font: bold, color: tinta });
    y -= 32;
  }

  y = height - 92 - qrSize - 22;

  const camposAnchos: Array<[string, string]> = [
    ["Punto de encuentro", data.meetingPoint],
    ["Unidad", data.vehiclePlate],
    ["Método de pago", data.paymentMethodName],
  ];
  for (const [etiqueta, valor] of camposAnchos) {
    page.drawText(etiqueta, { x: margen, y, size: 8, font: regular, color: suave });
    page.drawText(valor.slice(0, 60), { x: margen, y: y - 13, size: 10, font: bold, color: tinta });
    y -= 30;
  }

  page.drawLine({
    start: { x: margen, y: y + 6 },
    end: { x: width - margen, y: y + 6 },
    thickness: 0.7,
    color: rgb(0.86, 0.86, 0.84),
  });
  y -= 14;

  page.drawText(`PASAJEROS (${data.passengers.length})`, {
    x: margen,
    y,
    size: 8,
    font: regular,
    color: suave,
  });
  y -= 16;
  for (const [indice, pasajero] of data.passengers.entries()) {
    page.drawText(`${indice + 1}. ${pasajero.fullName}`, {
      x: margen,
      y,
      size: 10,
      font: regular,
      color: tinta,
    });
    page.drawText(pasajero.idNumber, {
      x: width - margen - 90,
      y,
      size: 10,
      font: bold,
      color: tinta,
    });
    y -= 15;
  }

  y -= 8;
  page.drawLine({
    start: { x: margen, y: y + 6 },
    end: { x: width - margen, y: y + 6 },
    thickness: 0.7,
    color: rgb(0.86, 0.86, 0.84),
  });
  y -= 12;

  const montos: Array<[string, string, boolean]> = [
    ["Tarifa", data.fareLabel, false],
    ["Tasa de salida", data.taxLabel, false],
    ["Total", data.totalLabel, true],
  ];
  for (const [etiqueta, valor, destacado] of montos) {
    page.drawText(etiqueta, {
      x: margen,
      y,
      size: destacado ? 11 : 9,
      font: destacado ? bold : regular,
      color: destacado ? tinta : suave,
    });
    page.drawText(valor, {
      x: width - margen - 100,
      y,
      size: destacado ? 11 : 9,
      font: destacado ? bold : regular,
      color: tinta,
    });
    y -= destacado ? 20 : 15;
  }

  page.drawText("Presenta este código QR al abordar.", {
    x: margen,
    y: margen + 8,
    size: 8,
    font: regular,
    color: suave,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
