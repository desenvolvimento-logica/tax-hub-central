import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireEscritorioAuth as requireSupabaseAuth } from "@/integrations/escritorio/auth-middleware";

export type Declaracao = {
  id: string;
  gob_id: string;
  numero_perdcomp: string | null;
  numero_recibo: string | null;
  cnpj: string | null;
  nome: string | null;
  razao_social: string | null;
  tipo_documento: string | null;
  tipo_credito: string | null;
  grupo_tributo: string | null;
  codigo_receita: string | null;
  situacao: string | null;
  ajuda_situacao: string | null;
  periodo_apuracao: string | null;
  data_transmissao: string | null;
  ultimo_registro: boolean;
  valor_total_credito: number | null;
  valor_utilizado: number | null;
  saldo_restante: number | null;
  credito_atualizado: number | null;
  total_debitos: number | null;
  saldo_credito_original: number | null;
  processo_administrativo: string | null;
  processo_judicial: string | null;
  processo_habilitacao: string | null;
  arquivo_documento_id: string | null;
  arquivo_documento_nome: string | null;
  arquivo_recibo_id: string | null;
  arquivo_recibo_nome: string | null;
  responsavel_nome: string | null;
  responsavel_cpf: string | null;
  responsavel_crc: string | null;
  responsavel_email: string | null;
  ultima_sincronizacao: string;
};

export type Acompanhamento = {
  declaracao_id: string;
  responsavel_id: string | null;
  ordem_servico: string;
  terceiro: boolean;
  aviso_pagamento: boolean;
  aviso_pagamento_data: string | null;
  aviso_pagamento_prazo: string | null;
  pagamento_confirmado: boolean;
  pagamento_confirmado_em: string | null;
  compensacao_oficio: boolean;
  compensacao_oficio_prazo: string | null;
  compensacao_oficio_opcao: string;
  intimacao: boolean;
  intimacao_prazo: string | null;
  encerrado: boolean;
  encerrado_em: string | null;
  observacao: string;
};

export type Achado = {
  id: string;
  declaracao_id: string;
  codigo: string;
  descricao: string;
  severidade: string;
  revisado: boolean;
  revisado_em: string | null;
  criado_em: string;
};

export type Alerta = {
  id: string;
  declaracao_id: string;
  tipo: string;
  prioridade: string;
  mensagem: string;
  resolvido: boolean;
  resolvido_em: string | null;
  criado_em: string;
};

export type LogAlteracao = {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_nome: string;
  criado_em: string;
};

export type HistoricoSituacao = {
  id: string;
  situacao_anterior: string | null;
  situacao_nova: string;
  registrado_em: string;
};

const CAMPOS_DECLARACAO =
  "id, gob_id, numero_perdcomp, numero_recibo, cnpj, nome, razao_social, tipo_documento, tipo_credito, grupo_tributo, codigo_receita, situacao, ajuda_situacao, periodo_apuracao, data_transmissao, ultimo_registro, valor_total_credito, valor_utilizado, saldo_restante, credito_atualizado, total_debitos, saldo_credito_original, processo_administrativo, processo_judicial, processo_habilitacao, arquivo_documento_id, arquivo_documento_nome, arquivo_recibo_id, arquivo_recibo_nome, responsavel_nome, responsavel_cpf, responsavel_crc, responsavel_email, ultima_sincronizacao";

const CAMPOS_ACOMPANHAMENTO =
  "declaracao_id, responsavel_id, ordem_servico, terceiro, aviso_pagamento, aviso_pagamento_data, aviso_pagamento_prazo, pagamento_confirmado, pagamento_confirmado_em, compensacao_oficio, compensacao_oficio_prazo, compensacao_oficio_opcao, intimacao, intimacao_prazo, encerrado, encerrado_em, observacao";

export const sincronizarPerdcomp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { sincronizarComGob } = await import("@/lib/perdcomp.server");
    try {
      return { ok: true as const, ...(await sincronizarComGob(3000)) };
    } catch (e) {
      return { ok: false as const, erro: e instanceof Error ? e.message : String(e) };
    }
  });

