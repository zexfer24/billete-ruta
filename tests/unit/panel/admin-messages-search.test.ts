import { describe, expect, it } from "vitest";
import { messageSearchFromQuery } from "@/app/panel/admin/mensajes/messages";

describe("messageSearchFromQuery", () => {
  it("reconoce un código de reserva en cualquier caja", () => {
    expect(messageSearchFromQuery("tr-0914-1pax-sa7d")).toEqual({
      code: "TR-0914-1PAX-SA7D",
      phones: [],
      idNumbers: [],
    });
  });

  it("rechaza un código mal formado", () => {
    expect(messageSearchFromQuery("TR-")).toBeNull();
    expect(messageSearchFromQuery("TR-09$4")).toBeNull();
  });

  it("lleva un teléfono con 0 inicial o con + a E.164", () => {
    expect(messageSearchFromQuery("0412 123 4567")).toEqual({ phones: ["+584121234567"], idNumbers: [] });
    expect(messageSearchFromQuery("+58 414-348-8126")).toEqual({ phones: ["+584143488126"], idNumbers: [] });
  });

  it("toma una cédula con letra tal cual y una sin letra con todas sus formas", () => {
    expect(messageSearchFromQuery("v-12.345.678")).toEqual({ phones: [], idNumbers: ["V12345678"] });
    const bare = messageSearchFromQuery("12345678");
    expect(bare?.phones).toEqual([]);
    expect(bare?.idNumbers).toContain("12345678");
    expect(bare?.idNumbers).toContain("V12345678");
    expect(bare?.idNumbers).toContain("E12345678");
  });

  it("busca un número de 10 dígitos sin 0 como teléfono de Venezuela o Colombia y como cédula", () => {
    const search = messageSearchFromQuery("3001234567");
    expect(search?.phones).toEqual(["+583001234567", "+573001234567"]);
    expect(search?.idNumbers).toContain("CC3001234567");
  });

  it("devuelve null si no es teléfono, cédula ni código", () => {
    expect(messageSearchFromQuery("María Pérez")).toBeNull();
    expect(messageSearchFromQuery("123")).toBeNull();
  });
});
