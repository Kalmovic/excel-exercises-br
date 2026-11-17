import type { ExercicioDoTipo, Verificacao } from "@/content/schema";
import { deIntervalo, intervaloParaTexto } from "@/engine/address";
import type { Planilha } from "@/engine/engine";
import { falhou, iguais, ok, TOLERANCIA_PADRAO, type Falha, type Resultado } from "../tipos";

/**
 * Exercícios de ferramenta (classificar, filtrar…). Confere o RESULTADO na
 * planilha, não o caminho: classificar pelo menu do filtro ou pela barra Dados
 * dá no mesmo. Precisa da Planilha inteira (linhas ocultas, filtro), não só do
 * retrato da tela.
 */
export function validarFerramenta(ex: ExercicioDoTipo<"ferramenta">, p: Planilha): Resultado {
  const falhas: Falha[] = [];
  for (const v of ex.verificacoes) {
    const f = conferir(v, p);
    if (f) falhas.push(v.mensagem ? { ...f, mensagem: v.mensagem } : f);
  }
  return falhas.length ? falhou(...falhas) : ok();
}

function conferir(v: Verificacao, p: Planilha): Falha | null {
  switch (v.tipo) {
    case "valores": {
      const int = deIntervalo(v.intervalo);
      const certo = v.esperado.every((linha, dl) =>
        linha.every((esp, dc) =>
          iguais(p.valor({ linha: int.inicio.linha + dl, coluna: int.inicio.coluna + dc }), esp, TOLERANCIA_PADRAO),
        ),
      );
      return certo
        ? null
        : { celula: v.intervalo.split(":")[0], motivo: "valor", mensagem: `Os dados em ${v.intervalo} ainda não estão na ordem pedida.` };
    }
    case "filtroAtivo": {
      const f = p.filtroAtual();
      if (!f) return { celula: v.intervalo?.split(":")[0] ?? "A1", motivo: "recurso", mensagem: "O filtro ainda não está ligado. Use o botão Filtro (Ctrl+Shift+L)." };
      if (v.intervalo && intervaloParaTexto(f.intervalo) !== intervaloParaTexto(deIntervalo(v.intervalo)))
        return { celula: v.intervalo.split(":")[0], motivo: "recurso", mensagem: `O filtro está em ${intervaloParaTexto(f.intervalo)}, mas a tabela é ${v.intervalo}.` };
      return null;
    }
    case "linhasVisiveis": {
      const f = p.filtroAtual();
      if (!f) return { celula: "A1", motivo: "recurso", mensagem: "Ligue o filtro primeiro (botão Filtro ou Ctrl+Shift+L)." };
      const vistas = p.linhasVisiveis();
      const certo = vistas.length === v.esperado.length && v.esperado.every((l) => vistas.includes(l));
      if (certo) return null;
      const n = vistas.length;
      return {
        celula: intervaloParaTexto(f.intervalo).split(":")[0],
        motivo: "recurso",
        mensagem: `O filtro está mostrando ${n} ${n === 1 ? "linha" : "linhas"}, mas a resposta tem ${v.esperado.length}. Confira os critérios de cada coluna.`,
      };
    }
    case "celula": {
      const c = v.celula;
      const valor = p.valor(c);
      if (valor === null || valor === "") return { celula: c, motivo: "vazia", mensagem: `A célula ${c} ainda está vazia.` };
      if (typeof valor === "object") return { celula: c, motivo: "erro", mensagem: `A fórmula em ${c} retornou o erro ${valor.erro}.` };
      if (!p.temFormula(c)) return { celula: c, motivo: "sem-formula", mensagem: `Em ${c}, use uma fórmula (começando com =) em vez de digitar o valor.` };
      if (v.funcao && !p.funcoesUsadas(c).includes(v.funcao))
        return { celula: c, motivo: "funcao-faltando", mensagem: `Este exercício pede que você use a função ${v.funcao} em ${c}.` };
      if (!iguais(valor, v.esperado, v.tolerancia ?? TOLERANCIA_PADRAO))
        return { celula: c, motivo: "valor", mensagem: `O resultado em ${c} não está certo.` };
      return null;
    }
  }
}
