import {
  ArraySize,
  CellError,
  ErrorType,
  FunctionArgumentType,
  SimpleRangeValue,
  FunctionPlugin,
  HyperFormula,
  type ImplementedFunctions,
} from "hyperformula";

/** CONCAT (Excel 2019+): o HyperFormula só traz CONCATENATE. */
class ConcatPlugin extends FunctionPlugin {
  static implementedFunctions: ImplementedFunctions = {
    CONCAT: {
      method: "concat",
      parameters: [{ argumentType: FunctionArgumentType.SCALAR }],
      repeatLastArgs: 1,
    },
  };

  // Tipos internos do HyperFormula (ProcedureAst, InterpreterState) não são exportados.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  concat(ast: any, state: any) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("CONCAT"),
      (...args: unknown[]) =>
        args
          .map((a) => (typeof a === "boolean" ? (a ? "VERDADEIRO" : "FALSO") : String(a ?? "")))
          .join(""),
    );
  }
}

/**
 * FILTRO como no Excel: FILTRO(matriz; incluir; [se_vazia]).
 * O do HyperFormula só aceita origem de uma coluna (dava #N/D em
 * `FILTRO(A2:D8;B2:B8="Sul")`) e trata o 3º argumento como outra condição.
 * Aqui: `incluir` é uma coluna (filtra linhas) ou uma linha (filtra colunas).
 */
class FiltroPlugin extends FunctionPlugin {
  static implementedFunctions: ImplementedFunctions = {
    FILTER: {
      method: "filtro",
      sizeOfResultArrayMethod: "tamanhoFiltro",
      enableArrayArithmeticForArguments: true,
      parameters: [
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.RANGE },
        { argumentType: FunctionArgumentType.SCALAR, optionalArg: true },
      ],
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtro(ast: any, state: any) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata("FILTER"),
      (matriz: SimpleRangeValue, incluir: SimpleRangeValue, seVazia?: unknown) => {
        const dados = matriz.data;
        const cond = incluir.data;
        const verdade = (v: unknown) =>
          typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : false;
        let saida: unknown[][];
        if (incluir.width() === 1 && incluir.height() === matriz.height()) {
          saida = dados.filter((_, i) => verdade(cond[i][0]));
        } else if (incluir.height() === 1 && incluir.width() === matriz.width()) {
          saida = dados.map((linha) => linha.filter((_, j) => verdade(cond[0][j])));
          if (saida[0]?.length === 0) saida = [];
        } else {
          return new CellError(ErrorType.VALUE, "FILTRO: o intervalo de incluir precisa ter o tamanho de uma coluna ou linha da matriz.");
        }
        if (saida.length > 0) return SimpleRangeValue.onlyValues(saida as never);
        if (seVazia !== undefined) return seVazia as never;
        return new CellError(ErrorType.NA, "FILTRO não encontrou nenhum valor.");
      },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tamanhoFiltro(ast: any, state: any) {
    if (ast.args.length < 2) return ArraySize.error();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tamanho = (this as any).arraySizeForAst(ast.args[0], state);
    return new ArraySize(tamanho.width, tamanho.height);
  }
}

let feito = false;
export function registrarPlugins() {
  if (feito) return;
  HyperFormula.registerFunctionPlugin(ConcatPlugin, { enGB: { CONCAT: "CONCAT" } });
  HyperFormula.unregisterFunction("FILTER");
  HyperFormula.registerFunctionPlugin(FiltroPlugin);
  feito = true;
}
