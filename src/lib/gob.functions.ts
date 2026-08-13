import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  consultarGob,
  credenciaisGob,
  normalizarCaixaPostal,
  numeroGob as numero,
  textoGob as texto,
} from "@/lib/gob.server";

export type ResultadoSync = {
  ok: boolean;
  novas: number;
  atualizadas: number;
  total?: number;
  erro?: string;
};

export const sincronizarGob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ResultadoSync> => {
    if (!credenciaisGob()) {
      return {
        ok: false,
        novas: 0,
        atualizadas: 0,
        erro: "Chave da API do GOB não configurada no portal.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: registro } = await supabaseAdmin
      .from("sincronizacoes_gob")
      .insert({ situacao: "executando" })
      .select("id")
      .single();

    try {
      const PAGINA = 200;
      const MAX_PAGINAS = 15;
      let novas = 0;
      let atualizadas = 0;
      let total = 0;

      for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
        const { total: totalGob, list } = await consultarGob("CaixaPostalEcac", {
          maxSize: PAGINA,
          offset: pagina * PAGINA,
          orderBy: "dtEnvio",
          order: "desc",
        });
        total = totalGob;
        if (!list.length) break;

        const normalizadas = list
          .map(normalizarCaixaPostal)
          .filter((m): m is ReturnType<typeof normalizarCaixaPostal> & { gob_id: string } =>
            Boolean(m.gob_id),
          );
        if (!normalizadas.length) continue;

        const ids = normalizadas.map((m) => m.gob_id);
        const { data: existentes } = await supabaseAdmin
          .from("mensagens")
          .select("gob_id")
          .in("gob_id", ids);
        const jaExistem = new Set((existentes ?? []).map((e) => e.gob_id));

        const { error } = await supabaseAdmin
          .from("mensagens")
          .upsert(normalizadas, { onConflict: "gob_id" });
        if (error) throw new Error(error.message);

        novas += normalizadas.filter((m) => !jaExistem.has(m.gob_id)).length;
        atualizadas += normalizadas.filter((m) => jaExistem.has(m.gob_id)).length;

        if (list.length < PAGINA) break;
      }

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

      return { ok: true, novas, atualizadas, total };
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

export type ItemPerdcomp = {
  id: string;
  nome: string;
  numeroPerdcomp: string | null;
  tipoDocumento: string | null;
  tipoCredito: string | null;
  situacao: string | null;
  ajudaSituacao: string | null;
  dataTransmissao: string | null;
  periodoApuracao: string | null;
  valorTotalCredito: number | null;
  totalDebitos: number | null;
  cnpj: string | null;
  accountName: string | null;
  // detalhamento (painel PERDCOMP)
  numeroPerdcompInicial: string | null;
  numeroPerdcompRelacionado: string | null;
  numeroPerdcompRetificado: string | null;
  numeroPerdcompCancelado: string | null;
  retificadoCancelado: string | null;
  retificador: boolean;
  original: boolean;
  ultimoRegistro: boolean;
  detentorCredito: string | null;
  tipoIdentificacaoCreditoDescricao: string | null;
  creditoAtualizado: number | null;
  creditoOriginalDataEntrega: number | null;
  saldoCreditoOriginal: number | null;
  selicAcumulada: number | null;
  totalCreditoOriginalUtilizado: number | null;
  valorPedidoRestituicao: number | null;
  valorCreditoDataTransmissao: number | null;
  valorUtilizadoPerdcomp: number | null;
  processoAdministrativo: string | null;
  processoHabilitacao: string | null;
  processoJudicial: string | null;
  numeroRecibo: string | null;
  dataConsulta: string | null;
  transmissaoViaDesktop: boolean;
  arquivoDocumentoName: string | null;
};

export type FiltrosPerdcomp = {
  busca?: string;
  situacao?: string;
  tipoDocumento?: string;
  tipoCredito?: string;
  empresa?: string;
  pagina?: number;
  porPagina?: number;
  ordenarPor?: string;
  ordem?: "asc" | "desc";
};

export type RespostaPerdcomp = {
  total: number;
  itens: ItemPerdcomp[];
  pagina: number;
  porPagina: number;
  erro?: string;
};

export const listarPerdcomp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FiltrosPerdcomp | undefined) => input ?? {})
  .handler(async ({ data }): Promise<RespostaPerdcomp> => {
    const pagina = Math.max(0, data.pagina ?? 0);
    const porPagina = Math.min(100, Math.max(10, data.porPagina ?? 50));

    if (!credenciaisGob()) {
      return {
        total: 0,
        itens: [],
        pagina,
        porPagina,
        erro: "Chave da API do GOB não configurada no portal.",
      };
    }

    const where: unknown[] = [];
    const busca = data.busca?.trim();
    if (busca) {
      const somenteDigitos = busca.replace(/\D/g, "");
      if (somenteDigitos.length >= 11 && somenteDigitos.length === busca.trim().length) {
        where.push({
          type: "or",
          value: [
            { type: "contains", attribute: "numeroPerdcomp", value: somenteDigitos },
            { type: "contains", attribute: "cnpj", value: somenteDigitos },
          ],
        });
      } else {
        where.push({
          type: "or",
          value: [
            { type: "contains", attribute: "name", value: busca },
            { type: "contains", attribute: "numeroPerdcomp", value: busca },
          ],
        });
      }
    }
    if (data.situacao?.trim()) {
      where.push({ type: "equals", attribute: "situacao", value: data.situacao.trim() });
    }
    if (data.tipoDocumento?.trim()) {
      where.push({ type: "equals", attribute: "tipoDocumento", value: data.tipoDocumento.trim() });
    }
    if (data.tipoCredito?.trim()) {
      where.push({ type: "equals", attribute: "tipoCredito", value: data.tipoCredito.trim() });
    }
    if (data.empresa?.trim()) {
      where.push({ type: "contains", attribute: "accountName", value: data.empresa.trim() });
    }

    try {
      const { total, list } = await consultarGob("Perdcomp", {
        maxSize: porPagina,
        offset: pagina * porPagina,
        orderBy: data.ordenarPor ?? "dataTransmissao",
        order: data.ordem ?? "desc",
        ...(where.length ? { where } : {}),
      });

      const itens: ItemPerdcomp[] = list.map((r) => ({
        id: String(r["id"] ?? ""),
        nome: String(r["name"] ?? "—"),
        numeroPerdcomp: texto(r["numeroPerdcomp"]),
        tipoDocumento: texto(r["tipoDocumento"]),
        tipoCredito: texto(r["tipoCredito"]),
        situacao: texto(r["situacao"]),
        ajudaSituacao: texto(r["ajudaSituacao"]),
        dataTransmissao: texto(r["dataTransmissao"]),
        periodoApuracao: texto(r["periodoApuracao"]),
        valorTotalCredito: numero(r["valorTotalCredito"]),
        totalDebitos: numero(r["totalDebitos"]),
        cnpj: texto(r["cnpj"]),
        accountName: texto(r["accountName"]),
        numeroPerdcompInicial: texto(r["numeroPerdcompInicial"]),
        numeroPerdcompRelacionado: texto(r["numeroPerdcompRelacionado"]),
        numeroPerdcompRetificado: texto(r["numeroPerdcompRetificado"]),
        numeroPerdcompCancelado: texto(r["numeroPerdcompCancelado"]),
        retificadoCancelado: texto(r["retificadoCancelado"]),
        retificador: Boolean(r["retificador"]),
        original: Boolean(r["original"]),
        ultimoRegistro: Boolean(r["ultimoRegistro"]),
        detentorCredito: texto(r["detentorCredito"]),
        tipoIdentificacaoCreditoDescricao: texto(r["tipoIdentificacaoCreditoDescricao"]),
        creditoAtualizado: numero(r["creditoAtualizado"]),
        creditoOriginalDataEntrega: numero(r["creditoOriginalDataEntrega"]),
        saldoCreditoOriginal: numero(r["saldoCreditoOriginal"]),
        selicAcumulada: numero(r["selicAcumulada"]),
        totalCreditoOriginalUtilizado: numero(r["totalCreditoOriginalUtilizado"]),
        valorPedidoRestituicao: numero(r["valorPedidoRestituicao"]),
        valorCreditoDataTransmissao: numero(r["valorCreditoDataTransmissao"]),
        valorUtilizadoPerdcomp: numero(r["valorUtilizadoPerdcomp"]),
        processoAdministrativo: texto(r["processoAdministrativo"]),
        processoHabilitacao: texto(r["processoHabilitacao"]),
        processoJudicial: texto(r["processoJudicial"]),
        numeroRecibo: texto(r["numeroRecibo"]),
        dataConsulta: texto(r["dataConsulta"]),
        transmissaoViaDesktop: Boolean(r["transmissaoViaDesktop"]),
        arquivoDocumentoName: texto(r["arquivoDocumentoName"]),
      }));

      return { total, itens, pagina, porPagina };
    } catch (e) {
      return {
        total: 0,
        itens: [],
        pagina,
        porPagina,
        erro: e instanceof Error ? e.message : String(e),
      };
    }
  });

