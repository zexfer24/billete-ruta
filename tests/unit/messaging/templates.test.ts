import { describe, expect, it } from "vitest";
import {
  ONCE_PER_RESERVATION_TEMPLATES,
  TEMPLATE_KEYS,
  isTemplateKey,
  renderPreview,
  renderStoredPreview,
  templateButtons,
  templateParams,
} from "@/modules/messaging/templates";

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
    expect(texto).toContain("$ 50,00");
    expect(texto).toContain("$ 92,50");
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

  it("la solicitud recibida no necesita plural para el número de pasajeros", () => {
    const uno = renderPreview("solicitud_recibida", { nombre: "Ana", pasajeros: "1", serial: "TR-1" });
    expect(uno).toContain("Pasajeros: 1.");
  });
});
