import type { ReactNode } from "react";

interface StickyActionsProps {
  children: ReactNode;
}

/** Barra fija de botones sobre la barra inferior de navegación, para el asistente de reserva. */
export function StickyActions({ children }: StickyActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-20 border-t border-borde bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:px-0">
      <div className="mx-auto flex max-w-md gap-3 md:max-w-2xl">{children}</div>
    </div>
  );
}
