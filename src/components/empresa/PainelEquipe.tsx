import { BotaoCopiar } from "@/components/site/BotaoCopiar";
import { dataBR, type MembroPainel, type PainelGestor } from "@/lib/empresas";
import { BotaoRemover } from "./BotaoRemover";

const cartao = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

const STATUS: Record<string, { texto: string; cor: string }> = {
  ativa: { texto: "Contrato em vigor", cor: "bg-accent text-ink" },
  proposta: { texto: "Aguardando o pagamento", cor: "bg-header text-muted" },
  vencida: { texto: "Contrato vencido", cor: "bg-amber-100 text-amber-900" },
  cancelada: { texto: "Contrato cancelado", cor: "bg-red-100 text-red-800" },
};

/**
 * Painel do gestor da equipe: vagas, link de convite, validade e o progresso de
 * cada pessoa. Recebe os dados prontos (função painel_gestor do banco).
 * Telas grandes: tabela. Celular: um cartão por pessoa.
 */
export function PainelEquipe({
  dados,
  totalLicoes,
  linkConvite,
  titulos,
}: {
  dados: PainelGestor;
  totalLicoes: number;
  linkConvite: string;
  /** slug do módulo -> nome curto, para os certificados */
  titulos: Record<string, string>;
}) {
  const { organizacao: o, membros } = dados;
  const livres = Math.max(0, o.assentos - o.usados);
  const status = STATUS[o.status] ?? STATUS.proposta;
  const nomeDe = (m: MembroPainel) => m.nome || m.email || "Sem nome";
  const certificados = (m: MembroPainel) => (m.certificados.length ? m.certificados.map((c) => titulos[c] ?? c).join(", ") : "Nenhum");
  const ultimo = (m: MembroPainel) => (m.ultimo_acesso ? dataBR(m.ultimo_acesso) : "Ainda não começou");
  const barra = (m: MembroPainel) => (
    <span className="flex items-center gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-header" aria-hidden>
        <span className="block h-full rounded-full bg-success" style={{ width: `${totalLicoes ? Math.min(100, (m.licoes / totalLicoes) * 100) : 0}%` }} />
      </span>
      <span className="font-mono text-sm">
        {m.licoes}/{totalLicoes}
      </span>
    </span>
  );

  return (
    <div className="space-y-6" data-testid="painel-empresa">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Painel da equipe</p>
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">{o.nome}</h1>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${status.cor}`} data-testid="status-contrato">
          {status.texto}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-bg p-3">
          <dt className="text-xs text-muted">vagas usadas</dt>
          <dd className="font-display text-2xl font-extrabold" data-testid="vagas">
            {o.usados}/{o.assentos}
          </dd>
        </div>
        <div className="rounded-xl bg-bg p-3">
          <dt className="text-xs text-muted">vagas livres</dt>
          <dd className="font-display text-2xl font-extrabold">{livres}</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-bg p-3 sm:col-span-1">
          <dt className="text-xs text-muted">{o.status === "ativa" ? "contrato válido até" : "validade"}</dt>
          <dd className="font-display text-2xl font-extrabold" data-testid="validade">
            {o.acesso_ate ? dataBR(o.acesso_ate) : "—"}
          </dd>
        </div>
      </dl>

      <section className={`${cartao} space-y-3`} aria-label="Link de convite">
        <h2 className="text-lg font-semibold">Link de convite</h2>
        <p className="text-sm text-muted">
          Mande este link para a equipe (e-mail, chat interno). Cada pessoa entra com o próprio e-mail e ocupa uma vaga. Para trocar alguém, remova a
          pessoa abaixo: a vaga fica livre na hora.
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate px-2 text-sm" data-testid="link-convite">
            {linkConvite}
          </code>
          <BotaoCopiar texto={linkConvite} testid="copiar-convite" />
        </div>
        {livres === 0 && <p className="text-sm text-amber-900">Todas as vagas estão ocupadas: quem abrir o link verá o aviso de equipe lotada.</p>}
      </section>

      <section className={`${cartao} space-y-4`} aria-label="Equipe">
        <h2 className="text-lg font-semibold">Equipe ({membros.length})</h2>
        {membros.length === 0 ? (
          <p className="text-muted" data-testid="equipe-vazia">
            Ninguém entrou ainda. Mande o link de convite para a equipe.
          </p>
        ) : (
          <>
            {/* Celular: um cartão por pessoa. */}
            <ul className="space-y-3 sm:hidden" data-testid="membros-cartoes">
              {membros.map((m) => (
                <li key={m.usuario_id} className="space-y-2 rounded-xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{nomeDe(m)}</p>
                      {m.nome && <p className="truncate text-sm text-muted">{m.email}</p>}
                    </div>
                    <BotaoRemover usuarioId={m.usuario_id} quem={nomeDe(m)} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted">Lições</dt>
                    <dd>{barra(m)}</dd>
                    <dt className="text-muted">Certificados</dt>
                    <dd>{certificados(m)}</dd>
                    <dt className="text-muted">Último acesso</dt>
                    <dd>{ultimo(m)}</dd>
                  </dl>
                </li>
              ))}
            </ul>
            {/* Telas maiores: tabela. */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-sm" data-testid="membros-tabela">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 pr-3 font-semibold">Pessoa</th>
                    <th className="py-2 pr-3 font-semibold">Lições concluídas</th>
                    <th className="py-2 pr-3 font-semibold">Certificados</th>
                    <th className="py-2 pr-3 font-semibold">Último acesso</th>
                    <th className="py-2 font-semibold">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {membros.map((m) => (
                    <tr key={m.usuario_id} className="border-b border-line align-top">
                      <td className="py-2.5 pr-3">
                        <span className="block font-medium">{nomeDe(m)}</span>
                        {m.nome && <span className="block text-muted">{m.email}</span>}
                      </td>
                      <td className="py-2.5 pr-3">{barra(m)}</td>
                      <td className="py-2.5 pr-3">{certificados(m)}</td>
                      <td className="py-2.5 pr-3">{ultimo(m)}</td>
                      <td className="py-2.5 text-right">
                        <BotaoRemover usuarioId={m.usuario_id} quem={nomeDe(m)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
