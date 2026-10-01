import { describe, expect, it } from "vitest";
import { parseRegisterMode } from "@/app/registro/mode";
import {
  activateHref,
  ID_NUMBER_EMPTY_ERROR,
  ID_NUMBER_HINT,
  REGISTER_HINTS,
  REGISTER_TEXTS,
} from "@/app/registro/texts";

describe("modo del registro", () => {
  it("activa solo con ?modo=activar", () => {
    expect(parseRegisterMode("activar")).toBe("activar");
    expect(parseRegisterMode("crear")).toBe("crear");
  });

  it("cae a crear con un modo vacío, desconocido o mal formado", () => {
    expect(parseRegisterMode(undefined)).toBe("crear");
    expect(parseRegisterMode("")).toBe("crear");
    expect(parseRegisterMode("ACTIVAR")).toBe("crear");
    expect(parseRegisterMode("borrar")).toBe("crear");
    expect(parseRegisterMode("activar ")).toBe("crear");
  });

  it("con el modo repetido toma el primero", () => {
    expect(parseRegisterMode(["activar", "crear"])).toBe("activar");
    expect(parseRegisterMode(["x", "activar"])).toBe("crear");
  });

  it("cada modo dice lo mismo en el título y en el botón", () => {
    expect(REGISTER_TEXTS.crear.title).toBe("Crea tu cuenta");
    expect(REGISTER_TEXTS.crear.submit).toBe("Crear mi cuenta");
    expect(REGISTER_TEXTS.activar.title).toBe("Activa tu cuenta");
    expect(REGISTER_TEXTS.activar.submit).toBe("Activar mi cuenta");
  });
});

describe("enlace de activación", () => {
  it("lleva a /registro?modo=activar y conserva next", () => {
    expect(activateHref()).toBe("/registro?modo=activar");
    expect(activateHref("/mi/reservar?departureId=abc")).toBe(
      "/registro?modo=activar&next=%2Fmi%2Freservar%3FdepartureId%3Dabc",
    );
  });

  it("descarta un next externo", () => {
    expect(activateHref("//evil.com")).toBe("/registro?modo=activar");
    expect(activateHref("https://evil.com")).toBe("/registro?modo=activar");
  });
});

describe("textos de la cédula", () => {
  it("ingresar y registro comparten la ayuda y el error de campo vacío", () => {
    expect(REGISTER_HINTS.idNumber).toBe(ID_NUMBER_HINT);
    expect(ID_NUMBER_EMPTY_ERROR).toBe("Escribe tu cédula: la letra y el número, por ejemplo V12345678.");
  });
});
