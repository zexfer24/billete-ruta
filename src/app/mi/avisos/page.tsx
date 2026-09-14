import Link from "next/link";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { listMessagesForPhone } from "@/modules/messaging";
import { formatCaracasDateTime24 } from "@/lib/time";
import { MESSAGE_STATUS_LABELS, messageStatusTone } from "@/lib/labels";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { NoticeCard } from "@/components/notice-card";
import { IconBell, IconCheck } from "@/components/icons";

const LIMITE_MENSAJES = 50;

export default async function AvisosPage() {
  const pasajero = await requirePassenger();

  const [avisos, mensajes] = await Promise.all([
    listNoticesForAccount(pasajero.id),
    listMessagesForPhone(pasajero.phone, LIMITE_MENSAJES),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-tinta">Avisos</h1>
        <p className="mt-1 text-tinta-suave">Lo que necesitas hacer y lo que te hemos enviado</p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle>Pendientes</SectionTitle>
        {avisos.length > 0 ? (
          <div className="flex flex-col gap-3">
            {avisos.map((aviso) => (
              <NoticeCard key={`${aviso.kind}-${aviso.reservationCode ?? "cuenta"}`} notice={aviso} />
            ))}
          </div>
        ) : (
          <Card className="flex items-center gap-3">
            <IconCheck aria-hidden="true" className="shrink-0 text-exito" />
            <p className="text-tinta">Todo en orden. No tienes pendientes.</p>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Mensajes enviados</SectionTitle>
        {mensajes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {mensajes.map((mensaje) => (
              <Card key={mensaje.id} className="flex gap-3">
                <IconBell aria-hidden="true" className="shrink-0 text-marca" />
                <div className="min-w-0 flex-1">
                  <p className="text-tinta">{mensaje.text}</p>
                  <p className="mt-1 text-sm text-tinta-suave">
                    {formatCaracasDateTime24(mensaje.sentAt ?? mensaje.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Pill tone={messageStatusTone(mensaje.status)}>
                      {MESSAGE_STATUS_LABELS[mensaje.status] ?? mensaje.status}
                    </Pill>
                    {mensaje.reservationCode ? (
                      <Link
                        href={`/mi/reservas/${mensaje.reservationCode}`}
                        className="rounded-pastilla text-sm font-semibold text-marca focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
                      >
                        Ver reserva
                      </Link>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-tinta">Todavía no te hemos enviado mensajes.</p>
          </Card>
        )}
      </section>

      <p className="text-sm text-tinta-suave">
        En esta versión los mensajes de WhatsApp no salen a la red; quedan registrados aquí.
      </p>
    </div>
  );
}
