import { promises as fsp } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { InvalidImageError } from "@/lib/storage";
import { missingDocuments, uploadDocument } from "@/modules/accounts";
import { createAccountFixture, seedRatesFixture } from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

const FIXTURES = path.resolve(__dirname, "../../fixtures");

describe("uploadDocument con FOTO_PERFIL", () => {
  it("crea el documento, guarda el archivo y audita la carga del pasajero", async () => {
    const cuenta = await createAccountFixture();
    const data = await fsp.readFile(path.join(FIXTURES, "cedula.png"));

    const { documentId, filePath } = await uploadDocument({
      accountId: cuenta.id,
      type: "FOTO_PERFIL",
      originalName: "perfil.png",
      data,
    });

    const documento = await prisma.passengerDocument.findUniqueOrThrow({ where: { id: documentId } });
    expect(documento.type).toBe("FOTO_PERFIL");
    expect(documento.accountId).toBe(cuenta.id);
    await expect(fsp.access(path.resolve(getEnv().UPLOADS_DIR, filePath))).resolves.toBeUndefined();

    const auditoria = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: documentId, action: "DOCUMENTO_CARGADO" },
    });
    expect(auditoria.actorType).toBe("PASAJERO");
    expect(auditoria.actorAccountId).toBe(cuenta.id);
  });

  it("rechaza un archivo que no es imagen", async () => {
    const cuenta = await createAccountFixture();
    const data = await fsp.readFile(path.join(FIXTURES, "no-es-imagen.png"));

    await expect(
      uploadDocument({ accountId: cuenta.id, type: "FOTO_PERFIL", originalName: "perfil.png", data }),
    ).rejects.toThrow(InvalidImageError);
    expect(await prisma.passengerDocument.count({ where: { type: "FOTO_PERFIL" } })).toBe(0);
  });
});

describe("missingDocuments", () => {
  it("nunca exige la foto de perfil", async () => {
    const cuenta = await createAccountFixture();
    expect(await missingDocuments(cuenta.id, false)).toEqual([]);
    expect(await missingDocuments(cuenta.id, true)).toEqual(["PERMISO_VIAJE"]);

    const sinCedula = await createAccountFixture({ withCedula: false });
    expect(await missingDocuments(sinCedula.id, false)).toEqual(["CEDULA"]);
  });
});
