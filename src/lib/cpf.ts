/** Só os 11 dígitos do CPF ("123.456.789-09" -> "12345678909"). */
export const digitosCpf = (cpf: string) => cpf.replace(/\D/g, "");

/**
 * Confere os dois dígitos verificadores do CPF. Não diz se o CPF existe, só
 * pega erro de digitação antes de o Asaas recusar a cobrança.
 */
export function cpfValido(cpf: string): boolean {
  const d = digitosCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false; // 000.000.000-00 etc.
  const verificador = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return verificador(9) === Number(d[9]) && verificador(10) === Number(d[10]);
}

/** "12345678909" -> "123.456.789-09" (enquanto digita). */
export function formatarCpf(cpf: string) {
  const d = digitosCpf(cpf).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
