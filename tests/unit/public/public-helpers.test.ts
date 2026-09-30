import { describe, expect, it } from "vitest";
import {
  firstParam,
  loginHref,
  passengerHref,
  registerHref,
  withNext,
} from "@/app/_publico/links";
import {
  fieldErrorsFromIssues,
  formText,
  isExistingAccountError,
  REGISTER_FIELDS,
  registerDomainErrorField,
} from "@/app/_publico/form-errors";
import {
  claimActionLabel,
  claimDeadlineLabel,
  claimRemainingLabel,
  claimTitle,
  heldSeatsLabel,
} from "@/app/lista-espera/waitlist-labels";

describe("enlaces con next", () => {
  it("conserva una ruta interna y la codifica", () => {
    expect(loginHref("/mi/reservar?departureId=abc")).toBe(
      "/ingresar?next=%2Fmi%2Freservar%3FdepartureId%3Dabc",
    );
    expect(registerHref("/mi")).toBe("/registro?next=%2Fmi");
  });

  it("descarta un next externo, vacío o de protocolo relativo", () => {
    expect(loginHref("https://evil.com")).toBe("/ingresar");
    expect(registerHref("//evil.com")).toBe("/registro");
    expect(loginHref(undefined)).toBe("/ingresar");
    expect(loginHref("")).toBe("/ingresar");
  });

  it("agrega next con & si la ruta ya tiene parámetros", () => {
    expect(withNext("/registro?x=1", "/mi")).toBe("/registro?x=1&next=%2Fmi");
  });

  it("lleva a /mi directo con sesión y pasando por ingresar sin ella", () => {
    expect(passengerHref("/mi/reservar", true)).toBe("/mi/reservar");
    expect(passengerHref("/mi/reservar", false)).toBe("/ingresar?next=%2Fmi%2Freservar");
  });

  it("toma el primer valor de un parámetro repetido", () => {
    expect(firstParam(["/mi", "/otra"])).toBe("/mi");
    expect(firstParam("/mi")).toBe("/mi");
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("errores de los formularios públicos", () => {
  it("lee texto y trata lo demás como vacío", () => {
    const datos = new FormData();
    datos.set("idNumber", "V123");
    expect(formText(datos, "idNumber")).toBe("V123");
    expect(formText(datos, "falta")).toBe("");
  });

  it("deja el primer error de cada campo conocido", () => {
    const errores = fieldErrorsFromIssues(
      [
        { path: ["idNumber"], message: "Escribe tu cédula." },
        { path: ["idNumber"], message: "Otro error." },
        { path: ["password"], message: "La contraseña debe tener al menos 8 caracteres." },
        { path: ["next"], message: "No es un campo del formulario." },
        { path: [], message: "Sin campo." },
      ],
      REGISTER_FIELDS,
    );
    expect(errores).toEqual({
      idNumber: "Escribe tu cédula.",
      password: "La contraseña debe tener al menos 8 caracteres.",
    });
  });

  it("ubica en su campo los errores de dominio del registro", () => {
    expect(registerDomainErrorField("La cédula no tiene un formato válido.")).toBe("idNumber");
    expect(registerDomainErrorField("El número de teléfono no es válido.")).toBe("phone");
    expect(registerDomainErrorField("El año de nacimiento no es válido.")).toBe("birthYear");
    expect(
      registerDomainErrorField(
        "Esta cédula tiene una cuenta creada en taquilla y los datos no coinciden. Acércate a la taquilla de tu agencia.",
      ),
    ).toBeNull();
  });

  it("reconoce el aviso de cuenta existente", () => {
    expect(
      isExistingAccountError(
        "Ya existe una cuenta con la cédula V12345678. Intenta ingresar en vez de registrarte.",
      ),
    ).toBe(true);
    expect(isExistingAccountError("La cédula no tiene un formato válido.")).toBe(false);
  });
});

describe("textos de la lista de espera", () => {
  // 16:00Z son las 12:00 en Caracas (UTC-4).
  const now = new Date("2026-09-30T16:00:00Z");

  it("usa singular o plural según los puestos", () => {
    expect(claimTitle(1)).toBe("¡Se liberó un puesto para ti!");
    expect(claimTitle(2)).toBe("¡Se liberaron 2 puestos para ti!");
    expect(heldSeatsLabel(1)).toBe("Guardamos 1 puesto para ti");
    expect(heldSeatsLabel(3)).toBe("Guardamos 3 puestos para ti");
    expect(claimActionLabel(1)).toBe("Reservar mi puesto");
    expect(claimActionLabel(2)).toBe("Reservar mis 2 puestos");
  });

  it("dice hasta cuándo vale el aviso en hora de Caracas", () => {
    expect(claimDeadlineLabel(new Date("2026-09-30T18:30:00Z"), now)).toBe("hoy a las 14:30");
    expect(claimDeadlineLabel(new Date("2026-10-01T12:00:00Z"), now)).toBe("el 01/10 a las 08:00");
  });

  it("dice cuánto tiempo queda", () => {
    expect(claimRemainingLabel(new Date(now.getTime() + 25 * 60_000), now)).toBe("Te quedan 25 min");
    expect(claimRemainingLabel(new Date(now.getTime() + 130 * 60_000), now)).toBe("Te quedan 2 h 10 min");
    expect(claimRemainingLabel(new Date(now.getTime() + 20_000), now)).toBe("Te queda menos de un minuto");
  });
});
