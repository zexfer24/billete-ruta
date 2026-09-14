import { describe, expect, it } from "vitest";
import { pasajerosUrl } from "@/app/panel/pasajeros/urls";

describe("pasajerosUrl", () => {
  it("sin parámetros devuelve solo la ruta", () => {
    expect(pasajerosUrl({})).toBe("/panel/pasajeros");
  });

  it("omite los valores vacíos o indefinidos", () => {
    expect(pasajerosUrl({ vista: undefined, salida: "", buscar: undefined })).toBe(
      "/panel/pasajeros",
    );
  });

  it("omite la página 1, por ser el valor por defecto", () => {
    expect(pasajerosUrl({ vista: "todas", pagina: 1 })).toBe("/panel/pasajeros?vista=todas");
  });

  it("conserva una página mayor a 1", () => {
    expect(pasajerosUrl({ vista: "todas", pagina: 2 })).toBe(
      "/panel/pasajeros?vista=todas&pagina=2",
    );
  });

  it("combina vista, filtros y página en un orden estable, sin importar el orden de entrada", () => {
    const a = pasajerosUrl({ vista: "por-cobrar", salida: "sal-1", buscar: "1234", pagina: 3 });
    const b = pasajerosUrl({ pagina: 3, buscar: "1234", salida: "sal-1", vista: "por-cobrar" });
    expect(a).toBe(b);
    expect(a).toBe("/panel/pasajeros?vista=por-cobrar&salida=sal-1&buscar=1234&pagina=3");
  });

  it("incluye la reserva de destino junto con el resto del contexto", () => {
    expect(pasajerosUrl({ vista: "todas", reserva: "abc-123" })).toBe(
      "/panel/pasajeros?vista=todas&reserva=abc-123",
    );
  });

  it("incluye registrar=cobro", () => {
    expect(pasajerosUrl({ registrar: "cobro" })).toBe("/panel/pasajeros?registrar=cobro");
  });

  it("combina ok y error con el resto de los parámetros, siempre en el mismo orden", () => {
    expect(
      pasajerosUrl({ vista: "pagadas", reserva: "r-1", comprobante: "c-1", ok: "aprobado", error: "algo" }),
    ).toBe("/panel/pasajeros?vista=pagadas&reserva=r-1&comprobante=c-1&ok=aprobado&error=algo");
  });
});
