/**
 * Aviso de error o de éxito para las acciones del panel de agencia, con el
 * mismo marcado que usa `src/app/panel/admin/tasas/page.tsx`. Sin ninguno de
 * los dos, no renderiza nada.
 */
export function PanelFeedback({
  error,
  ok,
}: {
  error?: string | null;
  ok?: string | null;
}) {
  if (!error && !ok) return null;
  return (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[var(--color-peligro)] bg-red-50 px-4 py-3 text-sm text-[var(--color-peligro)]"
        >
          {error}
        </div>
      ) : null}
      {ok ? (
        <div
          role="status"
          className="rounded-xl border border-[var(--color-exito)] bg-green-50 px-4 py-3 text-sm text-[var(--color-exito)]"
        >
          {ok}
        </div>
      ) : null}
    </>
  );
}
