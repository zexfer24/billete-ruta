import { IconDownload } from "@/components/icons";
import { panelButtonClass } from "@/components/panel-ui";
import { describeReportRange, type ReportRange } from "./range";

/**
 * Línea que dice qué periodo se está viendo y, si hay datos, el botón para
 * descargarlo. Es un enlace normal (no `Link`) porque la respuesta es un
 * archivo, no una página. Va antes de las cifras, porque dice a qué rango
 * corresponden; la descarga es un botón fantasma para no competir con los datos.
 */
export function ReportRangeLine({ range, downloadHref }: { range: ReportRange; downloadHref?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p className="text-sm text-tinta-suave">
        <span className="font-semibold text-tinta">Mostrando:</span>{" "}
        <span className="tabular">{describeReportRange(range)}</span>
      </p>
      {downloadHref ? (
        <a href={downloadHref} download className={panelButtonClass("fantasma", "md", "-mx-2 sm:mx-0")}>
          <IconDownload className="size-5 shrink-0" />
          Descargar en Excel (CSV)
        </a>
      ) : null}
    </div>
  );
}
