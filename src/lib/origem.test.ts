import { beforeEach, describe, expect, it } from "vitest";
import { capturarOrigem, lerOrigem, resumoOrigem } from "./origem";

describe("origem", () => {
  const mem = new Map<string, string>();
  const cookies: string[] = [];
  beforeEach(() => {
    mem.clear();
    cookies.length = 0;
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    } as unknown as Storage;
    globalThis.document = {
      set cookie(v: string) {
        cookies.push(v);
      },
    } as unknown as Document;
  });

  it("guarda a UTM da primeira visita e não sobrescreve", () => {
    capturarOrigem("https://x.com/exercicios/procv?utm_source=tiktok&utm_campaign=procv-falso");
    capturarOrigem("https://x.com/?utm_source=google");
    expect(lerOrigem()).toMatchObject({ utm_source: "tiktok", utm_campaign: "procv-falso", entrada: "/exercicios/procv" });
  });

  it("afiliado e cupom: vale o mais recente, e vão para cookie", () => {
    capturarOrigem("https://x.com/?ref=ana");
    capturarOrigem("https://x.com/?ref=bruno&cupom=excel10");
    expect(lerOrigem()).toMatchObject({ ref: "bruno", cupom: "EXCEL10" });
    expect(cookies.some((c) => c.startsWith("planilhes_ref=bruno;"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("planilhes_cupom=EXCEL10;"))).toBe(true);
    expect(resumoOrigem()).toBe("ref:bruno");
  });

  it("limpa códigos com caracteres estranhos", () => {
    capturarOrigem("https://x.com/?ref=ana%3Bdrop%20table");
    expect(lerOrigem()?.ref).toBe("anadroptable");
  });

  it("sem nada, é direto", () => {
    capturarOrigem("https://x.com/");
    expect(resumoOrigem()).toBe("direto");
  });
});
