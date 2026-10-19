import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Alert } from "@/components/alert";
import { IconArrowLeft } from "@/components/icons";
import { requirePanelUser } from "@/modules/auth";
import { getPassengerProfile } from "@/modules/reports";
import { AuditNote } from "../../_shared/lists";
import { ProfileDocuments } from "./profile-documents";
import { ProfileHeader } from "./profile-header";
import { ProfileCompanionTrips, ProfilePayments, ProfileTrips } from "./profile-history";
import { ProfilePersonal } from "./profile-personal";
import { ProfileFrequent, ProfileStats } from "./profile-summary";

/**
 * Título fijo: ni el nombre ni la cédula van en el título de la pestaña, porque
 * quedaría en el historial del navegador.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { title: "Perfil de pasajero" };
}

const paramsSchema = z.object({ accountId: z.string().uuid() });

/**
 * Perfil interno de un pasajero, para el administrador del terminal: sus
 * datos, sus fotos, sus viajes y sus pagos. `getPassengerProfile` deja la
 * consulta en la bitácora de auditoría, igual que la base de datos de usuarios.
 */
export default async function PassengerProfilePage({ params }: { params: Promise<{ accountId: string }> }) {
  const user = await requirePanelUser("terminal.users");
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const profile = await getPassengerProfile(parsed.data.accountId, user.id);
  if (!profile) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/panel/admin/usuarios"
        className="foco -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-marca-700 transition-colors duration-150 hover:bg-marca-50 motion-reduce:transition-none"
      >
        <IconArrowLeft className="size-5 shrink-0" />
        Volver a usuarios
      </Link>

      <ProfileHeader profile={profile} />

      <Alert tone="alerta" role="none" title="Información sensible">
        Esta ficha reúne datos personales del pasajero. La consulta quedó registrada con tu nombre.
      </Alert>

      <ProfileStats summary={profile.summary} />
      <ProfilePersonal account={profile.account} />
      <ProfileDocuments documents={profile.documents} />
      <ProfileFrequent summary={profile.summary} />
      <ProfileTrips trips={profile.trips} />
      <ProfileCompanionTrips trips={profile.companionTrips} />
      <ProfilePayments payments={profile.payments} />

      <AuditNote>Esta consulta quedó registrada con tu nombre, porque muestra datos personales.</AuditNote>
    </div>
  );
}
