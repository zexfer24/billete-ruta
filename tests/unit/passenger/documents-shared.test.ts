import { describe, expect, it } from "vitest";
import {
  DOCUMENT_OK_CODES,
  DOCUMENT_OK_MESSAGES,
  documentCodeSchema,
  documentosUrl,
} from "@/app/mi/documentos/shared";

describe("contrato de URL de Documentos", () => {
  it("la foto de perfil tiene su código y su mensaje de éxito", () => {
    expect(DOCUMENT_OK_CODES.FOTO_PERFIL).toBe("perfil");
    expect(DOCUMENT_OK_MESSAGES.perfil).toBe("Guardamos tu foto de perfil.");
  });

  it("cada tipo de documento tiene un mensaje de éxito", () => {
    for (const code of Object.values(DOCUMENT_OK_CODES)) {
      expect(DOCUMENT_OK_MESSAGES[code]).toBeTruthy();
    }
  });

  it("acepta ?ok=perfil y descarta un código inventado", () => {
    expect(documentCodeSchema.parse("perfil")).toBe("perfil");
    expect(documentCodeSchema.parse("constructor")).toBeUndefined();
  });

  it("arma la URL de éxito y de error con el documento de perfil", () => {
    expect(documentosUrl({ ok: "perfil" })).toBe("/mi/documentos?ok=perfil");
    expect(documentosUrl({ error: "formato", doc: "perfil" })).toBe("/mi/documentos?error=formato&doc=perfil");
  });
});
