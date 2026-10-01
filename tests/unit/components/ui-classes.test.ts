import { describe, expect, it } from "vitest";
import {
  alertRole,
  BUTTON_SIZE_CLASSES,
  BUTTON_VARIANT_CLASSES,
  buttonClass,
  formatFileSize,
  panelButtonClass,
  panelInputClass,
  PANEL_BUTTON_SIZE_CLASSES,
  PANEL_BUTTON_VARIANT_CLASSES,
  PANEL_TAB_ACTIVE_CLASS,
  PANEL_TAB_INACTIVE_CLASS,
  PILL_TONE_CLASSES,
  pillClass,
  progressPercent,
  stepDescription,
  stepState,
  type ButtonVariant,
  type PanelButtonVariant,
} from "@/components/ui-classes";

/** Utilidades de color prohibidas por la spec: hex, valores arbitrarios con var() y paletas fijas de Tailwind. */
const FORBIDDEN_COLOR =
  /#[0-9a-f]{3,8}\b|\[var\(|\b(?:bg|text|border|ring|outline)-(?:red|green|blue|amber|slate|gray|zinc|neutral|stone|yellow|orange|emerald|sky|indigo|violet|purple|black)-?\d*/i;

function tokens(classes: string): string[] {
  return classes.split(/\s+/).filter(Boolean);
}

describe("buttonClass (pasajero)", () => {
  it("usa md (48 px) por defecto y respeta el segundo argumento como clases extra", () => {
    const classes = tokens(buttonClass("primario", "w-full"));
    expect(classes).toContain("min-h-12");
    expect(classes).toContain("w-full");
    expect(classes).toContain("rounded-pastilla");
  });

  it("aplica los tamaños mínimos de la spec: sm 44 px, md 48 px, lg 56 px", () => {
    expect(tokens(buttonClass("primario", undefined, "sm"))).toContain("min-h-11");
    expect(tokens(buttonClass("primario", undefined, "md"))).toContain("min-h-12");
    const lg = tokens(buttonClass("primario", undefined, "lg"));
    expect(lg).toContain("min-h-14");
    expect(lg).toContain("text-lg");
  });

  it("pinta el primario en marca-600 con texto blanco y hover marca-700", () => {
    const classes = tokens(buttonClass("primario"));
    expect(classes).toEqual(expect.arrayContaining(["bg-marca-600", "text-white", "hover:bg-marca-700"]));
  });

  it("mantiene ruta como alias del primario", () => {
    expect(buttonClass("ruta")).toBe(buttonClass("primario"));
  });

  it("usa el foco amarillo solo en las variantes que van sobre morado", () => {
    expect(tokens(buttonClass("acento"))).toContain("foco-sobre-marca");
    expect(tokens(buttonClass("sobre-marca"))).toContain("foco-sobre-marca");
    for (const variant of ["primario", "secundario", "fantasma", "peligro"] as ButtonVariant[]) {
      const classes = tokens(buttonClass(variant));
      expect(classes).toContain("foco");
      expect(classes).not.toContain("foco-sobre-marca");
    }
  });

  it("pone amarillo sol con texto marca-950 en acento", () => {
    expect(tokens(buttonClass("acento"))).toEqual(expect.arrayContaining(["bg-sol", "text-marca-950"]));
  });

  it("incluye estados de deshabilitado y transición que respeta el movimiento reducido", () => {
    const classes = tokens(buttonClass("secundario"));
    expect(classes).toEqual(
      expect.arrayContaining(["disabled:opacity-60", "disabled:cursor-not-allowed", "duration-150", "motion-reduce:transition-none"]),
    );
  });

  it("no usa colores fijos ni valores arbitrarios con var()", () => {
    for (const value of [...Object.values(BUTTON_VARIANT_CLASSES), ...Object.values(BUTTON_SIZE_CLASSES)]) {
      expect(value).not.toMatch(FORBIDDEN_COLOR);
    }
  });
});

describe("panelButtonClass (panel)", () => {
  it("mantiene la firma (variante, tamaño = md, extra)", () => {
    const classes = tokens(panelButtonClass("primario", "md", "w-fit"));
    expect(classes).toEqual(expect.arrayContaining(["min-h-11", "w-fit", "rounded-control", "bg-marca-600"]));
    expect(panelButtonClass("primario")).toBe(panelButtonClass("primario", "md"));
  });

  it("aplica los tamaños mínimos de la spec: sm 40 px, md 44 px, lg 48 px", () => {
    expect(tokens(panelButtonClass("secundario", "sm"))).toContain("min-h-10");
    expect(tokens(panelButtonClass("secundario", "md"))).toContain("min-h-11");
    expect(tokens(panelButtonClass("secundario", "lg"))).toContain("min-h-12");
  });

  it("tiene las cinco variantes con foco visible", () => {
    const variants: PanelButtonVariant[] = ["primario", "secundario", "exito", "peligro", "fantasma"];
    for (const variant of variants) {
      expect(tokens(panelButtonClass(variant))).toContain("foco");
    }
    expect(tokens(panelButtonClass("exito"))).toContain("bg-exito");
    expect(tokens(panelButtonClass("peligro"))).toContain("bg-peligro");
  });

  it("no usa colores fijos ni valores arbitrarios con var()", () => {
    for (const value of [
      ...Object.values(PANEL_BUTTON_VARIANT_CLASSES),
      ...Object.values(PANEL_BUTTON_SIZE_CLASSES),
      panelInputClass(),
    ]) {
      expect(value).not.toMatch(FORBIDDEN_COLOR);
    }
  });
});

