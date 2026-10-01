import Image from "next/image";

/**
 * Logo de TicketRuta (spec 2.1). Componentes de servidor, sin hooks.
 *
 * Los SVG viven en public/brand/. Se sirven con next/image `unoptimized`
 * porque ya son vectores: el tamaño visible lo fija `className`
 * (por ejemplo `h-24 w-auto`) y width/height solo dan la proporción intrínseca
 * para que el navegador reserve el espacio y no haya saltos al cargar.
 *
 * Reglas: el logo completo no baja de 64 px de alto (por debajo se usa
 * `LogoLockup` o `Isotipo`), nunca se deforma, rota ni lleva sombras, y solo
 * va sobre morado de marca, blanco o lienzo.
 */
export type LogoTone = "marca" | "blanco";

const LOGO_SRC: Record<LogoTone, string> = {
  marca: "/brand/logo-morado.svg",
  blanco: "/brand/logo-blanco.svg",
};

const ISOTIPO_SRC: Record<LogoTone, string> = {
  marca: "/brand/isotipo-morado.svg",
  blanco: "/brand/isotipo-blanco.svg",
};

interface LogoProps {
  tone?: LogoTone;
  className?: string;
  /** Carga prioritaria, para el logo visible sin desplazarse (portada, ingresar). */
  priority?: boolean;
  /** Si el nombre ya se lee al lado (o el logo es solo adorno), el `alt` queda vacío. */
  decorative?: boolean;
}

/** Logo completo: el texto isométrico "TICKET RUTA" sobre el frente del autobús. */
export function Logo({ tone = "marca", className, priority, decorative }: LogoProps) {
  return (
    <Image
      src={LOGO_SRC[tone]}
      alt={decorative ? "" : "TicketRuta"}
      width={2283}
      height={1997}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}

interface IsotipoProps {
  tone?: LogoTone;
  className?: string;
  decorative?: boolean;
}

/**
 * Isotipo: solo el frente del autobús, para cabeceras compactas y el menú
 * móvil. Siempre va arriba y a la vista, así que carga sin diferir
 * (`loading="eager"`): con la carga diferida de `next/image` aparecía un
 * instante después que la banda morada de la cabecera.
 */
export function Isotipo({ tone = "marca", className, decorative }: IsotipoProps) {
  return (
    <Image
      src={ISOTIPO_SRC[tone]}
      alt={decorative ? "" : "TicketRuta"}
      width={930}
      height={1262}
      unoptimized
      loading="eager"
      className={className}
    />
  );
}

interface LogoLockupProps {
  tone?: LogoTone;
  className?: string;
  /** Texto pequeño bajo el nombre ("Panel de agencia", "Terminal de pasajeros"). */
  label?: string;
}

/**
 * Versión horizontal: isotipo más la palabra "TicketRuta" escrita en HTML (no
 * en imagen), con una etiqueta opcional debajo. El isotipo es decorativo
 * porque el nombre ya se lee en texto.
 */
export function LogoLockup({ tone = "marca", className, label }: LogoLockupProps) {
  const textColor = tone === "blanco" ? "text-white" : "text-marca-600";
  const labelColor = tone === "blanco" ? "text-white/85" : "text-tinta-suave";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Isotipo tone={tone} decorative className="h-9 w-auto shrink-0" />
      <span className="flex flex-col leading-none">
        <span className={`text-xl font-extrabold tracking-tight ${textColor}`}>TicketRuta</span>
        {label ? (
          <span className={`mt-1 text-sm font-medium leading-tight ${labelColor}`}>{label}</span>
        ) : null}
      </span>
    </span>
  );
}
