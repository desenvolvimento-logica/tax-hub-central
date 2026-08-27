import { createFileRoute } from "@tanstack/react-router";

import { executarSyncGob } from "@/lib/gob-sync.server";

/**
 * Endpoint agendado (cron) da sincronização com o GOB.
 * Requer o cabeçalho Authorization: Bearer <GOB_SYNC_CRON_SECRET>.
 */
async function tratar({ request }: { request: Request }) {
  const segredo = process.env["GOB_SYNC_CRON_SECRET"];
  if (!segredo) {
    return Response.json({ ok: false, erro: "Cron não configurado." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado", { status: 401 });
  }

  const resultado = await executarSyncGob();
  return Response.json(resultado, { status: resultado.ok ? 200 : 500 });
}

export const Route = createFileRoute("/api/public/sincronizar-gob")({
  server: { handlers: { GET: tratar, POST: tratar } },
});
