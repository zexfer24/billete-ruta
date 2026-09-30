import { describe, expect, it } from "vitest";
import { routeSubtitle } from "@/app/panel/_shared/route-text";

describe("routeSubtitle", () => {
  it("no repite el nombre cuando ya es origen y destino con raya", () => {
    expect(routeSubtitle("Caracas – San Cristóbal", "Caracas", "San Cristóbal")).toBeNull();
  });

  it("no repite el nombre con guion, flecha o espacios de más", () => {
    expect(routeSubtitle("Caracas - Maracaibo", "Caracas", "Maracaibo")).toBeNull();
    expect(routeSubtitle("Caracas → Maracaibo", "Caracas", "Maracaibo")).toBeNull();
    expect(routeSubtitle("  caracas   –  maracaibo ", "Caracas", "Maracaibo")).toBeNull();
  });

  it("ignora los acentos al comparar", () => {
    expect(routeSubtitle("Caracas – San Cristobal", "Caracas", "San Cristóbal")).toBeNull();
  });

  it("muestra origen y destino cuando el nombre es distinto", () => {
    expect(routeSubtitle("Expreso de los Andes", "Caracas", "Mérida")).toBe("Caracas → Mérida");
  });

  it("muestra origen y destino si el nombre va en otro orden", () => {
    expect(routeSubtitle("San Cristóbal – Caracas", "Caracas", "San Cristóbal")).toBe("Caracas → San Cristóbal");
  });
});
