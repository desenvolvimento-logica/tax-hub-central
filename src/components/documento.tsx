/**
 * Peças visuais compartilhadas dos documentos institucionais gerados no Conecta Tributário
 * (comunicado de boas-vindas e diagnóstico fiscal).
 *
 * Os documentos seguem a identidade da Lógica: grafite, dourado e creme.
 * Como são impressos/exportados em PDF, as cores são fixas em hexadecimal
 * de propósito — o material precisa sair idêntico em tema claro ou escuro.
 */
import type { ReactNode } from "react";

import logo from "@/assets/logica-logo.png.asset.json";

export const MARCA = {
  grafite: "#2F3640",
  grafiteClaro: "#4A5460",
  dourado: "#EFC016",
  douradoEscuro: "#C99B0B",
  douradoSuave: "#FBEFC0",
  creme: "#FCF9F1",
  cinza: "#EFEFEA",
} as const;

export type Marca = {
  grafite: string;
  grafiteClaro: string;
  dourado: string;
  douradoEscuro: string;
  douradoSuave: string;
  creme: string;
  cinza: string;
};

/**
 * Paleta do "Levantamento de Débitos": mesmo desenho institucional, nos tons
 * definidos para este documento (cinza #58595B e dourado #E5B158).
 */
export const MARCA_LEVANTAMENTO: Marca = {
  grafite: "#58595B",
  grafiteClaro: "#7A7B7D",
  dourado: "#E5B158",
  douradoEscuro: "#B4842F",
  douradoSuave: "#F7E7C8",
  creme: "#FBF8F2",
  cinza: "#EEEDEA",
};

export const CONTATO = {
  endereco: "Av. Eng. Fábio Roberto Barnabé, 1942 — Jd. Esplanada — Indaiatuba/SP — 13.331-520",
  telefone: "(19) 3825-5196",
  email: "tributario@escritoriologica.com.br",
  site: "escritoriologica.cnt.br",
} as const;

export const LOGO_URL = logo.url;

/** Folha de estilos usada nas prévias e na impressão em A4. */
export function EstilosDocumento({ marca = MARCA }: { marca?: Marca }) {
  return (
    <style>{`
      .doc-preview { display: flex; flex-direction: column; align-items: center; gap: 28px; }
      .doc-page {
        position: relative;
        width: 100%;
        aspect-ratio: 210 / 297;
        overflow: hidden;
        background: ${marca.creme};
        color: ${marca.grafite};
        font-family: "DM Sans", Arial, Helvetica, sans-serif;
        box-shadow: 0 18px 48px -24px rgba(15, 23, 42, 0.45);
        container-type: inline-size;
      }
      .doc-page .doc-body {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        font-size: 1.62cqw;
      }
      .doc-flow {
        width: 100%;
        background: #fff;
        color: ${marca.grafite};
        font-family: "DM Sans", Arial, Helvetica, sans-serif;
        container-type: inline-size;
        box-shadow: 0 18px 48px -24px rgba(15, 23, 42, 0.45);
      }
      .doc-flow .doc-flow-body { font-size: 1.62cqw; line-height: 1.65; padding: 0 0 4%; }
      .doc-flow table { width: 100%; border-collapse: collapse; margin: 0 0 1em; font-size: 0.86em; }
      .doc-flow th, .doc-flow td { border: 1px solid ${marca.cinza}; padding: 0.45em 0.6em; text-align: left; }
      .doc-flow thead th { background: ${marca.douradoSuave}; }
      .doc-flow section, .doc-flow table, .doc-flow .evitar-quebra { break-inside: avoid; page-break-inside: avoid; }
      .doc-rodape {
        margin-top: auto;
        border-top: 2px solid ${marca.dourado};
        padding: 2.4% 8% 2.6%;
        text-align: center;
        font-size: 0.62em;
        line-height: 1.6;
        color: ${marca.grafiteClaro};
        background: #fff;
      }
      @media print {
        @page { size: A4; margin: 0; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        .doc-preview, .doc-preview * { visibility: visible !important; }
        .doc-preview {
          position: absolute; inset: 0; display: block; gap: 0; margin: 0; padding: 0;
        }
        .doc-page {
          width: 210mm; height: 297mm; aspect-ratio: auto;
          box-shadow: none; page-break-after: always; break-after: page;
        }
        .doc-page:last-child { page-break-after: auto; break-after: auto; }
        .doc-flow { width: 210mm; box-shadow: none; }
      }
    `}</style>
  );
}

export function RodapeDocumento({
  pagina,
  total,
  marca = MARCA,
}: {
  pagina: number;
  total: number;
  marca?: Marca;
}) {
  return (
    <div className="doc-rodape">
      <div>{CONTATO.endereco}</div>
      <div>
        {CONTATO.telefone} · {CONTATO.site} · {CONTATO.email}
      </div>
      <div style={{ marginTop: "0.4em", color: marca.douradoEscuro, letterSpacing: "0.08em" }}>
        Página {pagina} de {total}
      </div>
    </div>
  );
}

export function CabecalhoMarca({ titulo, marca = MARCA }: { titulo?: string; marca?: Marca }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "4%",
        padding: "4% 8% 0",
      }}
    >
      <img src={LOGO_URL} alt="Lógica Assessoria Contábil" style={{ width: "30%" }} />
      {titulo ? (
        <span
          style={{
            fontSize: "0.62em",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: marca.douradoEscuro,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          {titulo}
        </span>
      ) : null}
    </header>
  );
}

export function FaixaSecao({ children, marca = MARCA }: { children: ReactNode; marca?: Marca }) {
  return (
    <h2
      style={{
        margin: "0 0 0.9em",
        padding: "0.5em 1em",
        borderLeft: `4px solid ${marca.dourado}`,
        background: marca.douradoSuave,
        fontSize: "0.95em",
        fontWeight: 700,
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </h2>
  );
}

export function Aviso({
  titulo,
  children,
  tom = "atencao",
  marca = MARCA,
}: {
  titulo: string;
  children: ReactNode;
  tom?: "atencao" | "neutro";
  marca?: Marca;
}) {
  const borda = tom === "atencao" ? marca.dourado : marca.grafiteClaro;
  return (
    <div
      style={{
        borderLeft: `4px solid ${borda}`,
        background: tom === "atencao" ? "#FFFDF4" : "#F6F6F3",
        padding: "0.85em 1.1em",
        marginBottom: "0.9em",
      }}
    >
      <strong style={{ display: "block", marginBottom: "0.25em" }}>{titulo}</strong>
      <div style={{ color: marca.grafiteClaro }}>{children}</div>
    </div>
  );
}
