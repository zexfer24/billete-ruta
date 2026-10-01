import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { z } from "zod";
import { requireAgencyUser } from "@/modules/auth";
import { SkeletonScreen } from "@/components/skeleton";
import { IconPlus } from "@/components/icons";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { errorMessage } from "../_dashboard/search-params";
import { SkeletonSidePanel } from "../_shared/skeletons";
import { FleetBody, FleetEditPanel, FleetRegisterPanel, type FleetView } from "./fleet-body";
import { FleetBodySkeleton } from "./fleet-skeleton";

export const metadata: Metadata = { title: "Vehículos y choferes" };

/** Un parámetro de búsqueda como texto; un valor repetido (`?a=1&a=2`) se ignora. */
function texto(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const VISTA = z.enum(["vehiculos", "choferes"]).catch("vehiculos");
const REGISTRAR = z.enum(["vehiculo", "chofer"]).optional().catch(undefined);

export default async function FlotaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { agencyId } = await requireAgencyUser("fleet.manage");
  const params = await searchParams;

  const vista: FleetView = VISTA.parse(texto(params.vista));
  const registrar = REGISTRAR.parse(texto(params.registrar));
  // Registrar gana sobre editar: nunca se abren dos paneles.
  const editar = registrar ? undefined : texto(params.editar);
  const error = errorMessage(params.error);
  const errorField = texto(params.campo);
  const closeHref = `/panel/flota?vista=${vista}`;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Vehículos y choferes"
        description="Quién está en ruta, quién está libre y qué salidas vienen."
        actions={
          vista === "vehiculos" ? (
            <Link
              href="/panel/flota?vista=vehiculos&registrar=vehiculo"
              scroll={false}
              className={panelButtonClass("primario")}
            >
              <IconPlus className="size-5 shrink-0" />
              Registrar vehículo
            </Link>
          ) : (
            <Link
              href="/panel/flota?vista=choferes&registrar=chofer"
              scroll={false}
              className={panelButtonClass("primario")}
            >
              <IconPlus className="size-5 shrink-0" />
              Registrar chofer
            </Link>
          )
        }
      />

      {/* Panel de edición en su propio <Suspense key>: al abrirlo aparece al
          instante su silueta, sin esperar a la lista (spec 6.5). Va antes de
          la lista porque, si el id no es de nadie, deja ahí su aviso. */}
      {editar !== undefined ? (
        <Suspense
          key={`${vista}:${editar}`}
          fallback={
            <SkeletonSidePanel
              title={vista === "choferes" ? "Editar chofer" : "Editar vehículo"}
              fields={vista === "choferes" ? 3 : 4}
            />
          }
        >
          <FleetEditPanel
            agencyId={agencyId}
            vista={vista}
            editar={editar}
            closeHref={closeHref}
            error={error}
            errorField={errorField}
          />
        </Suspense>
      ) : null}

      <Suspense
        key={vista}
        fallback={
          <SkeletonScreen label="Cargando la flota…">
            <FleetBodySkeleton vista={vista} />
          </SkeletonScreen>
        }
      >
        <FleetBody
          agencyId={agencyId}
          vista={vista}
          selectedId={editar}
          panelAbierto={registrar !== undefined || editar !== undefined}
          error={error}
          ok={texto(params.ok)}
        />
      </Suspense>

      {/* El registro no consulta nada: sale en la misma respuesta que la página. */}
      {registrar ? (
        <FleetRegisterPanel registrar={registrar} closeHref={closeHref} error={error} errorField={errorField} />
      ) : null}
    </div>
  );
}