describe("panelInputClass", () => {
  it("mide 44 px, usa texto de 16 px y el borde de control", () => {
    const classes = tokens(panelInputClass());
    expect(classes).toEqual(expect.arrayContaining(["min-h-11", "text-base", "border-borde-control", "foco", "w-full"]));
  });

  it("agrega las clases extra al final", () => {
    expect(panelInputClass("max-w-xs").endsWith("max-w-xs")).toBe(true);
  });

  it("lleva la marca campo-panel, que da a los selectores el chevron de la marca", () => {
    expect(tokens(panelInputClass())).toContain("campo-panel");
  });
});

describe("pestañas del panel", () => {
  it("la activa tiene una barra inferior marca-600 además del tono, sin cambiar el peso de la letra", () => {
    const active = tokens(PANEL_TAB_ACTIVE_CLASS);
    expect(active).toEqual(expect.arrayContaining(["bg-marca-50", "text-marca-800", "after:bg-marca-600", "after:absolute"]));
    expect(active.some((c) => /^font-/.test(c))).toBe(false);
    expect(tokens(PANEL_TAB_INACTIVE_CLASS)).toContain("text-tinta-suave");
  });

  it("no usa colores fijos ni valores arbitrarios con var()", () => {
    expect(PANEL_TAB_ACTIVE_CLASS).not.toMatch(FORBIDDEN_COLOR);
    expect(PANEL_TAB_INACTIVE_CLASS).not.toMatch(FORBIDDEN_COLOR);
  });
});

describe("pillClass", () => {
  it("usa text-sm y se parte en líneas en vez de desbordarse", () => {
    const classes = tokens(pillClass("exito"));
    expect(classes).toEqual(expect.arrayContaining(["text-sm", "whitespace-normal", "max-w-full"]));
    expect(classes).not.toContain("whitespace-nowrap");
  });

  it("combina el texto del tono con su fondo suave", () => {
    expect(tokens(pillClass("exito"))).toEqual(expect.arrayContaining(["bg-exito-suave", "text-exito"]));
    expect(tokens(pillClass("peligro"))).toEqual(expect.arrayContaining(["bg-peligro-suave", "text-peligro"]));
    expect(tokens(pillClass("alerta"))).toEqual(expect.arrayContaining(["bg-alerta-suave", "text-alerta"]));
  });

  it("cubre todos los tonos de StatusTone más info, sin colores fijos", () => {
    expect(Object.keys(PILL_TONE_CLASSES).sort()).toEqual(["alerta", "exito", "info", "marca", "neutro", "peligro"]);
    for (const value of Object.values(PILL_TONE_CLASSES)) {
      expect(value).not.toMatch(FORBIDDEN_COLOR);
    }
  });
});

describe("alertRole", () => {
  it("interrumpe con alert en peligro y alerta, y usa status en éxito e info", () => {
    expect(alertRole("peligro")).toBe("alert");
    expect(alertRole("alerta")).toBe("alert");
    expect(alertRole("exito")).toBe("status");
    expect(alertRole("info")).toBe("status");
  });
});

describe("progressPercent", () => {
  it("redondea al entero más cercano", () => {
    expect(progressPercent(12, 40)).toBe(30);
    expect(progressPercent(1, 3)).toBe(33);
  });

  it("se queda entre 0 y 100", () => {
    expect(progressPercent(50, 40)).toBe(100);
    expect(progressPercent(-5, 40)).toBe(0);
  });

  it("devuelve 0 con un máximo de cero o valores inválidos", () => {
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(Number.NaN, 10)).toBe(0);
    expect(progressPercent(5, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("stepState", () => {
  it("marca como hechos los pasos anteriores, actual el de current y pendientes los siguientes", () => {
    expect(stepState(1, 3)).toBe("hecho");
    expect(stepState(2, 3)).toBe("hecho");
    expect(stepState(3, 3)).toBe("actual");
    expect(stepState(4, 3)).toBe("pendiente");
  });

  it("con current 1 no hay pasos hechos", () => {
    expect([1, 2, 3, 4].map((step) => stepState(step, 1))).toEqual(["actual", "pendiente", "pendiente", "pendiente"]);
  });
});

describe("stepDescription", () => {
  it("describe cada paso para lectores de pantalla", () => {
    expect(stepDescription(1, 4, "Salida", 2)).toBe("Paso 1 de 4, hecho: Salida");
    expect(stepDescription(2, 4, "Pasajeros", 2)).toBe("Paso 2 de 4, paso actual: Pasajeros");
    expect(stepDescription(3, 4, "Condiciones", 2)).toBe("Paso 3 de 4: Condiciones");
  });
});

describe("formatFileSize", () => {
  it("muestra KB por debajo de 1 MB, con 1 KB como mínimo", () => {
    expect(formatFileSize(850 * 1024)).toBe("850 KB");
    expect(formatFileSize(10)).toBe("1 KB");
  });

  it("muestra MB con coma decimal", () => {
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe("1,3 MB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatFileSize(12.4 * 1024 * 1024)).toBe("12 MB");
  });

  it("no falla con valores inválidos", () => {
    expect(formatFileSize(-1)).toBe("0 KB");
    expect(formatFileSize(Number.NaN)).toBe("0 KB");
  });
});
