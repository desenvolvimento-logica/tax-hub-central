/**
 * Leitura dos relatórios anexados (PDF ou texto) para identificar
 * automaticamente razão social, CNPJ e os débitos apontados.
 *
 * Roda apenas no navegador: o pdf.js é importado dinamicamente.
 */

import type { Debito, Omissao, SituacaoDebito } from "./diagnostico";
import { debitoVazio, omissaoVazia, paraNumero } from "./diagnostico";

export type LeituraRelatorio = {
  arquivo: string;
  razaoSocial: string | null;
  cnpj: string | null;
  debitos: Debito[];
  semDebitos: boolean;
  parcelamento: boolean;
  exigibilidadeSuspensa: boolean;
  ipva: boolean;
  omissoes: Omissao[];
  texto: string;
};

const RE_CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const RE_CNPJ_NUM = /\b\d{14}\b/;
const RE_VALOR = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\b/;
const RE_COMPETENCIA = /\b(\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{4}|\b(?:19|20)\d{2}\b)/;
const RE_VENCIMENTO = /\b\d{2}\/\d{2}\/\d{4}\b/;

const TRIBUTOS = [
  "IPVA",
  "ICMS",
  "ISS",
  "ISSQN",
  "IPTU",
  "IRPJ",
  "CSLL",
  "PIS",
  "COFINS",
  "INSS",
  "IRRF",
  "IPI",
  "SIMPLES NACIONAL",
  "DAS",
  "FGTS",
  "TAXA",
  "MULTA",
  "CONTRIBUIÇÃO",
  "DIFAL",
  "ITBI",
  "ITCMD",
];

const SEM_DEBITO = [
  "nada consta",
  "não constam débitos",
  "nao constam debitos",
  "não há débitos",
  "nao ha debitos",
  "negativa de débitos",
  "negativa de debitos",
  "não foram encontrados débitos",
  "sem pendências",
  "sem pendencias",
];

function formatarCnpj(bruto: string): string {
  const d = bruto.replace(/\D/g, "");
  if (d.length !== 14) return bruto;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Extrai o texto de um PDF (pdf.js) ou de arquivos de texto simples. */
export async function textoDoArquivo(arquivo: File): Promise<string> {
  const nome = arquivo.name.toLowerCase();
  if (!nome.endsWith(".pdf")) {
    try {
      return await arquivo.text();
    } catch {
      return "";
    }
  }

  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as unknown as { default: string }).default;

  const buffer = await arquivo.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    const linhas = new Map<number, string[]>();
    for (const item of conteudo.items as { str?: string; transform?: number[] }[]) {
      if (!item.str?.trim() || !item.transform) continue;
      const y = Math.round(item.transform[5] ?? 0);
      const atual = linhas.get(y) ?? [];
      atual.push(item.str);
      linhas.set(y, atual);
    }
    const ordenadas = [...linhas.entries()].sort((a, b) => b[0] - a[0]);
    partes.push(ordenadas.map(([, textos]) => textos.join(" ").trim()).join("\n"));
  }
  return partes.join("\n");
}

function identificarRazaoSocial(linhas: string[]): string | null {
  const rotulos = [
    /raz[ãa]o\s+social\s*[:\-]?\s*(.+)/i,
    /nome\s+empresarial\s*[:\-]?\s*(.+)/i,
    /nome\s*\/\s*raz[ãa]o\s+social\s*[:\-]?\s*(.+)/i,
    /contribuinte\s*[:\-]?\s*(.+)/i,
    /nome\s+do\s+contribuinte\s*[:\-]?\s*(.+)/i,
  ];
  for (const linha of linhas) {
    for (const re of rotulos) {
      const m = linha.match(re);
      const valor = m?.[1]?.replace(RE_CNPJ, "").replace(/CNPJ/gi, "").trim();
      if (valor && valor.length > 3) return valor.replace(/\s{2,}/g, " ");
    }
  }
  // Sem rótulo: usa a linha próxima ao CNPJ que pareça um nome empresarial.
  const indice = linhas.findIndex((l) => RE_CNPJ.test(l));
  if (indice >= 0) {
    const candidatas = [linhas[indice], linhas[indice - 1], linhas[indice + 1]];
    for (const linha of candidatas) {
      const limpa = linha?.replace(RE_CNPJ, "").replace(/CNPJ/gi, "").trim();
      if (limpa && /[A-Za-zÀ-ÿ]{4,}/.test(limpa) && limpa.length <= 90) {
        return limpa.replace(/\s{2,}/g, " ");
      }
    }
  }
  return null;
}

