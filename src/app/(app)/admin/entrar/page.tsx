import { Suspense } from "react";
import { connection } from "next/server";
import { adminConfigurado } from "@/lib/admin";
import { entrar } from "../acoes";

export default function Entrar({ searchParams }: PageProps<"/admin/entrar">) {
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Entrar como admin</h1>
      <Suspense>
        <Formulario searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Formulario({ searchParams }: { searchParams: PageProps<"/admin/entrar">["searchParams"] }) {
  await connection();
  if (!adminConfigurado()) {
    return (
      <p className="text-zinc-600">
        Admin desligado: configure a variável de ambiente <code>ADMIN_TOKEN</code> (12 caracteres ou mais).
      </p>
    );
  }
  const { erro } = await searchParams;
  return (
    <form action={entrar} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-zinc-600">Senha de admin</span>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded border border-zinc-300 px-3 py-2"
          data-testid="senha-admin"
        />
      </label>
      {erro && (
        <p className="text-sm text-red-700" data-testid="erro-admin">
          Senha incorreta.
        </p>
      )}
      <button type="submit" className="w-full rounded-md bg-violet-700 px-4 py-2 font-medium text-white hover:bg-violet-800">
        Entrar
      </button>
    </form>
  );
}
