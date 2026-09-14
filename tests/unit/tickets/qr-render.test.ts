import { describe, expect, it } from "vitest";
import { renderQrDataUrl } from "@/modules/tickets";

describe("renderQrDataUrl", () => {
  it("devuelve una imagen PNG en data URL", async () => {
    const dataUrl = await renderQrDataUrl("ABC.123");
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
