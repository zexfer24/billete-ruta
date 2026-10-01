import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { enqueueMessage, listMessagesForPhone } from "@/modules/messaging";
import { disconnect, resetDatabase } from "../setup";

const TELEFONO_UNO = "+584121111111";
const TELEFONO_DOS = "+584122222222";

beforeEach(resetDatabase);
afterAll(disconnect);

describe("listMessagesForPhone", () => {
  it("devuelve solo los mensajes del teléfono indicado, del más reciente al más antiguo", async () => {
    await prisma.$transaction(async (tx) => {
      await enqueueMessage(tx, {
        phone: TELEFONO_UNO,
        templateKey: "solicitud_recibida",
        payload: {
          nombre: "Ana",
          pasajeros: "1",
          serial: "TR-0913-1PAX-AAAA",
          ruta: "Caracas → Mérida",
          salida: "13/09/2026 22:00",
          limite: "13/09/2026 14:00",
        },
        scheduledFor: new Date(Date.now() - 60_000),
      });
    });
    await prisma.$transaction(async (tx) => {
      await enqueueMessage(tx, {
        phone: TELEFONO_UNO,
        templateKey: "ticket_emitido",
        payload: {
          nombre: "Ana",
          serial: "TR-0913-1PAX-AAAA",
          ruta: "Caracas → Mérida",
          salida: "13/09/2026 22:00",
          punto: "Andén 3",
        },
      });
    });
    await prisma.$transaction(async (tx) => {
      await enqueueMessage(tx, {
        phone: TELEFONO_DOS,
        templateKey: "solicitud_recibida",
        payload: {
          nombre: "Luis",
          pasajeros: "1",
          serial: "TR-0913-1PAX-BBBB",
          ruta: "Caracas → Mérida",
          salida: "13/09/2026 22:00",
          limite: "13/09/2026 14:00",
        },
      });
    });

    const mensajes = await listMessagesForPhone(TELEFONO_UNO);

    expect(mensajes).toHaveLength(2);
    expect(mensajes[0]?.templateKey).toBe("ticket_emitido");
    expect(mensajes[1]?.templateKey).toBe("solicitud_recibida");
    for (const mensaje of mensajes) {
      expect(mensaje.text.length).toBeGreaterThan(0);
      expect(mensaje.text).not.toBe(mensaje.templateKey);
    }
  });

  it("usa el propio templateKey como texto cuando no es una plantilla conocida", async () => {
    await prisma.outboundMessage.create({
      data: {
        phone: TELEFONO_UNO,
        templateKey: "plantilla_desconocida",
        payload: {},
      },
    });

    const [mensaje] = await listMessagesForPhone(TELEFONO_UNO);
    expect(mensaje?.text).toBe("plantilla_desconocida");
  });

  it("no lanza con un payload histórico incompleto y rellena lo que falta", async () => {
    await prisma.outboundMessage.create({
      data: {
        phone: TELEFONO_UNO,
        templateKey: "reserva_condicional",
        payload: { nombre: "Ana", serial: "TR-0001" },
      },
    });

    const [mensaje] = await listMessagesForPhone(TELEFONO_UNO);
    expect(mensaje?.text).toContain("Ana");
    // En pantalla el código lleva separadores invisibles para no partirse por el guion.
    expect(mensaje?.text.replaceAll("⁠", "")).toContain("TR-0001");
  });
});
