import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Foco no oculto (WCAG 2.2, 2.4.11): globals.css reserva el alto de cada barra
 * fija con `html:has([data-*])`, así que la regla solo hace efecto si el
 * componente emite su atributo. Esta prueba mantiene sincronizados el CSS y
 * los componentes, que ya se desincronizaron una vez sin que nada lo notara.
 */
function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const css = source("src/app/globals.css");

describe.each([
  { attribute: "data-barra-inferior", file: "src/components/bottom-nav.tsx" },
  { attribute: "data-barra-panel", file: "src/components/panel-nav.tsx" },
])("$attribute", ({ attribute, file }) => {
  it("globals.css tiene la regla de relleno de desplazamiento", () => {
    expect(css).toContain(`html:has([${attribute}])`);
  });

  it(`${file} emite el atributo`, () => {
    expect(source(file)).toContain(` ${attribute}=`);
  });
});
