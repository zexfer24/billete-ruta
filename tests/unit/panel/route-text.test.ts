import { describe, expect, it } from "vitest";
import { arrowRouteName, routeSubtitle } from "@/app/panel/_shared/route-text";

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

describe("arrowRouteName", () => {
  it("cambia el guion o la raya entre ciudades por la flecha", () => {
    expect(arrowRouteName("Caracas – San Cristóbal")).toBe("Caracas → San Cristóbal");
    expect(arrowRouteName("Caracas - Mérida")).toBe("Caracas → Mérida");
  });

  it("deja igual un nombre sin separador, uno con guion pegado o uno que ya tiene flecha", () => {
    expect(arrowRouteName("Expreso Los Llanos")).toBe("Expreso Los Llanos");
    expect(arrowRouteName("Puerto La Cruz-Express")).toBe("Puerto La Cruz-Express");
    expect(arrowRouteName("Caracas → Barinas")).toBe("Caracas → Barinas");
  });
});