export const listarDeclaracoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    async function todasDeclaracoes() {
      const PAGINA = 1000;
      const total: Declaracao[] = [];
      for (let inicio = 0; inicio < 6000; inicio += PAGINA) {
        const { data } = await context.supabase
          .from("declaracoes")
          .select(CAMPOS_DECLARACAO)
          .order("data_transmissao", { ascending: false, nullsFirst: false })
          .range(inicio, inicio + PAGINA - 1);
        const bloco = (data ?? []) as Declaracao[];
        total.push(...bloco);
        if (bloco.length < PAGINA) break;
      }
      return total;
    }

    async function todosAchados() {
      const PAGINA = 1000;
      const total: Achado[] = [];
      for (let inicio = 0; inicio < 6000; inicio += PAGINA) {
        const { data } = await context.supabase
          .from("auditoria_achados")
          .select("id, declaracao_id, codigo, descricao, severidade, revisado, revisado_em, criado_em")
          .range(inicio, inicio + PAGINA - 1);
        const bloco = (data ?? []) as Achado[];
        total.push(...bloco);
        if (bloco.length < PAGINA) break;
      }
      return total;
    }

    const [declaracoes, acompanhamentos, achados, alertas] = await Promise.all([
      todasDeclaracoes(),
      context.supabase.from("acompanhamentos").select(CAMPOS_ACOMPANHAMENTO),
      todosAchados(),
      context.supabase
        .from("alertas")
        .select("id, declaracao_id, tipo, prioridade, mensagem, resolvido, resolvido_em, criado_em")
        .order("criado_em", { ascending: false })
        .limit(500),
    ]);

    return {
      declaracoes,
      acompanhamentos: (acompanhamentos.data ?? []) as Acompanhamento[],
      achados,
      alertas: (alertas.data ?? []) as Alerta[],
    };
  });

export const obterDeclaracao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [declaracao, acompanhamento, achados, historico, alertas, log] = await Promise.all([
      context.supabase.from("declaracoes").select(CAMPOS_DECLARACAO).eq("id", data.id).maybeSingle(),
      context.supabase
        .from("acompanhamentos")
        .select(CAMPOS_ACOMPANHAMENTO)
        .eq("declaracao_id", data.id)
        .maybeSingle(),
      context.supabase
        .from("auditoria_achados")
        .select("id, declaracao_id, codigo, descricao, severidade, revisado, revisado_em, criado_em")
        .eq("declaracao_id", data.id),
      context.supabase
        .from("status_historico")
        .select("id, situacao_anterior, situacao_nova, registrado_em")
        .eq("declaracao_id", data.id)
        .order("registrado_em", { ascending: false }),
      context.supabase
        .from("alertas")
        .select("id, declaracao_id, tipo, prioridade, mensagem, resolvido, resolvido_em, criado_em")
        .eq("declaracao_id", data.id)
        .order("criado_em", { ascending: false }),
      context.supabase
        .from("log_alteracoes")
        .select("id, campo, valor_anterior, valor_novo, usuario_nome, criado_em")
        .eq("declaracao_id", data.id)
        .order("criado_em", { ascending: false }),
    ]);

    return {
      declaracao: (declaracao.data ?? null) as Declaracao | null,
      acompanhamento: (acompanhamento.data ?? null) as Acompanhamento | null,
      achados: (achados.data ?? []) as Achado[],
      historico: (historico.data ?? []) as HistoricoSituacao[],
      alertas: (alertas.data ?? []) as Alerta[],
      log: (log.data ?? []) as LogAlteracao[],
    };
  });

const esquemaAcompanhamento = z.object({
  declaracao_id: z.string().uuid(),
  ordem_servico: z.string().max(120).default(""),
  terceiro: z.boolean().default(false),
  aviso_pagamento: z.boolean().default(false),
  aviso_pagamento_data: z.string().nullable().default(null),
  aviso_pagamento_prazo: z.string().nullable().default(null),
  pagamento_confirmado: z.boolean().default(false),
  pagamento_confirmado_em: z.string().nullable().default(null),
  compensacao_oficio: z.boolean().default(false),
  compensacao_oficio_prazo: z.string().nullable().default(null),
  compensacao_oficio_opcao: z.enum(["", "compensacao", "recusa"]).default(""),
  intimacao: z.boolean().default(false),
  intimacao_prazo: z.string().nullable().default(null),
  encerrado: z.boolean().default(false),
  encerrado_em: z.string().nullable().default(null),
  observacao: z.string().max(4000).default(""),
});

export type EntradaAcompanhamento = z.input<typeof esquemaAcompanhamento>;

