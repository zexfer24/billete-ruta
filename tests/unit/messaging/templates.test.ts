import { describe, expect, it } from "vitest";
import {
  ONCE_PER_RESERVATION_TEMPLATES,
  TEMPLATE_KEYS,
  displayParam,
  isTemplateKey,
  renderPreview,
  renderStoredPreview,
  templateButtons,
  templateParams,
} from "@/modules/messaging/templates";
import { UNPAID_EXPIRY_MINUTES } from "@/modules/scheduler";

describe("catálogo de plantillas", () => {
  it("declara exactamente las diez plantillas de la especificación", () => {
    expect([...TEMPLATE_KEYS].sort()).toEqual([
      "abono_registrado",
      "confirmacion_2h",
      "cupo_disponible_lista_espera",
      "pago_rechazado",
      "reconfirmacion_pago_sitio",
      "recordatorio_24h",
      "reserva_condicional",
      "reserva_liberada",
      "solicitud_recibida",
      "ticket_emitido",
    ]);
  });

  it("marca como únicas por reserva solo las cuatro plantillas programadas", () => {
    expect([...ONCE_PER_RESERVATION_TEMPLATES].sort()).toEqual([
      "confirmacion_2h",
      "reconfirmacion_pago_sitio",
      "recordatorio_24h",
      "ticket_emitido",
    ]);
  });

  it("declara los botones de reconfirmación y de asistencia", () => {
    expect(templateButtons("reconfirmacion_pago_sitio")).toEqual(["RECONFIRMAR"]);
    expect(templateButtons("confirmacion_2h")).toEqual(["ASISTE", "INCONVENIENTE"]);
    expect(templateButtons("solicitud_recibida")).toEqual([]);
  });

  it("reconoce claves válidas e inválidas", () => {
    expect(isTemplateKey("ticket_emitido")).toBe(true);
    expect(isTemplateKey("no_existe")).toBe(false);
  });
});

describe("renderPreview", () => {
  it("sustituye todos los parámetros", () => {
    const texto = renderPreview("solicitud_recibida", {
      nombre: "Ana",
      pasajeros: "4",
      serial: "TR-0815-4PAX-K7Q2",
    });
    expect(texto).toContain("Ana");
    expect(texto).toContain("4");
    expect(texto).toContain("TR-0815-4PAX-K7Q2");
    expect(texto).not.toContain("{{");
  });

  it("nombra el parámetro que falta", () => {
    expect(() => renderPreview("solicitud_recibida", { nombre: "Ana" })).toThrow(/pasajeros/);
  });

  it("el abono informa monto abonado y saldo pendiente", () => {
    expect(templateParams("abono_registrado")).toEqual(["nombre", "serial", "abonado", "saldo"]);
    const texto = renderPreview("abono_registrado", {
      nombre: "Ana",
      serial: "TR-0815-3PAX-AB12",
      abonado: "$ 50,00",
      saldo: "$ 92,50",
    });
    expect(texto).toContain("$\u00A050,00");
    expect(texto).toContain("$\u00A092,50");
  });
});

describe("renderStoredPreview", () => {
  it("nunca lanza y rellena los parámetros ausentes con puntos suspensivos", () => {
    const texto = renderStoredPreview("reserva_condicional", {
      nombre: "Ana",
      serial: "TR-0001",
    });
    expect(texto).toContain("Ana");
    expect(texto).toContain("TR-0001");
    expect(texto).toContain("…");
    expect(texto).not.toContain("{{");
  });

  it("con parámetros completos devuelve lo mismo que renderPreview", () => {
    const params = {
      nombre: "Ana",
      serial: "TR-0001",
      monto: "$ 50,00",
      salida: "13/09/2026 22:00",
    };
    expect(renderStoredPreview("reserva_condicional", params)).toBe(
      renderPreview("reserva_condicional", params),
    );
  });
});

