import type { ComponentType } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader, AppHeaderAction } from "@/components/app-header";
import { IconDocument, IconExit } from "@/components/icons";

import PortadaLoading from "@/app/(portada)/loading";
import IngresarLoading from "@/app/ingresar/loading";
import RegistroLoading from "@/app/registro/loading";
import ListaEsperaLoading from "@/app/lista-espera/[token]/loading";
import MiInicioLoading from "@/app/mi/loading";
import AvisosLoading from "@/app/mi/avisos/loading";
import DocumentosLoading from "@/app/mi/documentos/loading";
import ReservarLoading from "@/app/mi/reservar/loading";
import MisReservasLoading from "@/app/mi/reservas/loading";
import DetalleReservaLoading from "@/app/mi/reservas/[code]/loading";
import IngresarPanelLoading from "@/app/panel/ingresar/loading";
import PanelLoading from "@/app/panel/loading";
import TableroLoading from "@/app/panel/(tablero)/loading";
import PasajerosLoading from "@/app/panel/pasajeros/loading";
import TaquillaLoading from "@/app/panel/taquilla/loading";
import SalidasLoading from "@/app/panel/salidas/loading";
import SalidaDetalleLoading from "@/app/panel/salidas/[id]/loading";
import AbordajeLoading from "@/app/panel/abordaje/[departureId]/loading";
import FlotaLoading from "@/app/panel/flota/loading";
import ReportesLoading from "@/app/panel/reportes/loading";
import TableroAdminLoading from "@/app/panel/admin/tablero/loading";
import AgenciasAdminLoading from "@/app/panel/admin/agencias/loading";
import UsuariosAdminLoading from "@/app/panel/admin/usuarios/loading";
import MovimientosAdminLoading from "@/app/panel/admin/movimientos/loading";
import TasasAdminLoading from "@/app/panel/admin/tasas/loading";
import MensajesAdminLoading from "@/app/panel/admin/mensajes/loading";

export const metadata: Metadata = {
  title: "Galería de skeletons",
  robots: { index: false, follow: false },
};

/**
 * Dónde vive el skeleton y, por tanto, con qué marco se muestra:
 * - `publico`: pantalla con su propia cáscara (portada, ingresar, registro,
 *   lista de espera, acceso del personal), a todo el ancho.
 * - `mi`: bajo el layout de `/mi`, con la cabecera morada arriba y la
 *   columna de la app del pasajero.
 * - `panel`: dentro del contenido del panel de agencia o del terminal, al
 *   ancho de la ventana (en el teléfono se ven sus variantes móviles).
 */
type Frame = "publico" | "mi" | "panel";

interface GalleryEntry {
  route: string;
  file: string;
  frame: Frame;
  note?: string;
  Component: ComponentType;
}

interface GalleryGroup {
  title: string;
  entries: readonly GalleryEntry[];
}

const GROUPS: readonly GalleryGroup[] = [
  {
    title: "Pantallas públicas",
    entries: [
      { route: "/", file: "src/app/(portada)/loading.tsx", frame: "publico", Component: PortadaLoading },
      { route: "/ingresar", file: "src/app/ingresar/loading.tsx", frame: "publico", Component: IngresarLoading },
      { route: "/registro", file: "src/app/registro/loading.tsx", frame: "publico", Component: RegistroLoading },
      {
        route: "/lista-espera/[token]",
        file: "src/app/lista-espera/[token]/loading.tsx",
        frame: "publico",
        Component: ListaEsperaLoading,
      },
    ],
  },
  {
    title: "App del pasajero",
    entries: [
      { route: "/mi", file: "src/app/mi/loading.tsx", frame: "mi", Component: MiInicioLoading },
      { route: "/mi/avisos", file: "src/app/mi/avisos/loading.tsx", frame: "mi", Component: AvisosLoading },
      { route: "/mi/documentos", file: "src/app/mi/documentos/loading.tsx", frame: "mi", Component: DocumentosLoading },
      { route: "/mi/reservar", file: "src/app/mi/reservar/loading.tsx", frame: "mi", Component: ReservarLoading },
      { route: "/mi/reservas", file: "src/app/mi/reservas/loading.tsx", frame: "mi", Component: MisReservasLoading },
      {
        route: "/mi/reservas/[code]",
        file: "src/app/mi/reservas/[code]/loading.tsx",
        frame: "mi",
        Component: DetalleReservaLoading,
      },
    ],
  },
  {
    title: "Panel de agencia",
    entries: [
      {
        route: "/panel/ingresar",
        file: "src/app/panel/ingresar/loading.tsx",
        frame: "publico",
        Component: IngresarPanelLoading,
      },
      {
        route: "/panel/*",
        file: "src/app/panel/loading.tsx",
        frame: "panel",
        note: "Frontera neutra: layout del administrador, redirecciones viejas y pantallas sin skeleton propio.",
        Component: PanelLoading,
      },
      { route: "/panel", file: "src/app/panel/(tablero)/loading.tsx", frame: "panel", Component: TableroLoading },
      { route: "/panel/pasajeros", file: "src/app/panel/pasajeros/loading.tsx", frame: "panel", Component: PasajerosLoading },
      { route: "/panel/taquilla", file: "src/app/panel/taquilla/loading.tsx", frame: "panel", Component: TaquillaLoading },
      { route: "/panel/salidas", file: "src/app/panel/salidas/loading.tsx", frame: "panel", Component: SalidasLoading },
      {
        route: "/panel/salidas/[id]",
        file: "src/app/panel/salidas/[id]/loading.tsx",
        frame: "panel",
        Component: SalidaDetalleLoading,
      },
      {
        route: "/panel/abordaje/[departureId]",
        file: "src/app/panel/abordaje/[departureId]/loading.tsx",
        frame: "panel",
        Component: AbordajeLoading,
      },
      { route: "/panel/flota", file: "src/app/panel/flota/loading.tsx", frame: "panel", Component: FlotaLoading },
      { route: "/panel/reportes", file: "src/app/panel/reportes/loading.tsx", frame: "panel", Component: ReportesLoading },
    ],
  },
  {
    title: "Panel del terminal",
    entries: [
      {
        route: "/panel/admin/tablero",
        file: "src/app/panel/admin/tablero/loading.tsx",
        frame: "panel",
        Component: TableroAdminLoading,
      },
      {
        route: "/panel/admin/agencias",
        file: "src/app/panel/admin/agencias/loading.tsx",
        frame: "panel",
        Component: AgenciasAdminLoading,
      },
      {
        route: "/panel/admin/usuarios",
        file: "src/app/panel/admin/usuarios/loading.tsx",
        frame: "panel",
        Component: UsuariosAdminLoading,
      },
      {
        route: "/panel/admin/movimientos",
        file: "src/app/panel/admin/movimientos/loading.tsx",
        frame: "panel",
        Component: MovimientosAdminLoading,
      },
      { route: "/panel/admin/tasas", file: "src/app/panel/admin/tasas/loading.tsx", frame: "panel", Component: TasasAdminLoading },
      {
        route: "/panel/admin/mensajes",
        file: "src/app/panel/admin/mensajes/loading.tsx",
        frame: "panel",
        Component: MensajesAdminLoading,
      },
    ],
  },
];

