// Domínio da Caixa Postal e-CAC (GOB): rótulos, opções de filtro e helpers de data.

export const TRIAGEM_LABEL: Record<string, string> = {
  nao_classificado: "Não Classificado",
  em_tratativa: "Em Tratativa",
  concluido: "Concluído",
};

export const TAGS_GOB = [
  "BALCÃO - PARCELAMENTO",
  "Holding",
  "Lucro Presumido",
  "Lucro Real",
  "SEM FINS LUCRATIVOS",
  "SEM MOVIMENTO",
  "SIMEI",
  "Simples Nacional",
  "SOMENTE DP",
] as const;

export const PERIODO_OPCOES = [
  { valor: "sempre", label: "Sempre" },
  { valor: "vazio", label: "É vazio" },
  { valor: "ultimos_7", label: "Últimos 7 dias" },
  { valor: "mes_corrente", label: "Mês corrente" },
  { valor: "ultimo_mes", label: "Último mês" },
  { valor: "proximo_mes", label: "Próximo mês" },
  { valor: "trimestre_corrente", label: "Trimestre corrente" },
  { valor: "ultimo_trimestre", label: "Último trimestre" },
  { valor: "ano_corrente", label: "Ano corrente" },
  { valor: "ultimo_ano", label: "Último ano" },
  { valor: "hoje", label: "Hoje" },
  { valor: "passado", label: "Passado" },
  { valor: "futuro", label: "Futuro" },
  { valor: "entre", label: "Entre" },
] as const;

export const SIM_NAO_OPCOES = [
  { valor: "todos", label: "Todos" },
  { valor: "sim", label: "Sim" },
  { valor: "nao", label: "Não" },
] as const;

function inicioDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function intervaloTrimestre(ano: number, trimestre: number) {
  const inicio = new Date(ano, trimestre * 3, 1);
  const fim = new Date(ano, trimestre * 3 + 3, 1);
  return { inicio, fim };
}

/** Avalia um valor de data contra um dos presets de período do GOB. */
export function dentroDoPeriodo(
  valor: string | null | undefined,
  preset: string,
  de?: string,
  ate?: string,
): boolean {
  if (preset === "sempre") return true;
  if (preset === "vazio") return !valor;
  if (!valor) return false;

  const data = new Date(valor);
  const agora = new Date();
  const hoje = inicioDoDia(agora);
  const mesAtual = agora.getMonth();
  const ano = agora.getFullYear();
  const trimestreAtual = Math.floor(mesAtual / 3);

  switch (preset) {
    case "ultimos_7":
      return data >= new Date(hoje.getTime() - 6 * 86400000);
    case "hoje":
      return data >= hoje && data < new Date(hoje.getTime() + 86400000);
    case "passado":
      return data < agora;
    case "futuro":
      return data > agora;
    case "mes_corrente":
      return data >= new Date(ano, mesAtual, 1) && data < new Date(ano, mesAtual + 1, 1);
    case "ultimo_mes":
      return data >= new Date(ano, mesAtual - 1, 1) && data < new Date(ano, mesAtual, 1);
    case "proximo_mes":
      return data >= new Date(ano, mesAtual + 1, 1) && data < new Date(ano, mesAtual + 2, 1);
    case "trimestre_corrente": {
      const { inicio, fim } = intervaloTrimestre(ano, trimestreAtual);
      return data >= inicio && data < fim;
    }
    case "ultimo_trimestre": {
      const t = trimestreAtual === 0 ? 3 : trimestreAtual - 1;
      const a = trimestreAtual === 0 ? ano - 1 : ano;
      const { inicio, fim } = intervaloTrimestre(a, t);
      return data >= inicio && data < fim;
    }
    case "ano_corrente":
      return data >= new Date(ano, 0, 1) && data < new Date(ano + 1, 0, 1);
    case "ultimo_ano":
      return data >= new Date(ano - 1, 0, 1) && data < new Date(ano, 0, 1);
    case "entre": {
      if (de && data < inicioDoDia(new Date(de))) return false;
      if (ate && data >= new Date(inicioDoDia(new Date(ate)).getTime() + 86400000)) return false;
      return true;
    }
    default:
      return true;
  }
}

/**
 * Regra do HUB: mesmo que o GOB informe leitura no e-CAC, a primeira leitura só
 * é considerada efetiva quando um colaborador visualiza a mensagem no portal.
 */
export function primeiraLeituraHumana(
  visualizacoes: { data_visualizacao: string; perfis: { nome_completo: string } | null }[] | null,
): { quem: string; quando: string } | null {
  const ordenadas = [...(visualizacoes ?? [])].sort(
    (a, b) => +new Date(a.data_visualizacao) - +new Date(b.data_visualizacao),
  );
  const primeira = ordenadas[0];
  if (!primeira) return null;
  return { quem: primeira.perfis?.nome_completo ?? "—", quando: primeira.data_visualizacao };
}
