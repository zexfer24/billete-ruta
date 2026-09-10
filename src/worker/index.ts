import { formatCaracasDateTime24 } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { deliverPendingMessages } from "@/modules/messaging";
import { runSweeps } from "./sweeps";

const SWEEP_INTERVAL_MS = 5 * 60_000;
const DELIVER_INTERVAL_MS = 60_000;

function log(mensaje: string): void {
  process.stdout.write(`[${formatCaracasDateTime24(new Date())}] ${mensaje}\n`);
}

let corriendo = true;

async function ciclo(nombre: string, intervalo: number, tarea: () => Promise<string>) {
  while (corriendo) {
    try {
      const resumen = await tarea();
      if (resumen) log(`${nombre}: ${resumen}`);
    } catch (error) {
      log(`${nombre} falló: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalo));
  }
}

async function main(): Promise<void> {
  log("Worker de TicketRuta iniciado. Barridos cada 5 min, entrega cada minuto.");

  const barridos = ciclo("Barrido", SWEEP_INTERVAL_MS, async () => {
    const r = await runSweeps(new Date());
    const total =
      r.expiredUnpaid +
      r.reminders24h +
      r.released12h +
      r.confirmations2h +
      r.waitlistExpired +
      r.departuresClosed;
    if (total === 0) return "";
    return [
      `${r.expiredUnpaid} sin pago liberadas`,
      `${r.reminders24h} recordatorios`,
      `${r.released12h} pagos en sitio liberados`,
      `${r.confirmations2h} confirmaciones`,
      `${r.waitlistExpired} avisos vencidos`,
      `${r.departuresClosed} manifiestos cerrados`,
    ].join(", ");
  });

  const entregas = ciclo("Entrega", DELIVER_INTERVAL_MS, async () => {
    const r = await deliverPendingMessages(new Date());
    if (r.sent === 0 && r.failed === 0) return "";
    return `${r.sent} enviados, ${r.failed} con error`;
  });

  const apagar = async (senal: string) => {
    log(`Recibida ${senal}, cerrando el worker.`);
    corriendo = false;
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void apagar("SIGINT"));
  process.on("SIGTERM", () => void apagar("SIGTERM"));

  await Promise.all([barridos, entregas]);
}

void main();
