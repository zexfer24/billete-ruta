import type { ComponentType } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader, AppHeaderAction } from "@/components/app-header";
import { IconDocument, IconExit, IconMenu } from "@/components/icons";
import { LogoLockup } from "@/components/logo";

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
 *   columna de la app del pasajero. Como en el layout real, el saludo solo
 *   aparece en `/mi`; en las demás rutas la banda queda en la fila del logo.
 * - `panel`: dentro del contenido del panel de agencia o del terminal. Desde
 *   `lg` se reserva la barra lateral de 272 px, para que la silueta tenga el
 *   mismo ancho útil que en la pantalla real; por debajo se ven sus variantes
 *   móviles.
 */
type Frame = "publico" | "mi" | "panel";

/**
 * Variante del panel que rodea a un skeleton del marco `panel`, la misma de
 * `PanelNav`: `agencia` (banda marca-600 y cuerpo blanco) o `terminal`
 * (barra entera marca-900). Sin valor es `agencia`.
 */
type PanelVariant = "agencia" | "terminal";

interface GalleryEntry {
  route: string;
  file: string;
  frame: Frame;
  variant?: PanelVariant;
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
        variant: "terminal",
        Component: TableroAdminLoading,
      },
      {
        route: "/panel/admin/agencias",
        file: "src/app/panel/admin/agencias/loading.tsx",
        frame: "panel",
        variant: "terminal",
        Component: AgenciasAdminLoading,
      },
      {
        route: "/panel/admin/usuarios",
        file: "src/app/panel/admin/usuarios/loading.tsx",
        frame: "panel",
        variant: "terminal",
        Component: UsuariosAdminLoading,
      },
      {
        route: "/panel/admin/movimientos",
        file: "src/app/panel/admin/movimientos/loading.tsx",
        frame: "panel",
        variant: "terminal",
        Component: MovimientosAdminLoading,
      },
      {
        route: "/panel/admin/tasas",
        file: "src/app/panel/admin/tasas/loading.tsx",
        frame: "panel",
        variant: "terminal",
        Component: TasasAdminLoading,
      },
      {
        route: "/panel/admin/mensajes",
        file: "src/app/panel/admin/mensajes/loading.tsx",
        frame: "panel",
        variant: "terminal",
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
  panel: "Contenido del panel, junto a la barra lateral desde lg",
};

/** El skeleton dentro del marco que tendría en su pantalla real. */
function FrameBody({ entry }: { entry: GalleryEntry }) {
  const { Component } = entry;

  if (entry.frame === "mi") {
    return (
      <div className="bg-lienzo pb-8">
        {/*
          Imita la cabecera del layout de /mi, que no se ve en el skeleton solo.
          `titleOnlyAt` con la ruta de la entrada nunca coincide con la de la
          galería, así que el saludo queda oculto salvo en la entrada de /mi,
          igual que en el layout real.
        */}
        <AppHeader
          titleAs="p"
          titleOnlyAt={entry.route === "/mi" ? undefined : entry.route}
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
    const terminal = entry.variant === "terminal";
    return (
      // Mismo marco que PanelFrame (src/app/panel/layout.tsx) y PanelNav: desde
      // `lg`, la columna de 272 px de la barra lateral (`w-68`) con la banda
      // de su variante y el contenido con sus márgenes; por debajo de `lg`, la
      // barra superior de 64 px con el logo y "Menú", y las variantes móviles
      // del contenido (tarjetas `md:hidden`). La barra es decorativa: no navega.
      <div className="bg-lienzo lg:flex">
        <div
          aria-hidden="true"
          className={`flex min-h-16 items-center justify-between gap-3 px-4 py-2 text-white shadow-1 lg:hidden ${
            terminal ? "bg-marca-900" : "bg-marca-600"
          }`}
        >
          <LogoLockup tone="blanco" label={terminal ? "Terminal de pasajeros" : "Agencia de ejemplo"} />
          <span className="flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-white/10 px-4 font-semibold">
            <IconMenu width={22} height={22} aria-hidden="true" />
            Menú
          </span>
        </div>
        <div
          aria-hidden="true"
          className={`hidden w-68 shrink-0 border-r lg:block ${
            terminal ? "border-marca-950 bg-marca-900" : "border-borde bg-superficie"
          }`}
        >
          {/* En el terminal la banda y el cuerpo son del mismo morado profundo. */}
          {terminal ? null : <div className="h-28 bg-marca-600" />}
        </div>
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Component />
          </div>
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
      {/*
        Los marcos van a sangre: el contenedor no tiene margen lateral y mide
        como máximo 1280 px, así cada skeleton tiene exactamente el ancho de la
        pantalla real hasta ese tamaño (a 375 px, 375; a 1280, 1280, y el
        contenido del panel 1280 − 272 − 64). Solo los textos de la galería
        llevan margen. Los cortes de línea son los mismos que en la pantalla.
      */}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 py-8">
        <header className="flex flex-col gap-3 px-4 sm:px-6 xl:px-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Galería de skeletons</h1>
          <p className="max-w-3xl text-base leading-relaxed text-tinta-suave">
            Los {total} skeletons de la aplicación, cada uno con el fondo y el ancho de su pantalla real
            (hasta 1280 px). Solo existe en desarrollo.
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
            <h2 className="px-4 text-xl font-bold tracking-tight sm:px-6 xl:px-0">{group.title}</h2>
            {group.entries.map((entry) => {
              const id = anchorFor(entry);
              return (
                <section
                  key={entry.file}
                  id={id}
                  aria-labelledby={`${id}-titulo`}
                  // Anillo en vez de borde: no resta ancho al marco.
                  className="scroll-mt-4 overflow-hidden shadow-1 ring-1 ring-borde xl:rounded-tarjeta"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-borde bg-superficie px-4 py-3">
                    <h3 id={`${id}-titulo`} className="font-mono text-base font-semibold text-tinta">
                      {entry.route}
                    </h3>
                    <p className="min-w-0 text-sm text-tinta-suave">
                      {FRAME_LABELS[entry.frame]} · <span className="break-all font-mono">{entry.file}</span>
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
