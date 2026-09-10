import { describe, expect, it } from "vitest";
import {
  caracasParts,
  durationMinutes,
  formatCaracasDate,
  formatCaracasDateTime24,
  formatCaracasTime24,
  formatDuration,
} from "@/lib/time";

describe("formato en hora de Caracas", () => {
  it("usa reloj de 24 horas", () => {
    expect(formatCaracasTime24(new Date("2026-08-16T02:00:00Z"))).toBe("22:00");
    expect(formatCaracasTime24(new Date("2026-08-15T23:30:00Z"))).toBe("19:30");
  });

  it("muestra fecha y hora completas", () => {
    expect(formatCaracasDateTime24(new Date("2026-08-16T02:00:00Z"))).toBe("15/08/2026 22:00");
  });

  it("muestra solo la fecha", () => {
    expect(formatCaracasDate(new Date("2026-08-16T02:00:00Z"))).toBe("15/08/2026");
  });

  it("extrae mes y día para el serial del ticket", () => {
    expect(caracasParts(new Date("2026-08-16T02:00:00Z"))).toEqual({ month: "08", day: "15" });
  });
});

describe("duración", () => {
  it("cuenta los minutos entre dos instantes", () => {
    expect(
      durationMinutes(new Date("2026-08-15T10:00:00Z"), new Date("2026-08-15T14:35:00Z")),
    ).toBe(275);
  });

  it("formatea horas y minutos", () => {
    expect(formatDuration(275)).toBe("4 h 35 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(0)).toBe("0 min");
  });
});
