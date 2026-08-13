/** Cliente da API GOB (somente leitura, autenticação via X-Api-Key). */

export type RegistroGob = Record<string, unknown>;

export type SearchParams = {
  maxSize?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  select?: string[];
  where?: unknown[];
};

function host(): string {
  const raw = process.env["GOB_API_URL"] ?? "https://integracao.gob.com.br";
  return raw.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

export function credenciaisGob(): { host: string; token: string } | null {
  const token = process.env["GOB_API_TOKEN"];
  if (!token) return null;
  return { host: host(), token };
}

export async function consultarGob(
  entidade: string,
  params: SearchParams,
): Promise<{ total: number; list: RegistroGob[] }> {
  const cred = credenciaisGob();
  if (!cred) throw new Error("Chave da API do GOB não configurada.");

  const url = `${cred.host}/api/v1/${entidade}?searchParams=${encodeURIComponent(
    JSON.stringify(params),
  )}`;

  const resposta = await fetch(url, {
    headers: { "X-Api-Key": cred.token, Accept: "application/json" },
  });

  if (!resposta.ok) {
    throw new Error(
      resposta.status === 401
        ? "Chave da API do GOB inválida ou sem permissão (401)."
        : `GOB respondeu ${resposta.status} em ${entidade}.`,
    );
  }

  const payload = (await resposta.json()) as { total?: number; list?: RegistroGob[] };
  return { total: payload.total ?? 0, list: payload.list ?? [] };
}

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function dataIso(v: unknown): string | null {
  const t = texto(v);
  if (!t) return null;
  const normal = /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00Z` : t.replace(" ", "T") + "Z";
  const d = new Date(normal);
  return Number.isNaN(+d) ? null : d.toISOString();
}

const SERVICOS: Record<string, string> = {
  "1": "Cobrança",
  "2": "Fiscalização",
  "3": "Malha Fiscal",
  "4": "e-Processo",
  "5": "Parcelamento",
};

/** Converte um registro de CaixaPostalEcac no formato da tabela mensagens. */
export function normalizarCaixaPostal(item: RegistroGob) {
  const enviadaEm = dataIso(item["dtEnvio"]) ?? dataIso(item["createdAt"]) ?? new Date().toISOString();
  const leitura = dataIso(item["dtLeitura"]);
  const codServico = texto(item["codServico"]);

  return {
    gob_id: texto(item["id"]),
    protocolo: texto(item["isnMensagem"]) ?? texto(item["nrMensagem"]) ?? texto(item["id"]) ?? "—",
    tipo: (codServico && SERVICOS[codServico]) ?? codServico,
    ni: texto(item["cnpj"]),
    cnpj_contribuinte: texto(item["cnpj"]) ?? "—",
    nome_contribuinte: texto(item["accountName"]) ?? "—",
    orgao: texto(item["origem"]) ?? "e-CAC",
    remetente: texto(item["origem"]),
    assunto: texto(item["name"]) ?? "—",
    conteudo: texto(item["msgConteudo"]) ?? "",
    data_recebimento: enviadaEm,
    ativo: item["actived"] !== false && item["accountActived"] !== false,
    arquivada: item["deleted"] === true,
    importante: item["relevancia"] === true || item["inRelevancia"] === true,
    // Leitura feita por uma pessoa no GOB (traz nome + data/hora) => conta como lida.
    // Leitura apenas sinalizada pelo e-CAC (dtLeitura) => permanece pendente no portal.
    leitura_gob: Boolean(texto(item["solicitacaoUserName"]) && dataIso(item["solicitacaoDataHora"])),
    leitor_gob: texto(item["solicitacaoUserName"]) ?? texto(item["assignedUserName"]),
    primeira_leitura_gob: dataIso(item["solicitacaoDataHora"]),
    data_leitura_gob: leitura,

    exibicao_ate: dataIso(item["dtExpiracao"]),
    triagem: (texto(item["triagem"]) ?? "nao_classificado")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace("naoclassificado", "nao_classificado"),
    tag: texto(item["description"]),
    organizacao: texto(item["accountName"]),
  };
}

export function textoGob(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

export function numeroGob(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
