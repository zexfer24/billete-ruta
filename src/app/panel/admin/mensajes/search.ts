import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit";
import type { MessageSearch } from "./messages";

/**
 * Filtro de Prisma de una búsqueda de la bandeja. El código de reserva va por
 * la relación con la reserva (`Reservation.code` es único), no por el texto
 * guardado del mensaje. La cédula trae los mensajes de las reservas de esa
 * cuenta y los que llegaron a su teléfono, para incluir los de lista de espera.
 */
export async function messageWhere(search: MessageSearch): Promise<Prisma.OutboundMessageWhereInput> {
  const or: Prisma.OutboundMessageWhereInput[] = [];
  if (search.code) or.push({ reservation: { code: search.code } });
  if (search.phones.length > 0) or.push({ phone: { in: search.phones } });
  if (search.idNumbers.length > 0) {
    const accounts = await prisma.passengerAccount.findMany({
      where: { idNumber: { in: search.idNumbers } },
      select: { id: true, phone: true },
    });
    if (accounts.length > 0) {
      or.push({ reservation: { accountId: { in: accounts.map((a) => a.id) } } });
      or.push({ phone: { in: accounts.map((a) => a.phone) } });
    }
  }
  // Sin ninguna pista que buscar (una cédula sin cuenta), no coincide nada.
  return or.length > 0 ? { OR: or } : { id: { in: [] } };
}

/**
 * Deja en la bitácora la búsqueda de un pasajero concreto en la bandeja: el
 * teléfono, la cédula o la reserva de una persona son datos personales, y
 * cada consulta de ese tipo queda con el nombre del administrador.
 */
export async function auditMessageSearch(panelUserId: string, query: string, total: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: panelUserId,
      entityType: "OutboundMessage",
      entityId: "consulta",
      action: "CONSULTA_MENSAJES",
      after: { filtro: query, resultados: total },
    });
  });
}
