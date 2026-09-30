import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  buildTicketLines,
  loadTicketLogo,
  renderTicketPdf,
  TICKET_LOGO_PATH,
  type TicketPdfData,
} from "@/modules/tickets/pdf";

const LOGO_INEXISTENTE = path.join(process.cwd(), "public", "brand", "no-existe.png");

function ejemplo(overrides: Partial<TicketPdfData> = {}): TicketPdfData {
  return {
    code: "TR-0930-1PAX-SA7D",
    qrPayload: "TR-0930-1PAX-SA7D.ABCDEFGHIJKLMNOP",
    agencyName: "Expresos Los Andes",
    routeName: "Caracas - San Cristóbal",
    origin: "Caracas",
    destination: "San Cristóbal",
    departsAt: new Date("2026-10-01T18:30:00.000Z"),
    meetingPoint: "Terminal La Bandera, andén 3",
    vehiclePlate: "AB123CD",
    passengers: [{ fullName: "María José Pérez Núñez", idNumber: "V12345678" }],
    paymentMethodName: "Pago móvil",
    fareLabel: "$ 25,00",
    taxLabel: "$ 1,00",
    totalLabel: "$ 26,00",
    ...overrides,
  };
}

function esPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

describe("renderTicketPdf", () => {
  it("genera un PDF A5 de una página con el logo de la marca", async () => {
    const pdf = await renderTicketPdf(ejemplo());
    expect(esPdf(pdf)).toBe(true);
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(420);
    expect(Math.round(height)).toBe(595);
    expect(doc.getTitle()).toBe("Ticket TR-0930-1PAX-SA7D");
  });

  it("se genera igual sin el archivo del logo", async () => {
    const conLogo = await renderTicketPdf(ejemplo());
    const sinLogo = await renderTicketPdf(ejemplo(), { logoPath: LOGO_INEXISTENTE });
    expect(esPdf(sinLogo)).toBe(true);
    // El logo embebido es la diferencia de peso entre ambos documentos.
    expect(conLogo.length).toBeGreaterThan(sinLogo.length);
  });

  it("no falla con textos largos ni con caracteres que la fuente no tiene", async () => {
    const pdf = await renderTicketPdf(
      ejemplo({
        agencyName: "Transporte Caribe Internacional de Pasajeros del Occidente 🚌",
        origin: "Santa Bárbara del Zulia → Norte",
        destination: "San Antonio del Táchira, frontera con Colombia",
        meetingPoint:
          "Terminal de pasajeros, andén 12, al lado de la taquilla principal\nfrente al estacionamiento de motos y la entrada de la avenida",
        paymentMethodName: "Transferencia bancaria en bolívares desde cualquier banco nacional",
        passengers: [{ fullName: "Иван Ñandú Çelik 李", idNumber: "E84123456" }],
      }),
    );
    expect(esPdf(pdf)).toBe(true);
  });

  it("lleva a otra página los pasajeros que no caben", async () => {
    const pasajeros = Array.from({ length: 12 }, (_, i) => ({
      fullName: `Pasajero de prueba número ${i + 1}`,
      idNumber: `V${10000000 + i}`,
    }));
    const doc = await PDFDocument.load(await renderTicketPdf(ejemplo({ passengers: pasajeros })));
    expect(doc.getPageCount()).toBe(2);
  });

  it("cabe en una página con el máximo de seis pasajeros por reserva", async () => {
    const pasajeros = Array.from({ length: 6 }, (_, i) => ({
      fullName: `Pasajero ${i + 1}`,
      idNumber: `V${20000000 + i}`,
    }));
    const doc = await PDFDocument.load(await renderTicketPdf(ejemplo({ passengers: pasajeros })));
    expect(doc.getPageCount()).toBe(1);

    // Con un punto de encuentro de dos líneas, las filas se juntan un poco sin partir la lista.
    const largo = await PDFDocument.load(
      await renderTicketPdf(
        ejemplo({
          passengers: pasajeros,
          meetingPoint: "Terminal de pasajeros de San Antonio, andén 12, al lado de la taquilla principal",
        }),
      ),
    );
    expect(largo.getPageCount()).toBe(1);
  });
});

describe("loadTicketLogo", () => {
  it("lee el logo morado de public/brand", async () => {
    const bytes = await loadTicketLogo(TICKET_LOGO_PATH);
    expect(bytes).not.toBeNull();
    // Firma de un archivo PNG.
    expect(Array.from(bytes!.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("devuelve null si el archivo no existe", async () => {
    expect(await loadTicketLogo(LOGO_INEXISTENTE)).toBeNull();
  });
});

describe("buildTicketLines", () => {
  it("usa los textos llanos del glosario y el singular de pasajero", () => {
    const lineas = buildTicketLines(ejemplo());
    expect(lineas).toContain("Código del ticket: TR-0930-1PAX-SA7D");
    expect(lineas).toContain("Tasa del terminal: $ 1,00");
    expect(lineas).toContain("Estado del pago: Pagado");
    expect(lineas).toContain("1 pasajero:");
    expect(lineas).toContain("Salida: 01/10/2026 14:30 (hora de Venezuela, formato de 24 horas)");
  });

  it("usa el plural cuando hay varios pasajeros", () => {
    const lineas = buildTicketLines(
      ejemplo({
        passengers: [
          { fullName: "Ana", idNumber: "V1" },
          { fullName: "Luis", idNumber: "V2" },
        ],
      }),
    );
    expect(lineas).toContain("2 pasajeros:");
  });
});
