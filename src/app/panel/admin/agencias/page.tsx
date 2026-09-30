import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconPlus } from "@/components/icons";
import { PanelFeedback } from "@/components/panel-feedback";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { SidePanel } from "@/components/side-panel";
import { requirePanelUser } from "@/modules/auth";
import { AgenciesList, AgenciesListSkeleton } from "./agencies-list";
import { AgencyForm } from "./agency-form";

export const metadata: Metadata = { title: "Agencias del terminal" };

const PAGE_PATH = "/panel/admin/agencias";
const REGISTER_HREF = `${PAGE_PATH}?registrar=agencia`;

/**
 * Textos de los códigos `?ok=` que devuelven las acciones de esta página. Es
 * un `Map` para que una clave heredada (`?ok=constructor`) no cuele un texto.
 */
const OK_LABELS = new Map<string, string>([
  ["agencia-creada", "Agencia registrada. Su operador ya puede entrar al panel con el correo y la contraseña que le diste."],
  ["agencia-activada", "Agencia activada. Sus salidas vuelven a venderse en la app y en la taquilla."],
  ["agencia-desactivada", "Agencia desactivada. Sus salidas ya no se venden; las reservas que tenía se mantienen."],
]);

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Agencias del terminal: su flota, su personal y su estado. Registrar una
 * agencia abre un panel lateral (`?registrar=agencia`); desactivarla pide
 * confirmación. Los avisos siguen el patrón `?ok=<código>` / `?error=`.
 */
export default async function AgenciasAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelUser("terminal.agencies");
  const params = await searchParams;
  const registrar = first(params.registrar) === "agencia";
  const error = first(params.error)?.slice(0, 300);
  const okCode = first(params.ok);
  const ok = okCode ? OK_LABELS.get(okCode) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Agencias del terminal"
        description="Las agencias que venden pasajes en el terminal, con su flota y su personal. Aquí registras una agencia nueva o la desactivas."
        actions={
          <Link href={REGISTER_HREF} scroll={false} className={panelButtonClass("primario")}>
            <IconPlus className="size-5 shrink-0" />
            Registrar agencia
          </Link>
        }
      />

      <PanelFeedback error={registrar ? undefined : error} ok={ok} />

      {/* Con clave: abrir o cerrar el panel lateral responde al instante con la
          silueta de la lista, en vez de esperar a que la consulta vuelva (spec 6.5). */}
      <Suspense key={registrar ? "con-panel" : "sin-panel"} fallback={<AgenciesListSkeleton />}>
        <AgenciesList registerHref={REGISTER_HREF} />
      </Suspense>

      {registrar ? (
        <SidePanel
          title="Registrar agencia"
          subtitle="Se crea la agencia junto con la cuenta de su primer operador."
          closeHref={PAGE_PATH}
        >
          <AgencyForm error={error} closeHref={PAGE_PATH} />
        </SidePanel>
      ) : null}
    </div>
  );
}
