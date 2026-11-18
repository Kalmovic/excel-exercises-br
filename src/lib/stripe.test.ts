import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { precosDoCatalogo, limparCachePrecos } = await import("./stripe");

const esperado = { mensal: { centavos: 3490, recorrente: true }, anual: { centavos: 23880, recorrente: false } };
const MENSAL = { id: "price_m", lookup_key: "planilhes_pro_mensal", currency: "brl", unit_amount: 3490, type: "recurring", recurring: { interval: "month", interval_count: 1 } };
const ANUAL = { id: "price_a", lookup_key: "planilhes_pro_anual", currency: "brl", unit_amount: 23880, type: "one_time", recurring: null };
const stripeCom = (data: object[]) => ({ prices: { list: vi.fn(async () => ({ data })) } }) as unknown as Stripe;

describe("preços do catálogo do Stripe", () => {
  beforeEach(() => limparCachePrecos());

  it("acha os dois planos pelo lookup_key", async () => {
    expect(await precosDoCatalogo(stripeCom([MENSAL, ANUAL]), esperado)).toEqual({ mensal: "price_m", anual: "price_a" });
  });

  it("preço diferente do site (ou mensal virou anual): não usa, avisa no log", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await precosDoCatalogo(stripeCom([{ ...MENSAL, unit_amount: 2990 }, { ...ANUAL, type: "recurring" }]), esperado);
    expect(r).toEqual({});
    expect(erro).toHaveBeenCalledTimes(2);
  });

  it("guarda por 10 minutos: não pergunta ao Stripe a cada checkout", async () => {
    const s = stripeCom([MENSAL, ANUAL]);
    await precosDoCatalogo(s, esperado);
    await precosDoCatalogo(s, esperado);
    expect(s.prices.list).toHaveBeenCalledTimes(1);
  });
});
