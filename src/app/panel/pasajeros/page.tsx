import Link from "next/link";
import { requireAgencyScope, requirePanelUser } from "@/modules/auth";
import { listAgencyDepartures } from "@/modules/catalog";
import { listAgencyPassengers } from "@/modules/reports";
import type { AgencyPassengerRow } from "@/modules/reports";
import { formatMoney, toDecimal } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { maskIdNumber } from "@/lib/identity";

const STATUSES = [
  "PENDIENTE_PAGO",
  "EN_VALIDACION",
  "ABONADA",
  "PAGADA",
  "PAGO_EN_SITIO",
  "LIBERADA",
  "CANCELADA",
  "ABORDADA",
  "NO_SHOW",
] as const;

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(rows: AgencyPassengerRow[]): string {
  const header = [
    "Serial",
    "Titular",
    "Cédula",
    "Ruta",
    "Salida",
    "Cantidad",
    "Total USD",
    "Abonado USD",
    "Saldo USD",
    "Estado de pago",
  ];
  const lines = rows.map((r) =>
    [
      r.code,
      r.holderName,
      maskIdNumber(r.holderIdNumber),
      r.routeName,
      formatCaracasDateTime24(r.departsAt),
      String(r.passengerCount),
      r.totalUsd,
      r.paidUsd,
      r.balanceUsd,
      r.paymentState,
    ]
      .map(csvField)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export default async function PasajerosPage({
  searchParams,
}: {
  searchParams: Promise<{
    salida?: string;
    estado?: string;
    buscar?: string;
    pagina?: string;
  }>;
}) {
  const user = await requirePanelUser("agency.reports");
  const agencyId = requireAgencyScope(user);
  const params = await searchParams;

  const paginaActual = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);
  const filtro = {
    departureId: params.salida || undefined,
    status: params.estado || undefined,
    search: params.buscar || undefined,
  };

  // La tabla muestra una página; la exportación se lleva el filtro completo.
  const [resultado, exportables, salidas] = await Promise.all([
    listAgencyPassengers(agencyId, { ...filtro, page: paginaActual, pageSize: 50 }),
    listAgencyPassengers(agencyId, { ...filtro, page: 1, pageSize: 500 }),
    listAgencyDepartures(agencyId, { from: new Date(Date.now() - 30 * 24 * 3_600_000) }),
  ]);

  const pasajeros = resultado.rows;
  const paginas = Math.max(1, Math.ceil(resultado.total / resultado.pageSize));
  const csv = buildCsv(exportables.rows);

  function enlacePagina(pagina: number): string {
    const query = new URLSearchParams();
    if (params.salida) query.set("salida", params.salida);
    if (params.estado) query.set("estado", params.estado);
    if (params.buscar) query.set("buscar", params.buscar);
    query.set("pagina", String(pagina));
    return `/panel/pasajeros?${query.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pasajeros</h1>
          <p className="text-sm text-[var(--color-texto-suave)]">
            {resultado.total} reserva(s) con estos filtros
          </p>
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="pasajeros.csv"
          className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-2 text-sm font-medium"
        >
          Exportar CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Salida
          <select
            name="salida"
            defaultValue={params.salida ?? ""}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {salidas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.routeName} · {formatCaracasDateTime24(s.departsAt)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Estado
          <select
            name="estado"
            defaultValue={params.estado ?? ""}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Buscar
          <input
            type="text"
            name="buscar"
            defaultValue={params.buscar ?? ""}
            placeholder="Serial, nombre o cédula"
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-acento)] px-4 py-2 text-sm font-medium text-white"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Titular</th>
              <th className="px-4 py-3 font-medium">Cédula</th>
              <th className="px-4 py-3 font-medium">Ruta</th>
              <th className="px-4 py-3 font-medium">Salida</th>
              <th className="px-4 py-3 font-medium">Cant.</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Abonado</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pasajeros.map((p) => (
              <tr key={p.reservationId} className="border-b border-[var(--color-borde)] last:border-0">
                <td className="tabular px-4 py-3">{p.code}</td>
                <td className="px-4 py-3">{p.holderName}</td>
                <td className="tabular px-4 py-3">{maskIdNumber(p.holderIdNumber)}</td>
                <td className="px-4 py-3">{p.routeName}</td>
                <td className="tabular px-4 py-3">{formatCaracasDateTime24(p.departsAt)}</td>
                <td className="tabular px-4 py-3">{p.passengerCount}</td>
                <td className="tabular px-4 py-3">{formatMoney(toDecimal(p.totalUsd), "USD")}</td>
                <td className="tabular px-4 py-3">{formatMoney(toDecimal(p.paidUsd), "USD")}</td>
                <td className="tabular px-4 py-3">{formatMoney(toDecimal(p.balanceUsd), "USD")}</td>
                <td className="px-4 py-3">{p.paymentState}</td>
              </tr>
            ))}
            {pasajeros.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay pasajeros con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {paginas > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-texto-suave)]">
            Página {resultado.page} de {paginas}
          </span>
          <div className="flex gap-2">
            {resultado.page > 1 ? (
              <Link
                href={enlacePagina(resultado.page - 1)}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-1.5 font-medium"
              >
                Anterior
              </Link>
            ) : null}
            {resultado.page < paginas ? (
              <Link
                href={enlacePagina(resultado.page + 1)}
                className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-1.5 font-medium"
              >
                Siguiente
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
