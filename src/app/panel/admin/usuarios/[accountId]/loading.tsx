import { SkeletonScreen } from "@/components/skeleton";
import { ProfileSkeleton } from "./profile-skeleton";

/** Silueta del perfil de un pasajero: cabecera con avatar, cifras, datos, documentos y la tabla de viajes. */
export default function PassengerProfileLoading() {
  return (
    <SkeletonScreen label="Cargando el perfil del pasajero…" className="flex flex-col gap-6">
      <ProfileSkeleton />
    </SkeletonScreen>
  );
}
