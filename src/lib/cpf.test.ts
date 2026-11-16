import { expect, it } from "vitest";
import { cpfValido, formatarCpf } from "./cpf";

it("CPF: confere os dígitos verificadores", () => {
  expect(cpfValido("529.982.247-25")).toBe(true);
  expect(cpfValido("52998224725")).toBe(true);
  expect(cpfValido("529.982.247-24")).toBe(false); // último dígito errado
  expect(cpfValido("111.111.111-11")).toBe(false); // repetido passa na conta, mas não existe
  expect(cpfValido("1234")).toBe(false);
});

it("CPF: formata enquanto digita", () => {
  expect(formatarCpf("5299822")).toBe("529.982.2");
  expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  expect(formatarCpf("529.982.247-2599")).toBe("529.982.247-25");
});