export const salvarAcompanhamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: EntradaAcompanhamento) => esquemaAcompanhamento.parse(d))
  .handler(async ({ data, context }) => {
    const { diferencas } = await import("@/lib/perdcomp.log");
    const { supabaseAdmin } = await import("@/integrations/escritorio/client.server");

    const { data: perfil } = await context.supabase
      .from("perfis")
      .select("id, nome_completo")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: papeis } = await context.supabase
      .from("perfil_papeis")
      .select("papeis(nome)")
      .eq("perfil_id", perfil?.id ?? "");
    const nomes = (papeis ?? []).flatMap((p) => {
      const papel = p.papeis as { nome: string } | { nome: string }[] | null;
      if (!papel) return [];
      return Array.isArray(papel) ? papel.map((x) => x.nome) : [papel.nome];
    });
    const admin = nomes.includes("admin");

    const { data: anterior } = await supabaseAdmin
      .from("acompanhamentos")
      .select(CAMPOS_ACOMPANHAMENTO)
      .eq("declaracao_id", data.declaracao_id)
      .maybeSingle();

    if (anterior?.encerrado && !data.encerrado && !admin) {
      return { ok: false as const, erro: "Somente administradores podem reabrir um acompanhamento encerrado." };
    }

    const registro = {
      ...data,
      responsavel_id: perfil?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("acompanhamentos")
      .upsert(registro, { onConflict: "declaracao_id" });
    if (error) return { ok: false as const, erro: error.message };

    const mudancas = diferencas(anterior as Record<string, unknown> | null, data);
    if (mudancas.length) {
      await supabaseAdmin.from("log_alteracoes").insert(
        mudancas.map((m: { campo: string; anterior: string | null; novo: string | null }) => ({
          declaracao_id: data.declaracao_id,
          usuario_id: perfil?.id ?? null,
          usuario_nome: perfil?.nome_completo ?? "",
          campo: m.campo,
          valor_anterior: m.anterior,
          valor_novo: m.novo,
        })),
      );
    }

    return { ok: true as const, alteracoes: mudancas.length };
  });

export const revisarAchado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/escritorio/client.server");
    const { data: perfil } = await context.supabase
      .from("perfis")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("auditoria_achados")
      .update({ revisado: true, revisado_por: perfil?.id ?? null, revisado_em: new Date().toISOString() })
      .eq("id", data.id);
    return error ? { ok: false as const, erro: error.message } : { ok: true as const };
  });

export const resolverAlerta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/escritorio/client.server");
    const { data: perfil } = await context.supabase
      .from("perfis")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("alertas")
      .update({ resolvido: true, resolvido_por: perfil?.id ?? null, resolvido_em: new Date().toISOString() })
      .eq("id", data.id);
    return error ? { ok: false as const, erro: error.message } : { ok: true as const };
  });

export const baixarArquivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { declaracaoId: string; tipo: "recibo" | "documento" }) =>
    z
      .object({ declaracaoId: z.string().uuid(), tipo: z.enum(["recibo", "documento"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { baixarDocumentoGob } = await import("@/lib/perdcomp.server");
    const { data: dec } = await context.supabase
      .from("declaracoes")
      .select("arquivo_documento_id, arquivo_recibo_id")
      .eq("id", data.declaracaoId)
      .maybeSingle();

    const anexo = data.tipo === "recibo" ? dec?.arquivo_recibo_id : dec?.arquivo_documento_id;
    if (!anexo) return { ok: false as const, erro: "Anexo não disponível no GOB." };

    try {
      return { ok: true as const, ...(await baixarDocumentoGob(anexo)) };
    } catch (e) {
      return { ok: false as const, erro: e instanceof Error ? e.message : String(e) };
    }
  });

export const buscarResponsavel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { sincronizarResponsavel } = await import("@/lib/perdcomp.server");
    try {
      return { ok: true as const, responsavel: await sincronizarResponsavel(data.id) };
    } catch (e) {
      return { ok: false as const, erro: e instanceof Error ? e.message : String(e) };
    }
  });

export const extrairResponsaveis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limite?: number } | undefined) =>
    z.object({ limite: z.number().int().min(1).max(400).default(150) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { extrairResponsaveisPendentes } = await import("@/lib/perdcomp.server");
    try {
      return { ok: true as const, ...(await extrairResponsaveisPendentes(data.limite)) };
    } catch (e) {
      return { ok: false as const, erro: e instanceof Error ? e.message : String(e) };
    }
  });
