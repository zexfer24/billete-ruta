import type { ReactNode } from "react";
import { Alert } from "@/components/alert";
import { IconArrowLeft, IconBuilding, IconBus, IconCash, IconMapPin, IconTicket } from "@/components/icons";
import { Skeleton, SkeletonCircle } from "@/components/skeleton";
import { cx } from "@/components/ui-classes";
import { skeletonColumns, TableSkeleton } from "../../_shared/skeletons";
import { TRIP_COLUMNS } from "./profile-history";
import { SUMMARY_GRID_CLASS, SUMMARY_LAST_CELL_CLASS } from "./profile-summary";

const CARD = "rounded-tarjeta border border-borde bg-superficie shadow-1";

/** Celdas de la tabla de viajes en la silueta: fecha y hora, ruta, agencia, unidad, estado, montos, código y horas. */
const TRIP_SKELETON_COLUMNS = skeletonColumns(TRIP_COLUMNS, [
  { lines: ["w-12", "w-20"] },
  { lines: ["w-28"] },
  { lines: ["w-20"], badge: true },
  { lines: ["w-16", "w-24"] },
  { lines: ["w-16"], pill: true },
  { lines: ["w-24"] },
  { lines: ["w-16", "w-20"] },
  { lines: ["w-20", "w-20"] },
]);

function StatSkeleton({ label, icon, className }: { label: string; icon: ReactNode; className?: string }) {
  return (
    <li aria-hidden="true" className={cx("min-w-0", className)}>
      <div className={cx(CARD, "relative flex h-full flex-col overflow-hidden p-5")}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-tinta-suave">{label}</p>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-5">
            {icon}
          </span>
        </div>
        <Skeleton className="mt-1 h-9 w-20" />
      </div>
    </li>
  );
}

function SectionTitleSkeleton({ title }: { title: string }) {
  return (
    <p aria-hidden="true" className="text-lg font-semibold text-tinta">
      {title}
    </p>
  );
}

/**
 * Silueta del perfil de un pasajero (spec 6.5): la cabecera con su avatar
 * circular, la advertencia y los títulos de sección reales, las cinco cifras,
 * las tarjetas de datos y de documentos y la tabla de viajes.
 */
export function ProfileSkeleton() {
  return (
    <>
      <span
        aria-hidden="true"
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-[15px] font-semibold text-tinta-suave"
      >
        <IconArrowLeft className="size-5 shrink-0" />
        Volver a usuarios
      </span>

      <div
        aria-hidden="true"
        className={cx(CARD, "flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6")}
      >
        <SkeletonCircle className="size-16 sm:size-24" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-3/4 max-w-sm rounded-pastilla" />
            <Skeleton className="h-5 w-2/3 max-w-xs rounded-pastilla" />
          </div>
          <Skeleton className="h-7 w-40 rounded-pastilla" />
          <Skeleton className="h-11 w-36" />
        </div>
      </div>

      <div aria-hidden="true">
        <Alert tone="alerta" role="none" title="Datos personales">
          Esta ficha reúne datos sensibles del pasajero. La consulta quedó registrada con tu nombre.
        </Alert>
      </div>

      <ul className={SUMMARY_GRID_CLASS}>
        <StatSkeleton label="Tickets pagados" icon={<IconTicket />} />
        <StatSkeleton label="Viajes realizados" icon={<IconBus />} />
        <StatSkeleton label="Destinos distintos" icon={<IconMapPin />} />
        <StatSkeleton label="Agencias" icon={<IconBuilding />} />
        <StatSkeleton label="Total pagado" icon={<IconCash />} className={SUMMARY_LAST_CELL_CLASS} />
      </ul>

      <div className="flex flex-col gap-3">
        <SectionTitleSkeleton title="Datos personales" />
        <div aria-hidden="true" className={cx(CARD, "p-5")}>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24 rounded-pastilla" />
                <Skeleton className="h-4 w-40 rounded-pastilla" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitleSkeleton title="Documentos" />
        <div aria-hidden="true" className={cx(CARD, "p-5")}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
            {["Foto de perfil", "Cédula", "Permisos de viaje con menores"].map((title) => (
              <div key={title} className="flex flex-col gap-3">
                <p className="text-base font-semibold text-tinta">{title}</p>
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-4 w-48 max-w-full rounded-pastilla" />
                <Skeleton className="h-6 w-28 rounded-pastilla" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitleSkeleton title="Historial de viajes" />
        <TableSkeleton
          columns={TRIP_SKELETON_COLUMNS}
          rows={5}
          mobileCards={3}
          mobileDetails={6}
          mobileDetailLabels={["Salida", "Pagado", "Unidad", "Reserva", "Abordó", "Llegó"]}
          mobileStatus
        />
      </div>
    </>
  );
}
