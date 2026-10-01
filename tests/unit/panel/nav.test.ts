import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  isActivePanelPath,
  legacyPanelRedirect,
  OPERATOR_NAV,
  panelHomeForPath,
  panelNavHomeHref,
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

describe("ADMIN_NAV", () => {
  it("tiene dos grupos con las etiquetas exactas", () => {
    expect(ADMIN_NAV.map((group) => group.label)).toEqual(["Supervisión", "Terminal"]);
  });

  it("tiene los href y las etiquetas exactas, en orden", () => {
    const links = ADMIN_NAV.flatMap((group) => group.links.map((link) => [link.href, link.label]));
    expect(links).toEqual([
      ["/panel/admin/tablero", "Tablero"],
      ["/panel/admin/movimientos", "Movimientos"],
      ["/panel/admin/usuarios", "Usuarios"],
      ["/panel/admin/agencias", "Agencias"],
      ["/panel/admin/tasas", "Tasas y precios"],
      ["/panel/admin/mensajes", "Mensajes"],
    ]);
  });

  it("no repite iconos ni destinos", () => {
    const links = ADMIN_NAV.flatMap((group) => group.links);
    expect(new Set(links.map((link) => link.href)).size).toBe(links.length);
    expect(new Set(links.map((link) => link.icon)).size).toBe(links.length);
  });

  it("no comparte destinos con el menú del operador", () => {
    const operador = new Set(OPERATOR_NAV.flatMap((group) => group.links.map((link) => link.href)));
    for (const link of ADMIN_NAV.flatMap((group) => group.links)) {
      expect(operador.has(link.href)).toBe(false);
    }
  });
});

describe("isActivePanelPath en rutas del admin", () => {
  it("cada sección queda activa con igualdad, subruta o barra final", () => {
    expect(isActivePanelPath("/panel/admin/tablero", "/panel/admin/tablero")).toBe(true);
    expect(isActivePanelPath("/panel/admin/tablero/", "/panel/admin/tablero")).toBe(true);
    expect(isActivePanelPath("/panel/admin/agencias/abc", "/panel/admin/agencias")).toBe(true);
  });

  it("una sección no activa a otra ni a un prefijo parecido", () => {
    expect(isActivePanelPath("/panel/admin/tablero", "/panel/admin/movimientos")).toBe(false);
    expect(isActivePanelPath("/panel/admin/tasasx", "/panel/admin/tasas")).toBe(false);
    expect(isActivePanelPath("/panel/admin", "/panel/admin/tablero")).toBe(false);
  });

  it("marca exactamente un enlace del menú en cada sección", () => {
    const links = ADMIN_NAV.flatMap((group) => group.links);
    for (const link of links) {
      const activos = links.filter((otro) => isActivePanelPath(`${link.href}/detalle`, otro.href));
      expect(activos.map((otro) => otro.href)).toEqual([link.href]);
    }
  });

  it("las rutas del admin no activan el tablero del operador", () => {
    expect(isActivePanelPath("/panel/admin/tablero", "/panel")).toBe(false);
  });
});

describe("panelNavHomeHref", () => {
  it("es el primer enlace del primer grupo", () => {
    expect(panelNavHomeHref(OPERATOR_NAV)).toBe("/panel");
    expect(panelNavHomeHref(ADMIN_NAV)).toBe("/panel/admin/tablero");
  });

  it("cae en /panel con un menú vacío", () => {
    expect(panelNavHomeHref([])).toBe("/panel");
    expect(panelNavHomeHref([{ label: "Vacío", links: [] }])).toBe("/panel");
  });
});

describe("panelHomeForPath", () => {
  it("bajo /panel/admin lleva al tablero del terminal", () => {
    expect(panelHomeForPath("/panel/admin")).toBe("/panel/admin/tablero");
    expect(panelHomeForPath("/panel/admin/agencias/abc")).toBe("/panel/admin/tablero");
    expect(panelHomeForPath("/panel/admin/")).toBe("/panel/admin/tablero");
  });

  it("en el resto del panel lleva al tablero de la agencia", () => {
    expect(panelHomeForPath("/panel/salidas/abc")).toBe("/panel");
    expect(panelHomeForPath("/panel/administracion")).toBe("/panel");
    expect(panelHomeForPath("/panel")).toBe("/panel");
  });
});
