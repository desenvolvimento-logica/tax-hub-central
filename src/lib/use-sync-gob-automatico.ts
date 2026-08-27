import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { sincronizarGobAuto } from "@/lib/gob.functions";

/**
 * Sincronização automática com o GOB enquanto o app está aberto:
 * roda uma vez ao abrir e depois a cada 5 minutos. Nada roda com o app fechado.
 */
export function useSyncGobAutomatico() {
  const sincronizarAuto = useServerFn(sincronizarGobAuto);
  const queryClient = useQueryClient();

  useEffect(() => {
    let ativo = true;

    const rodar = async () => {
      try {
        const r = await sincronizarAuto({});
        if (!ativo || r.ignorada || !r.ok) return;
        if (r.novas > 0 || r.atualizadas > 0) {
          queryClient.invalidateQueries({ queryKey: ["mensagens"] });
          queryClient.invalidateQueries({ queryKey: ["sincronizacoes-gob"] });
        }
      } catch {
        /* silencioso: a sincronização automática não interrompe a navegação */
      }
    };

    void rodar();
    const intervalo = window.setInterval(rodar, 5 * 60 * 1000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [sincronizarAuto, queryClient]);
}
