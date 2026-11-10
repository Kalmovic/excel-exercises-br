import { describe, expect, it } from "vitest";
import { dataBR, diasEntre, ehDataISO, hojeSP, segundosAteMeiaNoiteSP } from "./data-sp";

describe("datas em São Paulo", () => {
  it("o dia vira à meia-noite de Brasília (UTC-3), não em UTC", () => {
    // 02:30 UTC do dia 11 ainda é 23:30 do dia 10 em São Paulo
    expect(hojeSP(new Date("2026-11-11T02:30:00Z"))).toBe("2026-11-10");
    expect(hojeSP(new Date("2026-11-11T03:00:00Z"))).toBe("2026-11-11");
  });

  it("contagem regressiva até a meia-noite", () => {
    expect(segundosAteMeiaNoiteSP(new Date("2026-11-11T02:30:00Z"))).toBe(30 * 60);
  });

  it("formatos e diferenças", () => {
    expect(dataBR("2026-11-10")).toBe("10/11/2026");
    expect(diasEntre("2026-11-10", "2026-11-23")).toBe(13);
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
    expect(ehDataISO("2026-11-10")).toBe(true);
    expect(ehDataISO("amanha")).toBe(false);
  });
});
