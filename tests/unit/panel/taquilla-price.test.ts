import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { perPassengerPrice } from "@/app/panel/taquilla/price";

describe("perPassengerPrice", () => {
  it("suma la tarifa de la agencia y la tasa del terminal de una persona", () => {
    expect(perPassengerPrice(new Prisma.Decimal("45"), new Prisma.Decimal("1"))).toEqual({
      taxUsd: "1",
      totalUsd: "46",
    });
  });

  it("redondea a céntimos como el cobro", () => {
    expect(perPassengerPrice(new Prisma.Decimal("45.505"), new Prisma.Decimal("2.5"))).toEqual({
      taxUsd: "2.5",
      totalUsd: "48.01",
    });
  });
});
