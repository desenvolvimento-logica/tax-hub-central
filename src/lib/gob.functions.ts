import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MensagemGob = Record<string, unknown>;

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function booleano(v: unknown, padrao = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "sim", "s", "yes"].includes(v.toLowerCase());
  if (typeof v === "number") return v !== 0;
  return padrao;
}

function data(v: unknown): string | null {
  const t = texto(v);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(+d) ? null : d.toISOString();
}

function pegar(item: MensagemGob, chaves: string[]): unknown {
  for (const chave of chaves) {
    if (item[chave] !== undefined && item[chave] !== null && item[chave] !== "") return item[chave];
  }
  return null;
}

/** Normaliza um item da Caixa Postal do GOB para o formato da tabela mensagens. */
function normalizar(item: MensagemGob) {
  const gobId =
    texto(pegar(item, ["id", "gob_id", "idMensagem", "mensagem_id", "protocolo", "numero"])) ?? null;
  const enviadaEm =
    data(pegar(item, ["enviada_em", "enviadaEm", "data_envio", "dataEnvio", "created_at"])) ??
    new Date().toISOString();

  return {
    gob_id: gobId,
    protocolo: texto(pegar(item, ["protocolo", "numero", "id"])) ?? gobId ?? "—",
    tipo: texto(pegar(item, ["tipo", "tipoMensagem"])),
    ni: texto(pegar(item, ["ni", "NI", "cnpj", "cpf_cnpj"])),
    cnpj_contribuinte: texto(pegar(item, ["ni", "cnpj", "cnpj_contribuinte"])) ?? "—",
    nome_contribuinte: texto(pegar(item, ["nome", "nome_contribuinte", "razao_social"])) ?? "—",
    orgao: texto(pegar(item, ["orgao", "remetente", "orgao_emissor"])) ?? "e-CAC",
    remetente: texto(pegar(item, ["remetente", "orgao"])),
    assunto: texto(pegar(item, ["assunto", "titulo"])) ?? "—",
    conteudo: texto(pegar(item, ["conteudo", "corpo", "mensagem", "texto"])) ?? "",
    data_recebimento: enviadaEm,
    ativo: booleano(pegar(item, ["ativo", "ativa"]), true),
    arquivada: booleano(pegar(item, ["arquivada", "arquivado"])),
    importante: booleano(pegar(item, ["importante"])),
    leitura_gob: Boolean(data(pegar(item, ["primeira_leitura", "primeiraLeitura", "lida_em"]))) ||
      booleano(pegar(item, ["lida", "lido"])),
    primeira_leitura_gob: data(pegar(item, ["primeira_leitura", "primeiraLeitura", "lida_em"])),
    data_leitura_gob: data(pegar(item, ["primeira_leitura", "primeiraLeitura", "lida_em"])),
    exibicao_ate: data(pegar(item, ["exibicao_ate", "exibicaoAte", "exibir_ate"])),
    triagem:
      texto(pegar(item, ["triagem", "situacao_triagem"]))
        ?.toLowerCase()
        .replace(/\s+/g, "_")
        .replace("não", "nao")
        .replace("concluído", "concluido") ?? "nao_classificado",
    tag: texto(pegar(item, ["tag", "tags", "etiqueta"])),
    organizacao: texto(pegar(item, ["organizacao", "organização", "empresa"])),
  };
}

export type ResultadoSync = {
  ok: boolean;
  novas: number;
  atualizadas: number;
  erro?: string;
};

export const sincronizarGob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ResultadoSync> => {
    const baseUrl = process.env["GOB_API_URL"];
    const token = process.env["GOB_API_TOKEN"];

    if (!baseUrl || !token) {
      return {
        ok: false,
        novas: 0,
        atualizadas: 0,
        erro: "Credenciais da API do GOB não configuradas no portal.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: registro } = await supabaseAdmin
      .from("sincronizacoes_gob")
      .insert({ situacao: "executando" })
      .select("id")
      .single();

    try {
      const resposta = await fetch(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!resposta.ok) {
        throw new Error(`GOB respondeu ${resposta.status}`);
      }
      const payload = (await resposta.json()) as unknown;
      const lista: MensagemGob[] = Array.isArray(payload)
        ? (payload as MensagemGob[])
        : (((payload as Record<string, unknown>)["mensagens"] ??
            (payload as Record<string, unknown>)["data"] ??
            (payload as Record<string, unknown>)["items"] ??
            []) as MensagemGob[]);

      const normalizadas = lista.map(normalizar).filter((m) => m.gob_id);
      const ids = normalizadas.map((m) => m.gob_id as string);

      const { data: existentes } = await supabaseAdmin
        .from("mensagens")
        .select("gob_id")
        .in("gob_id", ids.length ? ids : ["__vazio__"]);
      const jaExistem = new Set((existentes ?? []).map((e) => e.gob_id));

      if (normalizadas.length) {
        const { error } = await supabaseAdmin
          .from("mensagens")
          .upsert(normalizadas, { onConflict: "gob_id" });
        if (error) throw new Error(error.message);
      }

      const novas = normalizadas.filter((m) => !jaExistem.has(m.gob_id)).length;
      const atualizadas = normalizadas.length - novas;

      if (registro?.id) {
        await supabaseAdmin
          .from("sincronizacoes_gob")
          .update({
            situacao: "concluida",
            concluido_em: new Date().toISOString(),
            novas,
            atualizadas,
          })
          .eq("id", registro.id);
      }

      return { ok: true, novas, atualizadas };
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e);
      if (registro?.id) {
        await supabaseAdmin
          .from("sincronizacoes_gob")
          .update({ situacao: "erro", erro, concluido_em: new Date().toISOString() })
          .eq("id", registro.id);
      }
      return { ok: false, novas: 0, atualizadas: 0, erro };
    }
  });
