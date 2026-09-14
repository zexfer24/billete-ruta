const TOTAL_PASOS = 4;

interface StepIndicatorProps {
  step: 1 | 2 | 3 | 4;
  labels: readonly [string, string, string, string];
}

/**
 * Indicador de progreso del asistente de reserva: texto "Paso N de 4 · Nombre"
 * y cuatro segmentos horizontales (activo, hechos y pendientes). Componente
 * de servidor: no usa hooks ni eventos propios.
 */
export function StepIndicator({ step, labels }: StepIndicatorProps) {
  return (
    <div
      className="flex flex-col gap-2"
      role="group"
      aria-label={`Paso ${step} de ${TOTAL_PASOS}: ${labels[step - 1]}`}
    >
      <p className="text-sm font-semibold text-tinta-suave">
        Paso {step} de {TOTAL_PASOS} · {labels[step - 1]}
      </p>
      <div className="flex gap-2">
        {labels.map((label, indice) => {
          const numero = indice + 1;
          const clase = numero === step ? "bg-marca" : numero < step ? "bg-marca/60" : "bg-borde";
          return (
            <span key={label} aria-hidden="true" className={`h-1.5 flex-1 rounded-pastilla ${clase}`} />
          );
        })}
      </div>
    </div>
  );
}
