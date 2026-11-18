import { expect, type Page } from "@playwright/test";

// O Next mantém a página anterior montada e escondida depois de navegar: olhar só a visível.
export const celula = (page: Page, end: string) => page.locator(`[data-celula="${end}"]`).filter({ visible: true });

export async function abrir(page: Page, slug: string) {
  await page.goto(`/exercicios/${slug}`);
  await expect(page.getByTestId("verificar")).toBeVisible();
}

export async function verificarCorreto(page: Page) {
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
}

export async function digitar(page: Page, end: string, texto: string) {
  await celula(page, end).click();
  await page.keyboard.insertText(texto);
  await page.keyboard.press("Enter");
}

export async function limparArmazenamento(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

type CorpoCorrecao = { modulo: string; indice: number; resposta: Record<string, unknown> };

/**
 * Correção do teste do módulo (`POST /api/teste/corrigir`, da F1). Por padrão usa a
 * rota de verdade e só cai no roteiro (`resultados`, em ordem) quando ela não existe
 * (404). Com `forcar`, nunca vai ao servidor. Devolve os corpos enviados.
 */
export async function simularCorrecao(
  page: Page,
  resultados: boolean[],
  { forcar = false, atraso = 0, falhar = 0 }: { forcar?: boolean; atraso?: number; falhar?: number } = {},
) {
  const corpos: CorpoCorrecao[] = [];
  const fila = [...resultados];
  let falhas = falhar;
  await page.route("**/api/teste/corrigir", async (route) => {
    if (falhas > 0) {
      falhas--;
      return route.abort("internetdisconnected");
    }
    corpos.push(route.request().postDataJSON() as CorpoCorrecao);
    if (!forcar) {
      const real = await route.fetch().catch(() => null);
      // Só cai no falso quando a rota não existe (404 de página, não o JSON da própria API).
      const rotaAusente = real?.status() === 404 && !(real.headers()["content-type"] ?? "").includes("json");
      if (real && !rotaAusente) return route.fulfill({ response: real });
    }
    if (atraso) await new Promise((r) => setTimeout(r, atraso));
    await route.fulfill({ json: { ok: fila.shift() ?? false } });
  });
  return corpos;
}
