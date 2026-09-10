import { NextResponse } from "next/server";
import { currentPanelUser, currentPassenger } from "@/modules/auth";
import { writeAudit } from "@/modules/audit";
import { readUpload } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function contentTypeFor(relativePath: string): string {
  const punto = relativePath.lastIndexOf(".");
  const extension = punto >= 0 ? relativePath.slice(punto).toLowerCase() : "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

type Pasajero = Awaited<ReturnType<typeof currentPassenger>>;
type Panel = Awaited<ReturnType<typeof currentPanelUser>>;

/**
 * Un pasajero accede a sus propios documentos y comprobantes (identificados por
 * su accountId en la ruta), y a los tickets de sus reservas. Un usuario de
 * panel accede a los archivos de reservas y pasajeros de su agencia; el admin
 * del terminal accede a todo, igual que supervisa el resto del sistema.
 */
async function estaAutorizado(
  relativePath: string,
  pasajero: Pasajero,
  panelUser: Panel,
): Promise<boolean> {
  const [kind, ownerId] = relativePath.split("/");

  if (pasajero) {
    if (kind === "documentos" && ownerId === pasajero.id) return true;
    if (kind === "comprobantes" && ownerId === pasajero.id) return true;
    if (kind === "tickets") {
      const ticket = await prisma.ticket.findFirst({
        where: { pdfPath: relativePath, reservation: { accountId: pasajero.id } },
        select: { id: true },
      });
      return Boolean(ticket);
    }
    return false;
  }

  if (panelUser) {
    if (panelUser.role === "ADMIN") return true;
    const agencyId = panelUser.agencyId;
    if (!agencyId) return false;

    if (kind === "documentos") {
      // La sección 18 de la especificación limita al operador: solo puede ver la
      // cédula de un pasajero mientras esa salida concreta está embarcando o en
      // ruta, no de cualquier pasajero de su agencia en cualquier momento.
      const documento = await prisma.passengerDocument.findFirst({
        where: {
          filePath: relativePath,
          account: {
            reservations: {
              some: {
                status: { in: ["PAGADA", "PAGO_EN_SITIO", "ABORDADA"] },
                departure: {
                  route: { agencyId },
                  status: { in: ["MANIFIESTO_CERRADO", "EN_RUTA"] },
                },
              },
            },
          },
        },
        select: { id: true, accountId: true },
      });
      if (!documento) return false;

      await prisma.$transaction((tx) =>
        writeAudit(tx, {
          actorType: "PANEL",
          actorPanelUserId: panelUser.id,
          entityType: "PassengerDocument",
          entityId: documento.id,
          action: "DOCUMENTO_CONSULTADO",
          after: { accountId: documento.accountId, filePath: relativePath },
        }),
      );
      return true;
    }
    if (kind === "comprobantes") {
      const proof = await prisma.paymentProof.findFirst({
        where: { imagePath: relativePath, reservation: { departure: { route: { agencyId } } } },
        select: { id: true },
      });
      return Boolean(proof);
    }
    if (kind === "tickets") {
      const ticket = await prisma.ticket.findFirst({
        where: { pdfPath: relativePath, reservation: { departure: { route: { agencyId } } } },
        select: { id: true },
      });
      return Boolean(ticket);
    }
    return false;
  }

  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");

  const [pasajero, panelUser] = await Promise.all([currentPassenger(), currentPanelUser()]);
  if (!pasajero && !panelUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const autorizado = await estaAutorizado(relativePath, pasajero, panelUser);
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const data = await readUpload(relativePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(relativePath),
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }
}
