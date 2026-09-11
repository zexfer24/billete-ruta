import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerAccount } from "@/modules/accounts";
import { ValidationError } from "@/modules/booking/errors";
import { seedRatesFixture } from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

describe("registerAccount", () => {
  it("guarda nombres, apellidos y el nombre completo compuesto", async () => {
    const { accountId } = await registerAccount({
      idNumber: "V12345678",
      givenNames: "María José",
      surnames: "Pérez  Rivas",
      phone: "0412-1112233",
      birthYear: 1990,
      password: "Pasajero.2026",
    });

    const cuenta = await prisma.passengerAccount.findUniqueOrThrow({
      where: { id: accountId },
    });
    expect(cuenta.givenNames).toBe("María José");
    expect(cuenta.surnames).toBe("Pérez Rivas");
    expect(cuenta.fullName).toBe("María José Pérez Rivas");
  });

  it("rechaza nombres vacíos o muy cortos", async () => {
    await expect(
      registerAccount({
        idNumber: "V87654321",
        givenNames: "A",
        surnames: "Pérez Rivas",
        phone: "0412-1112233",
        birthYear: 1990,
        password: "Pasajero.2026",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rechaza apellidos vacíos o muy cortos", async () => {
    await expect(
      registerAccount({
        idNumber: "V87654322",
        givenNames: "María José",
        surnames: "B",
        phone: "0412-1112233",
        birthYear: 1990,
        password: "Pasajero.2026",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("guarda la auditoría CUENTA_CREADA con nombres, apellidos y nombre completo", async () => {
    const { accountId } = await registerAccount({
      idNumber: "V11223344",
      givenNames: "Luis",
      surnames: "Gómez Salas",
      phone: "0412-1112233",
      birthYear: 1990,
      password: "Pasajero.2026",
    });

    const registro = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: accountId, action: "CUENTA_CREADA" },
    });
    expect(registro.after).toMatchObject({
      idNumber: "V11223344",
      givenNames: "Luis",
      surnames: "Gómez Salas",
      fullName: "Luis Gómez Salas",
    });
  });
});
