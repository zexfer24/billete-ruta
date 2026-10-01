import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAgencyUser } from "@/modules/auth";
import { PanelFeedback } from "@/components/panel-feedback";
import { SkeletonScreen } from "@/components/skeleton";
import { IconPlus } from "@/components/icons";
import { PanelPageHeader, PanelTabs, panelButtonClass } from "@/components/panel-ui";
import { errorMessage, okMessage } from "../_dashboard/search-params";
import { SkeletonSidePanel } from "../_shared/skeletons";
import { CreateDeparturePanel, DeparturesList } from "./departures-list";
import { DeparturesListSkeleton } from "./departures-skeleton";
import { proximasHref } from "./links";

export const metadata: Metadata = { title: "Salidas" };

/** Traduce el código corto de `?ok=` a un texto. Un código desconocido no muestra nada. */
const OK_LABELS: Readonly<Record<string, string>> = {
  "salida-creada": "Salida creada. Ya aparece en la lista y los pasajeros pueden comprar pasajes.",
};

/** Un parámetro de búsqueda como texto; un valor repetido (`?a=1&a=2`) se ignora. */
function texto(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function SalidasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { agencyId } = await requireAgencyUser("departures.manage");
  const params = await searchParams;
  const historial = texto(params.ver) === "historial";
  const todosLosDias = !historial && texto(params.dias) === "todos";
  const crearAbierto = texto(params.crear) === "1";
  const error = errorMessage(params.error);
  const ok = okMessage(OK_LABELS, params.ok);

  const crearHref = proximasHref({ historial, todosLosDias, crear: true });
  const closeHref = proximasHref({ historial, todosLosDias });

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Salidas"
        description="Programa los viajes de tu agencia y abre cada uno para embarcar a los pasajeros."
        actions={
          <Link href={crearHref} scroll={false} className={panelButtonClass("primario")}>
            <IconPlus className="size-5 shrink-0" />
            Crear salida
          </Link>
        }
      />

      <PanelTabs
        label="Salidas por periodo"
        tabs={[
          { href: "/panel/salidas", label: "Próximas", active: !historial },
          { href: "/panel/salidas?ver=historial", label: "Historial", active: historial },
        ]}
      />

      {!crearAbierto ? <PanelFeedback error={error} ok={ok} /> : null}

      <Suspense
        key={historial ? "historial" : todosLosDias ? "proximas-todas" : "proximas"}
        fallback={
          <SkeletonScreen label="Cargando las salidas…">
            <DeparturesListSkeleton moreButton={!historial && !todosLosDias} />
          </SkeletonScreen>
        }
      >
        <DeparturesList agencyId={agencyId} historial={historial} todosLosDias={todosLosDias} crearHref={crearHref} />
      </Suspense>

      {crearAbierto ? (
        <Suspense fallback={<SkeletonSidePanel title="Crear salida" fields={5} />}>
          <CreateDeparturePanel
            agencyId={agencyId}
            closeHref={closeHref}
            error={error}
            errorField={texto(params.campo)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