/** Ancla estable del índice, derivada del archivo: "src/app/panel/admin/tasas/loading.tsx" → "esqueleto-panel-admin-tasas". */
function anchorFor(entry: GalleryEntry): string {
  const slug = entry.file
    .replace(/^src\/app\//, "")
    .replace(/\/?loading\.tsx$/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `esqueleto-${slug || "raiz"}`;
}

const FRAME_LABELS: Record<Frame, string> = {
  publico: "Pantalla completa",
  mi: "Bajo el layout de /mi",
  panel: "Contenido del panel, al ancho de la ventana",
};

/** El skeleton dentro del marco que tendría en su pantalla real. */
function FrameBody({ entry }: { entry: GalleryEntry }) {
  const { Component } = entry;

  if (entry.frame === "mi") {
    return (
      <div className="bg-lienzo pb-8">
        {/* Imita la cabecera del layout de /mi, que no se ve en el skeleton solo. */}
        <AppHeader
          titleAs="p"
          title="Hola, pasajero"
          subtitle="Cabecera de ejemplo del layout de /mi"
          right={
            <>
              {/* Las mismas acciones que el layout real; aquí no navegan (sobre todo "Salir"). */}
              <AppHeaderAction href="#" label="Documentos" icon={<IconDocument />} />
              <AppHeaderAction href="#" label="Salir" icon={<IconExit />} plain />
            </>
          }
        />
        <div className="mx-auto w-full max-w-md px-4 pt-5 md:max-w-2xl">
          <Component />
        </div>
      </div>
    );
  }

  if (entry.frame === "panel") {
    return (
      // Sin ancho mínimo: a 375 px se ven las variantes móviles (tarjetas
      // `md:hidden`) y en escritorio las tablas, como en la pantalla real.
      <div className="bg-lienzo px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <Component />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-lienzo">
      <Component />
    </div>
  );
}

/**
 * Galería de todos los `loading.tsx` de la aplicación, solo en desarrollo.
 * Sirve para revisar las siluetas sin frenar la red ni iniciar sesión. No
 * consulta la base ni escribe auditoría: los skeletons son componentes puros.
 */
export default function SkeletonGalleryPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const total = GROUPS.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <div className="min-h-dvh bg-superficie text-tinta">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-10 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Galería de skeletons</h1>
          <p className="max-w-3xl text-base leading-relaxed text-tinta-suave">
            Los {total} skeletons de la aplicación, cada uno con el fondo y el ancho de su pantalla real.
            Solo existe en desarrollo.
          </p>
          <nav aria-label="Índice de skeletons" className="flex flex-col gap-4 pt-2 sm:flex-row sm:flex-wrap sm:gap-8">
            {GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-tinta">{group.title}</p>
                <ul className="flex flex-col">
                  {group.entries.map((entry) => (
                    <li key={entry.file}>
                      <a
                        href={`#${anchorFor(entry)}`}
                        className="foco inline-flex min-h-11 items-center rounded-control px-1 font-mono text-sm text-marca-700 hover:bg-marca-50"
                      >
                        {entry.route}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </header>

        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-6">
            <h2 className="text-xl font-bold tracking-tight">{group.title}</h2>
            {group.entries.map((entry) => {
              const id = anchorFor(entry);
              return (
                <section
                  key={entry.file}
                  id={id}
                  aria-labelledby={`${id}-titulo`}
                  className="scroll-mt-4 overflow-hidden rounded-tarjeta border border-borde shadow-1"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-borde bg-superficie px-4 py-3">
                    <h3 id={`${id}-titulo`} className="font-mono text-base font-semibold text-tinta">
                      {entry.route}
                    </h3>
                    <p className="text-sm text-tinta-suave">
                      {FRAME_LABELS[entry.frame]} · <span className="font-mono">{entry.file}</span>
                    </p>
                    {entry.note ? <p className="w-full text-sm text-tinta-suave">{entry.note}</p> : null}
                  </div>
                  <FrameBody entry={entry} />
                </section>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
