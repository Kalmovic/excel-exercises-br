import { ImageResponse } from "next/og";
import { buscarCertificado, tituloDoCertificado } from "@/lib/certificado-publico";
import { ESPECIALISTA } from "@/lib/especialista";

export const alt = "Certificado do Planilhês";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A imagem que o LinkedIn mostra quando o aluno compartilha o certificado. */
export default async function Image({ params }: { params: Promise<{ codigo: string }> }) {
  const c = await buscarCertificado((await params).codigo);
  const especialista = c?.modulo === ESPECIALISTA;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f7f2", padding: 40 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            border: `10px solid ${especialista ? "#d99a1e" : "#16181d"}`,
            borderRadius: 32,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 800, color: "#16181d" }}>
            <div style={{ display: "flex", width: 64, height: 64, borderRadius: 14, background: "#16181d", color: "#ffd23f", alignItems: "center", justifyContent: "center" }}>=</div>
            Planilhês
          </div>
          <div style={{ marginTop: 28, fontSize: 26, letterSpacing: 6, color: "#4a4e57" }}>
            {especialista ? "CERTIFICADO DE ESPECIALISTA" : "CERTIFICADO DE CONCLUSÃO"}
          </div>
          <div style={{ marginTop: 28, fontSize: 64, fontWeight: 800, color: "#16181d" }}>{c?.nome ?? "Certificado"}</div>
          <div style={{ marginTop: 20, fontSize: 34, color: "#0f766e", fontWeight: 700 }}>{c ? tituloDoCertificado(c) : ""}</div>
          <div style={{ marginTop: 28, fontSize: 24, color: "#4a4e57" }}>{c ? `Código ${c.codigo} · verificado em planilhes.com.br` : ""}</div>
        </div>
      </div>
    ),
    size,
  );
}
