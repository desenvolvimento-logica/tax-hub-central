import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consultarGob, credenciaisGob, normalizarCaixaPostal } from "@/lib/gob.server";

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
};

export const listarPerdcomp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { busca?: string; situacao?: string } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<{ total: number; itens: ItemPerdcomp[]; erro?: string }> => {
    if (!credenciaisGob()) {
      return { total: 0, itens: [], erro: "Chave da API do GOB não configurada no portal." };
    }

    const where: unknown[] = [];
    if (data.busca?.trim()) {
      where.push({ type: "contains", attribute: "name", value: data.busca.trim() });
    }
    if (data.situacao?.trim()) {
      where.push({ type: "equals", attribute: "situacao", value: data.situacao.trim() });
    }

    try {
      const { total, list } = await consultarGob("Perdcomp", {
        maxSize: 100,
        offset: 0,
        orderBy: "dataTransmissao",
        order: "desc",
        ...(where.length ? { where } : {}),
      });

      const itens = list.map((r) => ({
        id: String(r["id"] ?? ""),
        nome: String(r["name"] ?? "—"),
        numeroPerdcomp: (r["numeroPerdcomp"] as string | null) ?? null,
        tipoDocumento: (r["tipoDocumento"] as string | null) ?? null,
        tipoCredito: (r["tipoCredito"] as string | null) ?? null,
        situacao: (r["situacao"] as string | null) ?? null,
        ajudaSituacao: (r["ajudaSituacao"] as string | null) ?? null,
        dataTransmissao: (r["dataTransmissao"] as string | null) ?? null,
        periodoApuracao: (r["periodoApuracao"] as string | null) ?? null,
        valorTotalCredito: (r["valorTotalCredito"] as number | null) ?? null,
        totalDebitos: (r["totalDebitos"] as number | null) ?? null,
        cnpj: (r["cnpj"] as string | null) ?? null,
        accountName: (r["accountName"] as string | null) ?? null,
      }));

      return { total, itens };
    } catch (e) {
      return { total: 0, itens: [], erro: e instanceof Error ? e.message : String(e) };
    }
  });
