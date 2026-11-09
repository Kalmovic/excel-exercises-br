import {
  FunctionArgumentType,
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

let feito = false;
export function registrarPlugins() {
  if (feito) return;
  HyperFormula.registerFunctionPlugin(ConcatPlugin, { enGB: { CONCAT: "CONCAT" } });
  feito = true;
}
