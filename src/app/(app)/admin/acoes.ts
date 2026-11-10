"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN, senhaCorreta, valorDoCookie } from "@/lib/admin";

export async function entrar(formulario: FormData) {
  const senha = String(formulario.get("senha") ?? "");
  if (!senhaCorreta(senha)) {
    // Atraso fixo: deixa tentativa e erro em massa bem mais lento.
    await new Promise((r) => setTimeout(r, 800));
    redirect("/admin/entrar?erro=1");
  }
  (await cookies()).set(COOKIE_ADMIN, valorDoCookie(), {
    httpOnly: true, // o JavaScript da página não lê o cookie
    secure: process.env.NODE_ENV === "production", // só por HTTPS em produção
    sameSite: "strict", // não é enviado em requests vindos de outros sites
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });
  redirect("/admin");
}

export async function sair() {
  (await cookies()).delete(COOKIE_ADMIN);
  redirect("/");
}
