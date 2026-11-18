import { beforeEach, describe, expect, it } from "vitest";
import { consumir, ipDe, limitar, zerarLimites } from "./limite";

const regra = { capacidade: 3, porMinuto: 6 }; // uma ficha a cada 10 s
const cab = (ip: string) => new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` });

describe("limite de requisições", () => {
  beforeEach(() => zerarLimites());

  it("deixa passar a capacidade, recusa o resto e diz quanto esperar", () => {
    const t = 1_000_000;
    expect([consumir("a", regra, t), consumir("a", regra, t), consumir("a", regra, t)]).toEqual([0, 0, 0]);
    expect(consumir("a", regra, t)).toBe(10);
  });

  it("as fichas voltam com o tempo, sem passar da capacidade", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) consumir("a", regra, t);
    expect(consumir("a", regra, t + 5_000)).toBe(5);
    expect(consumir("a", regra, t + 10_000)).toBe(0);
    // Uma hora parado: volta a 3, não a 360.
    const depois = t + 3_600_000;
    expect([0, 1, 2, 3].map(() => consumir("a", regra, depois))).toEqual([0, 0, 0, 10]);
  });

  it("chaves diferentes não se misturam", () => {
    for (let i = 0; i < 3; i++) consumir("a", regra, 0);
    expect(consumir("a", regra, 0)).toBeGreaterThan(0);
    expect(consumir("b", regra, 0)).toBe(0);
  });

  it("IP: o primeiro do x-forwarded-for, ou x-real-ip", () => {
    expect(ipDe(cab("1.2.3.4"))).toBe("1.2.3.4");
    expect(ipDe(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(ipDe(new Headers())).toBe("sem-ip");
  });

  it("limitar: 429 em português com Retry-After; por IP e por aluno", async () => {
    for (let i = 0; i < 5; i++) expect(limitar(cab("1.1.1.1"), "contato")).toBeNull();
    const r = limitar(cab("1.1.1.1"), "contato")!;
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await r.json()).erro).toMatch(/Muitos pedidos/);
    expect(limitar(cab("2.2.2.2"), "contato")).toBeNull(); // outro IP
    expect(limitar(cab("1.1.1.1"), "erros")).toBeNull(); // outra rota

    // O aluno logado que troca de rede continua contado.
    for (let i = 0; i < 5; i++) expect(limitar(cab(`9.9.9.${i}`), "especialista", "u1")).toBeNull();
    expect(limitar(cab("9.9.9.200"), "especialista", "u1")?.status).toBe(429);
  });
});
