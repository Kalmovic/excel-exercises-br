/** Páginas do app (exercícios, desafio, admin…): conteúdo com margem. A landing (/) ocupa a largura toda. */
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>;
}
