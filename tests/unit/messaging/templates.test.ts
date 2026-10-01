import { describe, expect, it } from "vitest";
import {
  ONCE_PER_RESERVATION_TEMPLATES,
  TEMPLATE_KEYS,
  STORED_TEXT_KEY,
  displayParam,
  isTemplateKey,
  messageRoute,
  providerParams,
  reminderRecommendations,
  renderPreview,
  renderStoredPreview,
  templateButtons,
  templateParams,
} from "@/modules/messaging/templates";

/** Sin los separadores invisibles que impiden partir los códigos en pantalla. */
function sinMarcas(texto: string): string {
  return texto.replaceAll("\u2060", "");
}

const SOLICITUD = {
  nombre: "Ana",
  pasajeros: "1",
  serial: "TR-1",
  ruta: "Caracas → Mérida",
  salida: "02/10/2026 18:00",
  limite: "01/10/2026 08:19",
};

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
    const texto = renderPreview("solicitud_recibida", { ...SOLICITUD, pasajeros: "4", serial: "TR-0815-4PAX-K7Q2" });
    expect(texto).toContain("Ana");
    expect(texto).toContain("4");
    expect(texto).toContain("TR-0815-4PAX-K7Q2");
    expect(texto).not.toContain("{{");
  });

  it("nombra el parámetro que falta", () => {
    expect(() => renderPreview("solicitud_recibida", { nombre: "Ana" })).toThrow(/pasajeros/);
  });

  it("el abono informa monto abonado y saldo pendiente", () => {
    expect(templateParams("abono_registrado")).toEqual(["nombre", "serial", "ruta", "abonado", "saldo"]);
    const texto = renderPreview("abono_registrado", {
      nombre: "Ana",
      serial: "TR-0815-3PAX-AB12",
      ruta: "Caracas → Mérida",
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
    expect(sinMarcas(texto)).toContain("TR-0001");
    expect(texto).toContain("…");
    expect(texto).not.toContain("{{");
  });

  it("con parámetros completos devuelve lo mismo que renderPreview", () => {
    const params = {
      nombre: "Ana",
      serial: "TR-0001",
      monto: "$ 50,00",
      ruta: "Caracas → Mérida",
      salida: "13/09/2026 22:00",
      limite: "13/09/2026 10:00",
    };
    expect(sinMarcas(renderStoredPreview("reserva_condicional", params))).toBe(
      renderPreview("reserva_condicional", params),
    );
  });

  it("muestra el texto que se guardó al encolar, aunque la plantilla haya cambiado", () => {
    const texto = renderStoredPreview("solicitud_recibida", {
      ...SOLICITUD,
      [STORED_TEXT_KEY]: "¡Hola Ana! Texto que se envió de verdad, TR-0913-1PAX-AAAA.",
    });
    expect(sinMarcas(texto)).toBe("¡Hola Ana! Texto que se envió de verdad, TR-0913-1PAX-AAAA.");
  });

  it("los códigos de reserva no se parten por el guion en pantalla", () => {
    const texto = renderStoredPreview("reserva_liberada", {
      nombre: "Ana",
      serial: "TR-1001-1PAX-LFC2",
      ruta: "Caracas → Mérida",
    });
    expect(texto).toContain("TR-\u20601001-\u20601PAX-\u2060LFC2");
    // El texto que se envía conserva el código tal cual, para copiarlo y buscarlo.
    expect(renderPreview("reserva_liberada", { nombre: "Ana", serial: "TR-1001-1PAX-LFC2", ruta: "X" })).toContain(
      "TR-1001-1PAX-LFC2",
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

  it("el pago en la taquilla dice la hora límite exacta, sin que haya que calcularla", () => {
    const params = {
      nombre: "Ana",
      serial: "TR-1",
      monto: "$ 29,00",
      ruta: "Caracas → Mérida",
      salida: "04/10/2026 08:00",
      limite: "03/10/2026 20:00",
    };
    expect(renderPreview("reserva_condicional", params)).toBe(
      "¡Hola Ana! Guardamos tu puesto con la reserva TR-1. Tu viaje Caracas → Mérida sale el domingo 4 de octubre a las 08:00. Paga $\u00A029,00 en la taquilla antes del sábado 3 de octubre a las 20:00 o tu puesto quedará libre.",
    );
    const recordatorio = renderPreview("reconfirmacion_pago_sitio", params);
    expect(recordatorio).toContain("en la taquilla antes del sábado 3 de octubre a las 20:00");
    expect(recordatorio).not.toContain("falten 12 horas");
  });

  it("la solicitud recibida dice cuántas personas viajan, en singular o en plural", () => {
    const uno = renderPreview("solicitud_recibida", SOLICITUD);
    expect(uno).toContain("Recibimos tu reserva TR-1 para 1 persona en el viaje Caracas → Mérida");
    const tres = renderPreview("solicitud_recibida", { ...SOLICITUD, pasajeros: "3" });
    expect(tres).toContain("para 3 personas en el viaje");
  });

  it("cada mensaje de una reserva nombra su viaje", () => {
    expect(messageRoute({ origin: "Caracas", destination: "Mérida" })).toBe("Caracas → Mérida");
    for (const key of TEMPLATE_KEYS) {
      expect(templateParams(key), key).toContain("ruta");
      const params = Object.fromEntries(templateParams(key).map((p) => [p, p === "ruta" ? "Caracas → Mérida" : "X"]));
      expect(renderPreview(key, params), key).toContain("Caracas → Mérida");
    }
  });

  it("escriben la salida con su día en palabras y la hora en 24 horas", () => {
    const params = {
      nombre: "Ana",
      serial: "TR-1",
      monto: "$ 26,00",
      ruta: "Caracas → Mérida",
      salida: "01/10/2026 06:00",
      limite: "30/09/2026 18:00",
      punto: "Terminal La Bandera",
    };
    const condicional = renderPreview("reserva_condicional", params);
    expect(condicional).toContain("Tu viaje Caracas → Mérida sale el jueves 1 de octubre a las 06:00.");
    expect(condicional).toContain("antes del miércoles 30 de septiembre a las 18:00");
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
      ruta: "Caracas → Mérida",
      motivo: "Monto no coincide",
    });
    expect(texto).toMatch(/^Hola Yolanda, /);
  });

  it("un mensaje guardado sin su texto se lee igual que uno nuevo", () => {
    const texto = renderStoredPreview("solicitud_recibida", { ...SOLICITUD, nombre: "Yolanda Rivas Rodríguez" });
    expect(sinMarcas(texto)).toBe(
      "¡Hola Yolanda! Recibimos tu reserva TR-1 para 1 persona en el viaje Caracas → Mérida, que sale el viernes 2 de octubre a las 18:00. Para no perderla, paga antes del jueves 1 de octubre a las 08:19 y envía la foto del comprobante desde tu cuenta. Cuando revisemos tu pago, te enviaremos el ticket.",
    );
  });

  it("la solicitud recibida pide pagar antes de una hora concreta, no en un plazo fijo", () => {
    // Si el bus sale antes de las 2 horas, quien encola pasa la salida como límite.
    const texto = renderPreview("solicitud_recibida", { ...SOLICITUD, salida: "01/10/2026 06:39", limite: "01/10/2026 06:39" });
    expect(texto).toContain("que sale el jueves 1 de octubre a las 06:39");
    expect(texto).toContain("paga antes del jueves 1 de octubre a las 06:39");
    expect(texto).not.toContain("próximas");
    expect(texto).toContain("foto del comprobante");
  });

  it("el aviso de dos horas antes informa la hora y el punto de encuentro, sin pregunta", () => {
    const texto = renderPreview("confirmacion_2h", {
      nombre: "Ana Pérez",
      serial: "TR-0922-1PAX-JLRC",
      ruta: "Caracas → Mérida",
      salida: "01/10/2026 06:00",
      punto: "Terminal La Bandera, andén 3",
    });
    expect(texto).toBe(
      "Hola Ana, tu viaje Caracas → Mérida con la reserva TR-0922-1PAX-JLRC sale el jueves 1 de octubre a las 06:00 desde Terminal La Bandera, andén 3. Ve al terminal con tiempo y con tu cédula en mano.",
    );
    expect(texto).not.toContain("?");
    expect(texto).not.toContain("en tu cuenta");
  });

  it("el proveedor recibe solo los parámetros declarados, ya en lenguaje llano", () => {
    const enviados = providerParams("solicitud_recibida", {
      ...SOLICITUD,
      nombre: "Yolanda Rivas Rodríguez",
      [STORED_TEXT_KEY]: "texto guardado",
    });
    expect(enviados).toEqual({
      nombre: "Yolanda",
      pasajeros: "1 persona",
      serial: "TR-1",
      ruta: "Caracas → Mérida",
      salida: "viernes 2 de octubre a las 18:00",
      limite: "jueves 1 de octubre a las 08:19",
    });
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
    expect(displayParam("limite", "01/10/2026 06:00")).toBe("jueves 1 de octubre a las 06:00");
    expect(displayParam("pasajeros", "dos")).toBe("dos");
  });
});

describe("recordatorio de 24 horas", () => {
  const RECORDATORIO = {
    nombre: "Ana María Pérez",
    serial: "TR-1001-1PAX-GQS8",
    ruta: "Caracas → Mérida",
    salida: "01/10/2026 10:00",
    punto: "Terminal La Bandera, andén 8",
  };

  it("a una reserva pagada solo le recuerda llegar con tiempo", () => {
    const texto = renderPreview("recordatorio_24h", {
      ...RECORDATORIO,
      recomendaciones: reminderRecommendations({ travelTips: "Llega 45 minutos antes con tu cédula en mano." }),
    });
    expect(texto).toBe(
      "Hola Ana, tu viaje Caracas → Mérida con la reserva TR-1001-1PAX-GQS8 sale el jueves 1 de octubre a las 10:00 desde Terminal La Bandera, andén 8. Llega 45 minutos antes con tu cédula en mano.",
    );
  });

  it("a una reserva pagada en parte le dice primero cuánto le falta y qué pasa si no paga", () => {
    const texto = renderPreview("recordatorio_24h", {
      ...RECORDATORIO,
      recomendaciones: reminderRecommendations({
        travelTips: "Llega 45 minutos antes con tu cédula en mano.",
        saldo: "$ 19,12",
      }),
    });
    expect(texto).toBe(
      "Hola Ana, tu viaje Caracas → Mérida con la reserva TR-1001-1PAX-GQS8 sale el jueves 1 de octubre a las 10:00 desde Terminal La Bandera, andén 8. Todavía te falta pagar $ 19,12: sin ese pago no recibes tu ticket y no puedes abordar. Paga desde tu cuenta o en la taquilla. Llega 45 minutos antes con tu cédula en mano.",
    );
  });

  it("sin recomendaciones propias de la ruta usa las de siempre", () => {
    expect(reminderRecommendations({ travelTips: null })).toBe("Llega 30 minutos antes con tu cédula en mano.");
    expect(reminderRecommendations({ travelTips: "  " })).toBe("Llega 30 minutos antes con tu cédula en mano.");
    expect(reminderRecommendations({ travelTips: null, saldo: "" })).toBe(
      "Llega 30 minutos antes con tu cédula en mano.",
    );
  });
});
