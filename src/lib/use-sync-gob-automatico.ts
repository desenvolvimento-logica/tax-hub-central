import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { sincronizarGobAuto } from "@/lib/gob.functions";

const INTERVALO_MS = 5 * 60 * 1000;

/** Momento (epoch ms) da próxima sincronização automática, compartilhado com a UI. */
let proximaEm: number | null = null;
const inscritos = new Set<() => void>();

function definirProxima(valor: number | null) {
  proximaEm = valor;
  inscritos.forEach((fn) => fn());
}

/** Segundos restantes até a próxima sincronização automática (null quando não agendada). */
export function useProximaSincronizacao(): number | null {
  const [segundos, setSegundos] = useState<number | null>(null);

  useEffect(() => {
    const calcular = () =>
      setSegundos(proximaEm ? Math.max(0, Math.round((proximaEm - Date.now()) / 1000)) : null);
    calcular();
    inscritos.add(calcular);
    const t = window.setInterval(calcular, 1000);
    return () => {
      inscritos.delete(calcular);
      window.clearInterval(t);
    };
  }, []);

  return segundos;
}

export function formatarContagem(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
      } finally {
        if (ativo) definirProxima(Date.now() + INTERVALO_MS);
      }
    };

    definirProxima(Date.now() + INTERVALO_MS);
    void rodar();
    const intervalo = window.setInterval(rodar, INTERVALO_MS);
    return () => {
      ativo = false;
      definirProxima(null);
      window.clearInterval(intervalo);
    };
  }, [sincronizarAuto, queryClient]);
}
