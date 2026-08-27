/**
 * Núcleo da sincronização da Caixa Postal e-CAC com o GOB.
 * Usado pelo botão manual, pela sincronização automática ao abrir a tela
 * e pelo endpoint agendado (cron).
 */
import { consultarGob, credenciaisGob, normalizarCaixaPostal } from "@/lib/gob.server";

export type ResultadoSync = {
  ok: boolean;
  novas: number;
  atualizadas: number;
  total?: number;
  erro?: string;
  ignorada?: boolean;
  motivo?: string;
};

/** Intervalo mínimo entre sincronizações automáticas (minutos). */
const INTERVALO_MINUTOS = 15;
/** Tempo após o qual uma execução travada é considerada abandonada (minutos). */
const LEASE_MINUTOS = 20;

export async function executarSyncGob(opcoes?: { forcar?: boolean }): Promise<ResultadoSync> {
  const forcar = opcoes?.forcar === true;

  if (!credenciaisGob()) {
    return {
      ok: false,
      novas: 0,
      atualizadas: 0,
      erro: "Chave da API do GOB não configurada no portal.",
    };
  }

  const { supabaseAdmin } = await import("@/integrations/escritorio/client.server");

  // Single-flight + intervalo mínimo: evita execuções paralelas e repetidas.
  const { data: ultima } = await supabaseAdmin
    .from("sincronizacoes_gob")
    .select("id, situacao, iniciado_em, concluido_em")
    .order("iniciado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultima) {
    const inicio = new Date(ultima.iniciado_em).getTime();
    const idadeMin = (Date.now() - inicio) / 60000;
    if (ultima.situacao === "executando" && idadeMin < LEASE_MINUTOS) {
      return { ok: true, novas: 0, atualizadas: 0, ignorada: true, motivo: "em_execucao" };
    }
    if (!forcar && ultima.situacao !== "executando" && idadeMin < INTERVALO_MINUTOS) {
      return { ok: true, novas: 0, atualizadas: 0, ignorada: true, motivo: "recente" };
    }
  }

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
}
