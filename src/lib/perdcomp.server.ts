/**
 * Camada de servidor do módulo PERDCOMP.
 * Espelha as declarações do GOB na base do HUB, roda a auditoria automática,
 * registra mudanças de situação e lê o responsável pelo preenchimento no PDF.
 */
import type { Json } from "@/integrations/supabase/types";
import { consultarGob, credenciaisGob, type RegistroGob } from "@/lib/gob.server";

type Achado = { codigo: string; descricao: string; severidade: "atencao" | "critico" };

function texto(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function numero(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function dataIso(v: unknown): string | null {
  const t = texto(v);
  if (!t) return null;
  const normal = /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00Z` : t.replace(" ", "T") + "Z";
  const d = new Date(normal);
  return Number.isNaN(+d) ? null : d.toISOString();
}

export type DeclaracaoNormalizada = ReturnType<typeof normalizar>;

export function normalizar(r: RegistroGob) {
  const credito = numero(r["valorTotalCredito"]) ?? numero(r["creditoAtualizado"]);
  const utilizado = numero(r["valorUtilizadoPerdcomp"]) ?? numero(r["totalCreditoOriginalUtilizado"]);
  const saldo =
    numero(r["saldoCreditoOriginal"]) ??
    (credito !== null && utilizado !== null ? credito - utilizado : null);

  return {
    gob_id: String(r["id"] ?? ""),
    numero_perdcomp: texto(r["numeroPerdcomp"]),
    numero_recibo: texto(r["numeroRecibo"]),
    cnpj: texto(r["cnpj"]),
    nome: texto(r["name"]),
    razao_social: texto(r["accountName"]),
    tipo_documento: texto(r["tipoDocumento"]),
    tipo_credito: texto(r["tipoCredito"]),
    grupo_tributo: texto(r["grupoTributo"]) ?? texto(r["tipoIdentificacaoCreditoDescricao"]),
    codigo_receita: texto(r["codigoReceita"]),
    situacao: texto(r["situacao"]),
    ajuda_situacao: texto(r["ajudaSituacao"]),
    periodo_apuracao: texto(r["periodoApuracao"]),
    data_transmissao: dataIso(r["dataTransmissao"]),
    ultimo_registro: r["ultimoRegistro"] === true,
    valor_total_credito: credito,
    valor_utilizado: utilizado,
    saldo_restante: saldo,
    credito_atualizado: numero(r["creditoAtualizado"]),
    total_debitos: numero(r["totalDebitos"]),
    saldo_credito_original: numero(r["saldoCreditoOriginal"]),
    processo_administrativo: texto(r["processoAdministrativo"]),
    processo_judicial: texto(r["processoJudicial"]),
    processo_habilitacao: texto(r["processoHabilitacao"]),
    arquivo_documento_id: texto(r["arquivoDocumentoId"]) ?? texto(r["arquivoDocumento"]),
    arquivo_documento_nome: texto(r["arquivoDocumentoName"]),
    arquivo_recibo_id: texto(r["arquivoReciboId"]) ?? texto(r["arquivoRecibo"]),
    arquivo_recibo_nome: texto(r["arquivoReciboName"]),
    dados: r as unknown as Json,
    ultima_sincronizacao: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Regras automáticas de auditoria aplicadas a cada declaração. */
export function auditar(d: DeclaracaoNormalizada): Achado[] {
  const achados: Achado[] = [];
  const credito = d.valor_total_credito;
  const utilizado = d.valor_utilizado;
  const saldo = d.saldo_restante;

  if (credito !== null && utilizado !== null && utilizado > credito + 0.01) {
    achados.push({
      codigo: "utilizado_maior_credito",
      descricao: "Valor utilizado maior que o crédito total informado.",
      severidade: "critico",
    });
  }
  if (
    credito !== null &&
    utilizado !== null &&
    saldo !== null &&
    Math.abs(credito - utilizado - saldo) > 0.02
  ) {
    achados.push({
      codigo: "divergencia_saldo",
      descricao: "Crédito menos utilizado não confere com o saldo informado.",
      severidade: "critico",
    });
  }
  if (saldo !== null && saldo < -0.01) {
    achados.push({
      codigo: "saldo_negativo",
      descricao: "Saldo restante negativo.",
      severidade: "critico",
    });
  }
  if (!d.periodo_apuracao) {
    achados.push({
      codigo: "competencia_ausente",
      descricao: "Período de apuração não informado.",
      severidade: "atencao",
    });
  }
  if (!d.cnpj || !d.razao_social) {
    achados.push({
      codigo: "cadastro_incompleto",
      descricao: "CNPJ ou razão social ausentes no cadastro.",
      severidade: "atencao",
    });
  }
  if (/retific|cancel/i.test(d.situacao ?? "")) {
    achados.push({
      codigo: "retificado_cancelado",
      descricao: "Situação indica retificação ou cancelamento — confirmar o documento vigente.",
      severidade: "atencao",
    });
  }
  return achados;
}

export type ResultadoSyncPerdcomp = {
  total: number;
  novas: number;
  atualizadas: number;
  alertas: number;
  achados: number;
};

export async function buscarPerdcomps(limite = 3000): Promise<RegistroGob[]> {
  if (!credenciaisGob()) throw new Error("Chave da API do GOB não configurada no portal.");
  const PAGINA = 200;
  const registros: RegistroGob[] = [];

  for (let offset = 0; offset < limite; offset += PAGINA) {
    const { list } = await consultarGob("Perdcomp", {
      maxSize: Math.min(PAGINA, limite - offset),
      offset,
      orderBy: "modifiedAt",
      order: "desc",
    });
    if (!list.length) break;
    registros.push(...list);
    if (list.length < PAGINA) break;
  }
  return registros;
}

export async function sincronizarComGob(limite = 3000): Promise<ResultadoSyncPerdcomp> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const registros = await buscarPerdcomps(limite);

  let novas = 0;
  let atualizadas = 0;
  let alertas = 0;
  let achados = 0;

  const BLOCO = 100;
  for (let i = 0; i < registros.length; i += BLOCO) {
    const bloco = registros
      .slice(i, i + BLOCO)
      .map(normalizar)
      .filter((d) => d.gob_id);
    if (!bloco.length) continue;

    const ids = bloco.map((d) => d.gob_id);
    const { data: existentes } = await supabaseAdmin
      .from("declaracoes")
      .select("id, gob_id, situacao")
      .in("gob_id", ids);
    const anteriores = new Map((existentes ?? []).map((e) => [e.gob_id, e]));

    const { data: salvas, error } = await supabaseAdmin
      .from("declaracoes")
      .upsert(bloco, { onConflict: "gob_id" })
      .select("id, gob_id, situacao");
    if (error) throw new Error(error.message);

    novas += bloco.filter((d) => !anteriores.has(d.gob_id)).length;
    atualizadas += bloco.filter((d) => anteriores.has(d.gob_id)).length;

    const porGob = new Map((salvas ?? []).map((s) => [s.gob_id, s.id]));

    // Mudança de situação => histórico + alerta
    const historicos: {
      declaracao_id: string;
      situacao_anterior: string | null;
      situacao_nova: string;
    }[] = [];
    const novosAlertas: {
      declaracao_id: string;
      tipo: string;
      prioridade: string;
      mensagem: string;
    }[] = [];

    for (const d of bloco) {
      const antes = anteriores.get(d.gob_id);
      const id = porGob.get(d.gob_id);
      if (!id || !d.situacao) continue;
      if (antes && (antes.situacao ?? null) !== d.situacao) {
        historicos.push({
          declaracao_id: id,
          situacao_anterior: antes.situacao ?? null,
          situacao_nova: d.situacao,
        });
        novosAlertas.push({
          declaracao_id: id,
          tipo: "mudanca_situacao",
          prioridade: /deferid|homolog/i.test(d.situacao) ? "normal" : "alta",
          mensagem: `Situação alterada de "${antes.situacao ?? "—"}" para "${d.situacao}".`,
        });
      } else if (!antes) {
        historicos.push({
          declaracao_id: id,
          situacao_anterior: null,
          situacao_nova: d.situacao,
        });
      }
    }

    if (historicos.length) await supabaseAdmin.from("status_historico").insert(historicos);
    if (novosAlertas.length) {
      await supabaseAdmin.from("alertas").insert(novosAlertas);
      alertas += novosAlertas.length;
    }

    // Auditoria idempotente
    const linhas = new Map<
      string,
      { declaracao_id: string; codigo: string; descricao: string; severidade: string }
    >();
    for (const d of bloco) {
      const id = porGob.get(d.gob_id);
      if (!id) continue;
      for (const a of auditar(d)) {
        linhas.set(`${id}:${a.codigo}`, { declaracao_id: id, ...a });
      }
    }
    if (linhas.size) {
      await supabaseAdmin
        .from("auditoria_achados")
        .upsert([...linhas.values()], {
          onConflict: "declaracao_id,codigo",
          ignoreDuplicates: true,
        });
      achados += linhas.size;
    }
  }

  return { total: registros.length, novas, atualizadas, alertas, achados };
}

/** Proxy do anexo do GOB (recibo ou declaração) em base64. */
export async function baixarDocumentoGob(
  attachmentId: string,
): Promise<{ base64: string; nome: string; mime: string }> {
  const cred = credenciaisGob();
  if (!cred) throw new Error("Chave da API do GOB não configurada no portal.");

  const resposta = await fetch(`${cred.host}/api/v1/Attachment/file/${attachmentId}`, {
    headers: { "X-Api-Key": cred.token },
  });
  if (!resposta.ok) throw new Error(`Não foi possível baixar o anexo (${resposta.status}).`);

  const buffer = new Uint8Array(await resposta.arrayBuffer());
  let binario = "";
  for (let i = 0; i < buffer.length; i += 8192) {
    binario += String.fromCharCode(...buffer.subarray(i, i + 8192));
  }
  const dispo = resposta.headers.get("content-disposition") ?? "";
  const nome = /filename="?([^";]+)"?/.exec(dispo)?.[1] ?? `${attachmentId}.pdf`;

  return {
    base64: btoa(binario),
    nome,
    mime: resposta.headers.get("content-type") ?? "application/pdf",
  };
}

export type Responsavel = {
  nome: string | null;
  cpf: string | null;
  crc: string | null;
  email: string | null;
};

export function extrairResponsavelDoTexto(txt: string): Responsavel {
  const limpo = txt.replace(/\s+/g, " ");
  const nome =
    /respons[áa]vel(?:\s+pelo\s+preenchimento)?[^:]*:\s*([A-ZÁÂÃÉÊÍÓÔÕÚÇ][^0-9]{4,80}?)(?=\s+(?:CPF|CRC|E-?mail)\b)/i.exec(
      limpo,
    )?.[1] ?? null;
  const cpf = /CPF[^\d]{0,12}(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i.exec(limpo)?.[1] ?? null;
  const crc = /CRC[^\w]{0,12}([\w./-]{4,20})/i.exec(limpo)?.[1] ?? null;
  const email = /[\w.+-]+@[\w-]+\.[\w.]{2,}/.exec(limpo)?.[0] ?? null;
  return { nome: nome?.trim() ?? null, cpf, crc, email };
}

export async function lerResponsavelDoPdf(base64: string): Promise<Responsavel> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return extrairResponsavelDoTexto(Array.isArray(text) ? text.join(" ") : text);
}

export async function sincronizarResponsavel(declaracaoId: string): Promise<Responsavel> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: dec } = await supabaseAdmin
    .from("declaracoes")
    .select("id, arquivo_documento_id, arquivo_recibo_id")
    .eq("id", declaracaoId)
    .maybeSingle();

  const anexo = dec?.arquivo_documento_id ?? dec?.arquivo_recibo_id;
  if (!anexo) throw new Error("Declaração sem PDF disponível no GOB.");

  const arquivo = await baixarDocumentoGob(anexo);
  const resp = await lerResponsavelDoPdf(arquivo.base64);

  await supabaseAdmin
    .from("declaracoes")
    .update({
      responsavel_nome: resp.nome,
      responsavel_cpf: resp.cpf,
      responsavel_crc: resp.crc,
      responsavel_email: resp.email,
      responsavel_extraido_em: new Date().toISOString(),
    })
    .eq("id", declaracaoId);

  return resp;
}

export async function extrairResponsaveisPendentes(limite = 150): Promise<{
  processadas: number;
  encontrados: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("declaracoes")
    .select("id")
    .is("responsavel_extraido_em", null)
    .not("arquivo_documento_id", "is", null)
    .limit(Math.min(400, Math.max(1, limite)));

  let encontrados = 0;
  for (const linha of data ?? []) {
    try {
      const resp = await sincronizarResponsavel(linha.id);
      if (resp.nome) encontrados += 1;
    } catch {
      await supabaseAdmin
        .from("declaracoes")
        .update({ responsavel_extraido_em: new Date().toISOString() })
        .eq("id", linha.id);
    }
  }
  return { processadas: data?.length ?? 0, encontrados };
}
