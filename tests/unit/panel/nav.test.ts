import { describe, expect, it } from "vitest";
import {
  isActivePanelPath,
  legacyPanelRedirect,
  OPERATOR_NAV,
  parsePanelOrigin,
} from "@/lib/panel-nav";

describe("isActivePanelPath", () => {
  it("el tablero solo queda activo con igualdad exacta", () => {
    expect(isActivePanelPath("/panel", "/panel")).toBe(true);
    expect(isActivePanelPath("/panel/", "/panel")).toBe(true);
    expect(isActivePanelPath("/panel/pasajeros", "/panel")).toBe(false);
  });

  it("otras rutas quedan activas con igualdad o subruta", () => {
    expect(isActivePanelPath("/panel/salidas/abc", "/panel/salidas")).toBe(true);
    expect(isActivePanelPath("/panel/salidasx", "/panel/salidas")).toBe(false);
    expect(isActivePanelPath("/panel/flota", "/panel/flota")).toBe(true);
  });

  it("el abordaje activa el enlace de salidas, por ser parte de su flujo", () => {
    expect(isActivePanelPath("/panel/abordaje/abc", "/panel/salidas")).toBe(true);
  });
});

describe("parsePanelOrigin", () => {
  it("acepta solo el valor exacto 'tablero'", () => {
    expect(parsePanelOrigin("tablero")).toBe("tablero");
  });

  it("rechaza cualquier otro valor sin normalizar", () => {
    expect(parsePanelOrigin(null)).toBeNull();
    expect(parsePanelOrigin("")).toBeNull();
    expect(parsePanelOrigin("TABLERO")).toBeNull();
    expect(parsePanelOrigin("/panel")).toBeNull();
    expect(parsePanelOrigin("https://evil.test")).toBeNull();
    expect(parsePanelOrigin(42)).toBeNull();
  });
});

describe("legacyPanelRedirect", () => {
  it("/panel/pagos redirige a pasajeros en la vista por revisar", () => {
    expect(legacyPanelRedirect("/panel/pagos", {})).toBe("/panel/pasajeros?vista=por-revisar");
  });

  it("/panel/vehiculos redirige a flota en la vista de vehículos", () => {
    expect(legacyPanelRedirect("/panel/vehiculos", {})).toBe("/panel/flota?vista=vehiculos");
  });

  it("/panel/choferes redirige a flota en la vista de choferes", () => {
    expect(legacyPanelRedirect("/panel/choferes", {})).toBe("/panel/flota?vista=choferes");
  });

  it("/panel/recaudacion redirige a reportes en la vista de recaudación", () => {
    expect(legacyPanelRedirect("/panel/recaudacion", {})).toBe("/panel/reportes?vista=recaudacion");
  });

  it("/panel/movimientos redirige a reportes en la vista de movimientos", () => {
    expect(legacyPanelRedirect("/panel/movimientos", {})).toBe("/panel/reportes?vista=movimientos");
  });

  it("conserva un parámetro permitido", () => {
    expect(legacyPanelRedirect("/panel/pagos", { comprobante: "abc-123" })).toBe(
      "/panel/pasajeros?vista=por-revisar&comprobante=abc-123",
    );
  });

  it("descarta un parámetro que no está permitido para esa ruta", () => {
    expect(legacyPanelRedirect("/panel/pagos", { agencyId: "otra-agencia" })).toBe(
      "/panel/pasajeros?vista=por-revisar",
    );
  });

  it("un arreglo usa su primer valor", () => {
    expect(legacyPanelRedirect("/panel/recaudacion", { desde: ["2026-09-01", "2026-09-02"] })).toBe(
      "/panel/reportes?vista=recaudacion&desde=2026-09-01",
    );
  });

  it("un valor vacío o indefinido se omite", () => {
    expect(
      legacyPanelRedirect("/panel/movimientos", { desde: "", hasta: undefined }),
    ).toBe("/panel/reportes?vista=movimientos");
  });
});

describe("OPERATOR_NAV", () => {
  it("tiene tres grupos con las etiquetas exactas", () => {
    expect(OPERATOR_NAV.map((group) => group.label)).toEqual(["Operación", "Flota", "Reportes"]);
  });

  it("tiene los href exactos de la tabla, en orden", () => {
    const hrefs = OPERATOR_NAV.flatMap((group) => group.links.map((link) => link.href));
    expect(hrefs).toEqual([
      "/panel",
      "/panel/taquilla",
      "/panel/pasajeros",
      "/panel/salidas",
      "/panel/flota",
      "/panel/reportes",
    ]);
  });
});
