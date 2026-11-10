import { HyperFormula, type ConfigParams } from "hyperformula";
import ptPT from "hyperformula/i18n/languages/ptPT";
import { registrarPlugins } from "./plugins";

/**
 * Idioma pt-BR (Excel brasileiro).
 *
 * O pacote `ptPT` do HyperFormula já usa os nomes do Excel brasileiro na
 * maioria das funções (PROCV, CONT.SE, SOMASE…). Sobrescrevemos só o que
 * diverge do Excel pt-BR atual.
 */
const SOBRESCRITAS: Record<string, string> = {
  IFS: "SES",
  DATEDIF: "DATADIF",
  FILTER: "FILTRO",
  SORT: "CLASSIFICAR",
  UNIQUE: "ÚNICO",
  CONCAT: "CONCAT",
};

export const ptBR = {
  ...ptPT,
  langCode: "ptBR",
  functions: { ...ptPT.functions, ...SOBRESCRITAS },
  errors: { ...ptPT.errors, SPILL: "#DESPEJAR!" },
};

export const CONFIG_PT_BR: Partial<ConfigParams> = {
  licenseKey: "gpl-v3",
  language: "ptBR",
  functionArgSeparator: ";",
  decimalSeparator: ",",
  thousandSeparator: ".",
  arrayColumnSeparator: ";",
  arrayRowSeparator: "|",
  dateFormats: ["DD/MM/YYYY", "DD/MM/YY"],
  timeFormats: ["hh:mm", "hh:mm:ss"],
  currencySymbol: ["R$"],
  localeLang: "pt-BR",
  // Aritmética de matrizes como no Excel 365: `C2:C9=G1` vira uma lista de
  // VERDADEIRO/FALSO dentro de FILTRO, SOMARPRODUTO etc.
  useArrayArithmetic: true,
  // Compatível com o Excel: 1900 tratado como bissexto (bug histórico) e
  // serial 1 = 01/01/1900. Assim DATA(2026;1;15) = 46037, como no Excel.
  leapYear1900: true,
  nullDate: { year: 1899, month: 12, day: 31 },
};

let registrado = false;

/** Registra plugins e o idioma uma única vez por processo. */
export function garantirRegistro() {
  if (registrado) return;
  registrarPlugins();
  if (!HyperFormula.getRegisteredLanguagesCodes().includes("ptBR")) {
    HyperFormula.registerLanguage("ptBR", ptBR);
  }
  registrado = true;
}

/** Nome pt-BR -> id canônico (inglês). Ex.: "PROCV" -> "VLOOKUP". */
export const PT_PARA_CANONICO: Record<string, string> = Object.fromEntries(
  Object.entries(ptBR.functions).map(([canonico, pt]) => [pt, canonico]),
);
