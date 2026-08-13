/**
 * Comparação antes/depois do acompanhamento para o log de alterações da equipe.
 * `null`, `""` e `false` são tratados como "não preenchido".
 */

export type Mudanca = { campo: string; anterior: string | null; novo: string | null };

const ROTULOS: Record<string, string> = {
  ordem_servico: "Ordem de serviço",
  terceiro: "Declaração de terceiro",
  aviso_pagamento: "Aviso de pagamento",
  aviso_pagamento_data: "Data do aviso de pagamento",
  aviso_pagamento_prazo: "Prazo do aviso de pagamento",
  pagamento_confirmado: "Pagamento confirmado em conta",
  pagamento_confirmado_em: "Data da confirmação do pagamento",
  compensacao_oficio: "Compensação de ofício",
  compensacao_oficio_prazo: "Prazo da compensação de ofício",
  compensacao_oficio_opcao: "Opção na compensação de ofício",
  intimacao: "Intimação",
  intimacao_prazo: "Prazo de atendimento da intimação",
  encerrado: "Acompanhamento encerrado",
  encerrado_em: "Data do encerramento",
  observacao: "Observação",
};

const OPCOES: Record<string, string> = {
  compensacao: "Compensação",
  recusa: "Recusa",
};

function humano(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "" || valor === false) return null;
  if (valor === true) return "Sim";
  if (typeof valor === "string") {
    if (OPCOES[valor]) return OPCOES[valor];
    const data = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (data) return `${data[3]}/${data[2]}/${data[1]}`;
    return valor;
  }
  return String(valor);
}

export function diferencas(
  anterior: Record<string, unknown> | null,
  novo: Record<string, unknown>,
): Mudanca[] {
  const mudancas: Mudanca[] = [];
  for (const [campo, rotulo] of Object.entries(ROTULOS)) {
    const antes = humano(anterior?.[campo]);
    const depois = humano(novo[campo]);
    if (antes !== depois) mudancas.push({ campo: rotulo, anterior: antes, novo: depois });
  }
  return mudancas;
}
