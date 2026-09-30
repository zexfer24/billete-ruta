import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { z } from "zod";
import { requireAgencyUser } from "@/modules/auth";
import { SkeletonScreen } from "@/components/skeleton";
import { IconPlus } from "@/components/icons";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { errorMessage } from "../_dashboard/search-params";
import { FleetBody, type FleetView } from "./fleet-body";
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
  const editar = texto(params.editar);

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
          registrar={registrar}
          editar={editar}
          error={errorMessage(params.error)}
          errorField={texto(params.campo)}
          ok={texto(params.ok)}
        />
      </Suspense>
    </div>
  );
}
