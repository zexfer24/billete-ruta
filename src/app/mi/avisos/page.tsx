import type { Metadata } from "next";
import Link from "next/link";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { listMessagesForPhone } from "@/modules/messaging";
import { formatCaracasTime24 } from "@/lib/time";
import { EmptyState, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { IconCheckCircle, IconChevronRight, IconMessage } from "@/components/icons";
import { dayGroupLabel } from "@/components/passenger-copy";

export const metadata: Metadata = {
  title: "Avisos",
};

/** Mensajes más recientes que se muestran; los anteriores no aportan al pasajero. */
const LIMITE_MENSAJES = 20;

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
 * los mensajes que le enviamos, agrupados por día. El estado
 * técnico de entrega de cada mensaje no se muestra: no le sirve al pasajero.
 */
export default async function AvisosPage() {
  const pasajero = await requirePassenger();
  const now = new Date();

  const [avisos, mensajes] = await Promise.all([
    listNoticesForAccount(pasajero.id),
    listMessagesForPhone(pasajero.phone, LIMITE_MENSAJES),
  ]);

  const grupos = agruparPorDia(
    mensajes.map((mensaje) => ({
      id: mensaje.id,
      text: mensaje.text,
      at: mensaje.sentAt ?? mensaje.createdAt,
      reservationCode: mensaje.reservationCode,
    })),
    now,
  );

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
        {grupos.length > 0 ? (
          <div className="flex flex-col gap-5">
            {grupos.map((grupo) => (
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
                        <p className="tabular text-sm font-medium text-tinta-suave">
                          {formatCaracasTime24(mensaje.at)}
                        </p>
                        <p className="break-words leading-relaxed text-tinta">{mensaje.text}</p>
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