function situacaoDaLinha(linha: string): SituacaoDebito {
  const t = linha.toLowerCase();
  if (/d[íi]vida\s+ativa|inscrit/.test(t)) return "divida_ativa";
  if (/parcelad|parcelamento/.test(t)) return "parcelado";
  if (/exigibilidade\s+suspensa|suspens/.test(t)) return "exigibilidade_suspensa";
  return "aberto";
}

function tributoDaLinha(linha: string): string {
  const maiusculo = linha.toUpperCase();
  const achado = TRIBUTOS.find((t) => maiusculo.includes(t));
  if (achado) return achado === "DAS" ? "Simples Nacional (DAS)" : achado;
  const antesDoValor = linha.split(RE_VALOR)[0]?.trim() ?? "";
  const limpo = antesDoValor.replace(/\s{2,}/g, " ").slice(0, 60).trim();
  return limpo || "Débito identificado";
}

const OBRIGACOES = [
  "DCTF",
  "DCTFWeb",
  "EFD-Contribuições",
  "EFD Contribuições",
  "ECF",
  "ECD",
  "GIA",
  "SPED Fiscal",
  "EFD ICMS/IPI",
  "DEFIS",
  "PGDAS",
  "DIRF",
  "eSocial",
  "GFIP",
  "DASN",
  "DMED",
  "DIMOB",
];

/** Localiza omissões de entrega de declarações citadas no relatório. */
function identificarOmissoes(linhas: string[]): Omissao[] {
  const encontradas: Omissao[] = [];
  for (const linha of linhas) {
    if (!/omiss|omitid|falta\s+de\s+entrega|n[ãa]o\s+entregue|sem\s+entrega/i.test(linha)) continue;
    const maiusculo = linha.toUpperCase();
    const obrigacao =
      OBRIGACOES.find((o) => maiusculo.includes(o.toUpperCase())) ??
      linha.replace(/\s{2,}/g, " ").slice(0, 70).trim();
    const referencia = linha.match(RE_COMPETENCIA)?.[0] ?? "";
    if (encontradas.some((o) => o.obrigacao === obrigacao && o.referencia === referencia)) continue;
    encontradas.push({ ...omissaoVazia(), obrigacao, referencia });
  }
  return encontradas.slice(0, 30);
}

/** Interpreta o texto de um relatório e devolve os dados reconhecidos. */
export function interpretarRelatorio(arquivo: string, texto: string): LeituraRelatorio {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);

  const cnpjBruto = texto.match(RE_CNPJ)?.[0] ?? texto.replace(/\s/g, "").match(RE_CNPJ_NUM)?.[0];
  const minusculo = texto.toLowerCase();
  const semDebitos = SEM_DEBITO.some((termo) => minusculo.includes(termo));

  const debitos: Debito[] = [];
  for (const linha of linhas) {
    const valor = linha.match(RE_VALOR)?.[1];
    if (!valor) continue;
    if (paraNumero(valor) <= 0) continue;
    if (/total|soma|subtotal/i.test(linha)) continue;
    const vencimento = linha.match(RE_VENCIMENTO)?.[0] ?? "";
    const competencia = linha.replace(vencimento, "").match(RE_COMPETENCIA)?.[0] ?? "";
    debitos.push({
      ...debitoVazio(),
      tributo: tributoDaLinha(linha),
      referencia: competencia,
      vencimento,
      valor: `R$ ${valor}`,
      situacao: situacaoDaLinha(linha),
    });
  }

  const parcelamento = /parcelad|parcelamento/i.test(texto);
  const exigibilidadeSuspensa = /exigibilidade\s+suspensa|suspens[ãa]o\s+da\s+exigibilidade/i.test(
    texto,
  );
  const ipva = /\bipva\b/i.test(texto);
  const omissoes = identificarOmissoes(linhas);

  return {
    arquivo,
    razaoSocial: identificarRazaoSocial(linhas),
    cnpj: cnpjBruto ? formatarCnpj(cnpjBruto) : null,
    debitos: semDebitos && debitos.length === 0 ? [] : debitos.slice(0, 60),
    semDebitos: semDebitos && debitos.length === 0,
    parcelamento,
    exigibilidadeSuspensa,
    ipva,
    omissoes,
    texto,
  };
}

export async function lerRelatorio(arquivo: File): Promise<LeituraRelatorio> {
  const texto = await textoDoArquivo(arquivo);
  return interpretarRelatorio(arquivo.name, texto);
}
