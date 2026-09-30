import type { ReactNode } from "react";
import { IconAlertCircle, IconCheckCircle, IconInfo, IconWarning } from "./icons";
import { ALERT_TONE_CLASSES, alertRole, cx, type AlertTone } from "./ui-classes";

export type { AlertTone } from "./ui-classes";

const ALERT_ICONS: Record<AlertTone, (props: { className?: string }) => ReactNode> = {
  exito: IconCheckCircle,
  peligro: IconAlertCircle,
  alerta: IconWarning,
  info: IconInfo,
};

/**
 * Aviso con icono, título en negrita, texto y una acción opcional (spec 6.3).
 * Dice qué pasó y qué sigue: tras guardar, ante un error, o para advertir algo
 * antes de actuar. El color nunca va solo: siempre hay icono y texto. Los
 * errores y advertencias usan `role="alert"`; el éxito y la información,
 * `role="status"`. `role` permite cambiarlo, por ejemplo a `"none"` para una
 * advertencia fija de la página que no debe interrumpir al cargar.
 */
export function Alert({
  tone,
  title,
  children,
  action,
  role,
  className,
}: {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status" | "none";
  className?: string;
}) {
  const Icon = ALERT_ICONS[tone];
  const classes = ALERT_TONE_CLASSES[tone];
  const resolvedRole = role ?? alertRole(tone);

  return (
    <div
      role={resolvedRole === "none" ? undefined : resolvedRole}
      className={cx(
        "flex flex-col gap-3 rounded-control border px-4 py-3.5 text-tinta sm:flex-row sm:items-start",
        classes.box,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span aria-hidden="true" className={cx("shrink-0 pt-px", classes.icon)}>
          <Icon className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-base leading-relaxed">
          {title ? <p className={cx("font-bold leading-snug", classes.title)}>{title}</p> : null}
          {children ? <div className="text-tinta">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2 pl-9 sm:pl-0">{action}</div> : null}
    </div>
  );
}
