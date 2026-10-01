import type { Metadata } from "next";
import Link from "next/link";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { listMessagesForPhone } from "@/modules/messaging";
import { formatCaracasTime24 } from "@/lib/time";
import { EmptyState, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { IconCheckCircle, IconChevronDown, IconChevronRight, IconMessage } from "@/components/icons";
import { dayGroupLabel } from "@/components/passenger-copy";

export const metadata: Metadata = {
  title: "Avisos",
};

/** Mensajes más recientes que se leen; los anteriores no aportan al pasajero. */
const LIMITE_MENSAJES = 20;

/** Mensajes que se ven abiertos: los de los últimos 7 días, como mucho 5. El resto va plegado. */
const DIAS_RECIENTES = 7;
const MAX_ABIERTOS = 5;
const DIA_MS = 24 * 60 * 60 * 1000;

interface MensajeVM {
  id: string;
  text: string;
  at: Date;
  reservationCode: string | null;
}

/** Agrupa los mensajes por día ("Hoy", "Ayer", fecha), conservando el orden recibido. */
function agruparPorDia(mensajes: MensajeVM[], now: Date): { dia: string; mensajes: MensajeVM[] }[] {
  const grupos: { dia: string; mensajes: MensajeVM[] }[] = [];
  for (const mensaje of mensajes) {
    const dia = dayGroupLabel(mensaje.at, now);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) {
      ultimo.mensajes.push(mensaje);
    } else {
      grupos.push({ dia, mensajes: [mensaje] });
    }
  }
  return grupos;
}

/**
 * Avisos del pasajero: primero lo importante ahora de sus viajes y su cuenta
 * (alertas arriba, luego lo informativo, cada aviso con su acción) y después
 * los mensajes que le enviamos, agrupados por día. Abiertos van solo los de
 * los últimos 7 días (como mucho 5); los anteriores, plegados detrás de "Ver
 * mensajes anteriores" (spec, principio 3). El estado técnico de entrega de
 * cada mensaje no se muestra: no le sirve al pasajero.
 */
export default async function AvisosPage() {
  const pasajero = await requirePassenger();
  const now = new Date();

  const [avisos, mensajes] = await Promise.all([
    listNoticesForAccount(pasajero.id),
    listMessagesForPhone(pasajero.phone, LIMITE_MENSAJES),
  ]);

  const todos: MensajeVM[] = mensajes.map((mensaje) => ({
    id: mensaje.id,
    text: mensaje.text,
    at: mensaje.sentAt ?? mensaje.createdAt,
    reservationCode: mensaje.reservationCode,
  }));
  // La consulta ya viene del más nuevo al más viejo: los abiertos son un prefijo de la lista.
  const desde = now.getTime() - DIAS_RECIENTES * DIA_MS;
  let abiertos = 0;
  while (abiertos < Math.min(todos.length, MAX_ABIERTOS) && todos[abiertos]!.at.getTime() >= desde) {
    abiertos += 1;
  }
  const recientes = todos.slice(0, abiertos);
  const anteriores = todos.slice(abiertos);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Avisos</h1>
        <p className="leading-relaxed text-tinta-suave">
          Lo que pasa con tus viajes y tu cuenta, y los mensajes que te enviamos.
        </p>
      </div>

      <section aria-labelledby="lo-importante" className="flex flex-col gap-3">
        <SectionTitle id="lo-importante">Lo importante ahora</SectionTitle>
        {avisos.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {avisos.map((aviso) => (
              <li key={`${aviso.kind}-${aviso.reservationCode ?? "cuenta"}`}>
                <NoticeCard notice={aviso} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconCheckCircle />}
            title="Todo en orden"
            description="No tienes nada pendiente. Si reservas un viaje, aquí te diremos qué sigue."
          />
        )}
      </section>

      <section aria-labelledby="mensajes" className="flex flex-col gap-3">
        <SectionTitle id="mensajes">Mensajes que te enviamos</SectionTitle>
        {todos.length > 0 ? (
          <div className="flex flex-col gap-5">
            {recientes.length > 0 ? (
              <MensajesPorDia mensajes={recientes} now={now} />
            ) : (
              <p className="leading-relaxed text-tinta-suave">No te escribimos en los últimos {DIAS_RECIENTES} días.</p>
            )}
            {anteriores.length > 0 ? (
              <details className="group">
                <summary className="foco inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-control px-1 font-semibold text-marca-700 hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    {anteriores.length === 1 ? "Ver 1 mensaje anterior" : `Ver ${anteriores.length} mensajes anteriores`}
                  </span>
                  <span className="hidden group-open:inline">Ocultar los mensajes anteriores</span>
                  <IconChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <div className="mt-3">
                  <MensajesPorDia mensajes={anteriores} now={now} />
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<IconMessage />}
            title="Aún no hay mensajes"
            description="Cuando reserves o pagues un viaje, te escribiremos para confirmarlo."
          />
        )}
      </section>
    </div>
  );
}

/** Códigos de reserva dentro de un texto ("TR-0930-1PAX-CWNU"). */
const CODIGO_RESERVA = /(\bTR-[A-Z0-9]+(?:-[A-Z0-9]+)*)/g;

/**
 * El texto de un mensaje con cada código de reserva en una sola línea: el
 * navegador no lo parte por los guiones. Los guiones no cambian, así que
 * copiar y buscar el código sigue funcionando.
 */
function TextoConCodigos({ text }: { text: string }) {
  return text.split(CODIGO_RESERVA).map((parte, indice) =>
    // `split` con un grupo deja los códigos en las posiciones impares.
    indice % 2 === 1 ? (
      <span key={indice} className="whitespace-nowrap">
        {parte}
      </span>
    ) : (
      parte
    ),
  );
}

/** Mensajes agrupados por día ("Hoy", "Ayer", fecha), del más nuevo al más viejo. */
function MensajesPorDia({ mensajes, now }: { mensajes: MensajeVM[]; now: Date }) {
  return (
    <div className="flex flex-col gap-5">
      {agruparPorDia(mensajes, now).map((grupo) => (
        <div key={grupo.dia} className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-tinta-suave">{grupo.dia}</h3>
          <ul className="flex flex-col gap-3">
            {grupo.mensajes.map((mensaje) => (
              <li
                key={mensaje.id}
                className="flex gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
              >
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
                >
                  <IconMessage className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="tabular text-sm font-medium text-tinta-suave">{formatCaracasTime24(mensaje.at)}</p>
                  <p className="break-words leading-relaxed text-tinta">
                    <TextoConCodigos text={mensaje.text} />
                  </p>
                  {mensaje.reservationCode ? (
                    // Enlace de texto con flecha, como el pie de NoticeCard: ocho mensajes no
                    // son ocho botones compitiendo con las acciones de "Lo importante ahora".
                    <Link
                      href={`/mi/reservas/${mensaje.reservationCode}`}
                      className="foco -ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-1 font-semibold text-marca-700 hover:underline"
                    >
                      Ver mi viaje
                      <IconChevronRight aria-hidden="true" className="size-5 shrink-0" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