describe("textos de las plantillas", () => {
  it("usan lenguaje llano: sin plurales con paréntesis ni jerga interna", () => {
    for (const key of TEMPLATE_KEYS) {
      const params = Object.fromEntries(templateParams(key).map((p) => [p, "X"]));
      const texto = renderPreview(key, params).toLowerCase();
      for (const jerga of ["(s)", "cupo", "en sitio", "validar", "validado", "validemos", "reconfirm", "serial", "por este medio"]) {
        expect(texto, `${key} contiene "${jerga}"`).not.toContain(jerga);
      }
    }
  });

  it("el pago en la taquilla explica el plazo real de 12 horas", () => {
    for (const key of ["reserva_condicional", "reconfirmacion_pago_sitio"] as const) {
      const params = Object.fromEntries(templateParams(key).map((p) => [p, "X"]));
      const texto = renderPreview(key, params);
      expect(texto).toContain("taquilla");
      expect(texto).toContain("falten 12 horas para la salida");
      expect(texto).toContain("puesto");
    }
  });

  it("la solicitud recibida dice cuántas personas viajan, en singular o en plural", () => {
    const uno = renderPreview("solicitud_recibida", { nombre: "Ana", pasajeros: "1", serial: "TR-1" });
    expect(uno).toContain("Recibimos tu reserva TR-1 para 1 persona.");
    const tres = renderPreview("solicitud_recibida", { nombre: "Ana", pasajeros: "3", serial: "TR-1" });
    expect(tres).toContain("para 3 personas.");
  });

  it("escriben la salida con su día en palabras y la hora en 24 horas", () => {
    const params = {
      nombre: "Ana",
      serial: "TR-1",
      monto: "$ 26,00",
      salida: "01/10/2026 06:00",
      punto: "Terminal La Bandera",
    };
    const condicional = renderPreview("reserva_condicional", params);
    expect(condicional).toContain("Tu viaje sale el jueves 1 de octubre a las 06:00.");
    expect(condicional).toContain("Paga $\u00A026,00 en la taquilla");
    const ticket = renderPreview("ticket_emitido", params);
    expect(ticket).toContain("sale el jueves 1 de octubre a las 06:00 desde Terminal La Bandera.");
    for (const key of TEMPLATE_KEYS) {
      const todos = Object.fromEntries(templateParams(key).map((p) => [p, params[p as keyof typeof params] ?? "X"]));
      const texto = renderPreview(key, todos);
      expect(texto, key).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(texto, key).not.toMatch(/(Salida|Total|Pasajeros|Punto de encuentro): /);
    }
  });

  it("saludan por el primer nombre, no por el nombre completo", () => {
    const texto = renderPreview("pago_rechazado", {
      nombre: "Yolanda Rivas Rodríguez",
      serial: "TR-1",
      motivo: "Monto no coincide",
    });
    expect(texto).toMatch(/^Hola Yolanda, /);
  });

  it("un mensaje ya guardado se lee igual que uno nuevo", () => {
    const texto = renderStoredPreview("solicitud_recibida", {
      nombre: "Yolanda Rivas Rodríguez",
      pasajeros: "1",
      serial: "TR-1",
    });
    expect(texto).toBe(
      "¡Hola Yolanda! Recibimos tu reserva TR-1 para 1 persona. Para no perderla, paga en las próximas 2 horas y envía la foto del comprobante desde tu cuenta. Cuando revisemos tu pago, te enviaremos el ticket.",
    );
  });

  it("la solicitud recibida pide pagar y dice el plazo antes de liberar el puesto", () => {
    const texto = renderPreview("solicitud_recibida", { nombre: "Ana", pasajeros: "1", serial: "TR-1" });
    expect(texto).toContain(`paga en las próximas ${UNPAID_EXPIRY_MINUTES / 60} horas`);
    expect(texto).toContain("foto del comprobante");
  });

  it("el aviso de dos horas antes es un recordatorio, sin pregunta que no se puede contestar", () => {
    const texto = renderPreview("confirmacion_2h", { nombre: "Ana Pérez", serial: "TR-0922-1PAX-JLRC" });
    expect(texto).toBe(
      "Hola Ana, tu viaje TR-0922-1PAX-JLRC sale en unas dos horas o menos. Ve al terminal con tiempo y con tu cédula en mano. La hora y el lugar de salida están en tu cuenta.",
    );
    expect(texto).not.toContain("?");
  });

  it("pegan el símbolo de la moneda a la cifra para que el monto no se parta entre líneas", () => {
    expect(displayParam("monto", "$ 41,00")).toBe("$\u00A041,00");
    expect(displayParam("abonado", "Bs. 1.200,50")).toBe("Bs.\u00A01.200,50");
    expect(displayParam("saldo", "COP 80.000,00")).toBe("COP\u00A080.000,00");
    expect(displayParam("monto", "USDT 10,00")).toBe("USDT\u00A010,00");
    expect(displayParam("serial", "$ 41,00")).toBe("$ 41,00");
    const guardado = renderStoredPreview("abono_registrado", {
      nombre: "Ana",
      serial: "TR-1",
      abonado: "$ 26,65",
      saldo: "$ 14,35",
    });
    expect(guardado).toContain("tu pago de $\u00A026,65 para");
    expect(guardado).toContain("Te falta pagar $\u00A014,35.");
  });

  it("deja igual una fecha que no tiene el formato guardado", () => {
    expect(displayParam("salida", "mañana a las 06:00")).toBe("mañana a las 06:00");
    expect(displayParam("salida", "31/02/2026 06:00")).toBe("31/02/2026 06:00");
    expect(displayParam("pasajeros", "dos")).toBe("dos");
  });
});
