import { Alert } from "./alert";
import { ClearFeedbackParams } from "./clear-feedback-params";

/**
 * Resultado de una acción del panel (`?error=` o `?ok=`), mostrado con
 * `Alert`: rojo con `role="alert"` si falló, verde con `role="status"` si
 * salió bien. Tras mostrarse limpia esos parámetros de la URL para que el
 * aviso no reaparezca al recargar. Sin ninguno de los dos no renderiza nada.
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
        <Alert tone="peligro" title="No se pudo completar">
          {error}
        </Alert>
      ) : null}
      {ok ? <Alert tone="exito">{ok}</Alert> : null}
      <ClearFeedbackParams />
    </>
  );
}
