/**
 * Módulo de Diagnóstico Fiscal — tipos, textos institucionais e regras de
 * sinalização automática usadas na geração do relatório enviado ao cliente.
 */

export type SituacaoAmbito = "regular" | "com_debitos" | "nao_aplicavel";

export type SituacaoDebito = "aberto" | "parcelado" | "exigibilidade_suspensa" | "divida_ativa";

export type Debito = {
  id: string;
  tributo: string;
  referencia: string;
  vencimento: string;
  valor: string;
  situacao: SituacaoDebito;
};

export type Declaracao = {
  id: string;
  tipo: string;
  referencia: string;
  situacao: string;
};

export type Documento = {
  nome: string;
  caminho: string;
};

export type Ambito = {
  chave: AmbitoChave;
  situacao: SituacaoAmbito;
  debitos: Debito[];
  documentos: Documento[];
  observacao: string;
};

export type AmbitoChave = "municipal" | "estadual_nao_inscritos" | "estadual_inscritos" | "federal";

export type DadosDiagnostico = {
  ambitos: Record<AmbitoChave, Ambito>;
  declaracoes: Declaracao[];
  mensagemInicial: string;
  mensagemFinal: string;
};

export const AMBITOS: {
  chave: AmbitoChave;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
}[] = [
  {
    chave: "municipal",
    titulo: "Âmbito Municipal",
    descricao: "Relatório de débitos ou certidão emitida pela Prefeitura.",
    obrigatorio: true,
  },
  {
    chave: "estadual_nao_inscritos",
    titulo: "Âmbito Estadual — débitos não inscritos",
    descricao: "Relatório de débitos ou certidão da Secretaria da Fazenda estadual.",
    obrigatorio: true,
  },
  {
    chave: "estadual_inscritos",
    titulo: "Âmbito Estadual — débitos inscritos (Dívida Ativa)",
    descricao: "Opcional: em alguns estados não existe documento específico para inscritos.",
    obrigatorio: false,
  },
  {
    chave: "federal",
    titulo: "Âmbito Federal",
    descricao: "Relatório de situação fiscal ou certidão da Receita Federal/PGFN.",
    obrigatorio: true,
  },
];

export const SITUACAO_AMBITO_LABEL: Record<SituacaoAmbito, string> = {
  regular: "Regular — certidão negativa/positiva com efeito de negativa",
  com_debitos: "Débitos identificados",
  nao_aplicavel: "Não aplicável / documento indisponível",
};

export const SITUACAO_DEBITO_LABEL: Record<SituacaoDebito, string> = {
  aberto: "Em aberto",
  parcelado: "Parcelado",
  exigibilidade_suspensa: "Exigibilidade suspensa",
  divida_ativa: "Inscrito em dívida ativa",
};

export const MENSAGEM_INICIAL_PADRAO =
  "Realizamos o levantamento de débitos da sua empresa nos portais governamentais nas esferas municipal, estadual e federal. O objetivo deste diagnóstico é apresentar, de forma clara e organizada, a situação fiscal identificada na data da consulta, permitindo que a empresa acompanhe suas pendências e planeje as regularizações necessárias com segurança.";

export const MENSAGEM_FINAL_PADRAO =
  "O Departamento Tributário permanece à disposição para esclarecer dúvidas, realizar o recálculo de guias, apresentar as demais formas de pagamento disponíveis e acompanhar a regularização dos débitos apontados. Basta acionar o seu contato principal no departamento.";

export const AVISO_SINDICAL =
  "Débitos sindicais não estão incluídos no levantamento. Devido às peculiaridades desse tipo de consulta, o assunto será tratado diretamente com o Departamento Pessoal. Caso tenha interesse, ficamos à disposição.";

export const AVISO_IPVA =
  "Informamos que débitos referentes à IPVA devem ser verificados diretamente com o despachante.";

export const AVISO_ESTADUAL =
  "Caso haja débitos Estaduais que constem em parcelamento ou exigibilidade suspensa, os mesmos impedem a emissão automática da Certidão Negativa de Débitos. Portanto, caso seja necessária a emissão, deverá ser solicitada através de processo administrativo.";


export function ambitoVazio(chave: AmbitoChave): Ambito {
  return { chave, situacao: "regular", debitos: [], documentos: [], observacao: "" };
}

export function dadosVazios(): DadosDiagnostico {
  return {
    ambitos: {
      municipal: ambitoVazio("municipal"),
      estadual_nao_inscritos: ambitoVazio("estadual_nao_inscritos"),
      estadual_inscritos: { ...ambitoVazio("estadual_inscritos"), situacao: "nao_aplicavel" },
      federal: ambitoVazio("federal"),
    },
    declaracoes: [],
    mensagemInicial: MENSAGEM_INICIAL_PADRAO,
    mensagemFinal: MENSAGEM_FINAL_PADRAO,
  };
}

export function debitoVazio(): Debito {
  return {
    id: crypto.randomUUID(),
    tributo: "",
    referencia: "",
    vencimento: "",
    valor: "",
    situacao: "aberto",
  };
}

export function declaracaoVazia(): Declaracao {
  return { id: crypto.randomUUID(), tipo: "", referencia: "", situacao: "Pendente de entrega" };
}

export function paraNumero(valor: string): number {
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function totalAmbito(ambito: Ambito): number {
  return ambito.debitos.reduce((soma, d) => soma + paraNumero(d.valor), 0);
}

export function temIpva(dados: DadosDiagnostico): boolean {
  return Object.values(dados.ambitos).some((a) =>
    a.debitos.some((d) => /ipva/i.test(d.tributo)),
  );
}

export function temDebitoEstadual(dados: DadosDiagnostico): boolean {
  return (["estadual_nao_inscritos", "estadual_inscritos"] as AmbitoChave[]).some(
    (chave) => dados.ambitos[chave].debitos.length > 0,
  );
}

export function totalGeral(dados: DadosDiagnostico): number {
  return Object.values(dados.ambitos).reduce((soma, a) => soma + totalAmbito(a), 0);
}

export function tudoRegular(dados: DadosDiagnostico): boolean {
  return Object.values(dados.ambitos).every((a) => a.debitos.length === 0);
}

export function pendenciasObrigatorias(dados: DadosDiagnostico): string[] {
  return AMBITOS.filter((a) => a.obrigatorio)
    .filter((a) => dados.ambitos[a.chave].documentos.length === 0)
    .map((a) => a.titulo);
}

/* ==========================================================================
   Análise dinâmica — o texto do relatório nasce dos documentos anexados.
   ========================================================================== */

export function estadualParceladoOuSuspenso(dados: DadosDiagnostico): boolean {
  return (["estadual_nao_inscritos", "estadual_inscritos"] as AmbitoChave[]).some((chave) =>
    dados.ambitos[chave].debitos.some(
      (d) => d.situacao === "parcelado" || d.situacao === "exigibilidade_suspensa",
    ),
  );
}

function contarPorSituacao(ambito: Ambito) {
  return ambito.debitos.reduce<Record<SituacaoDebito, number>>(
    (acc, d) => ({ ...acc, [d.situacao]: (acc[d.situacao] ?? 0) + 1 }),
    { aberto: 0, parcelado: 0, exigibilidade_suspensa: 0, divida_ativa: 0 },
  );
}

/** Frase de análise de um âmbito, construída a partir do que foi identificado. */
export function analiseAmbito(titulo: string, ambito: Ambito): string {
  if (ambito.situacao === "nao_aplicavel" && ambito.debitos.length === 0) {
    return `${titulo}: não foi localizado documento específico para esta consulta na data do levantamento. Nada a apontar neste momento.`;
  }
  if (ambito.debitos.length === 0) {
    return `${titulo}: não foram identificados débitos na consulta realizada. A empresa encontra-se regular nesta esfera na data deste levantamento.`;
  }

  const contagem = contarPorSituacao(ambito);
  const trechos: string[] = [];
  if (contagem.aberto) trechos.push(`${contagem.aberto} em aberto`);
  if (contagem.parcelado) trechos.push(`${contagem.parcelado} em parcelamento`);
  if (contagem.exigibilidade_suspensa)
    trechos.push(`${contagem.exigibilidade_suspensa} com exigibilidade suspensa`);
  if (contagem.divida_ativa) trechos.push(`${contagem.divida_ativa} inscrito(s) em dívida ativa`);

  const quantidade = ambito.debitos.length;
  return `${titulo}: foram identificados ${quantidade} apontamento(s), totalizando ${moeda(
    totalAmbito(ambito),
  )}${trechos.length ? ` (${trechos.join(", ")})` : ""}. O detalhamento consta na tabela desta esfera.`;
}

/** Parágrafos de abertura da análise, também dependentes dos dados lidos. */
export function analiseGeral(dados: DadosDiagnostico): string[] {
  const total = totalGeral(dados);
  const comDebito = AMBITOS.filter((a) => dados.ambitos[a.chave].debitos.length > 0);

  if (comDebito.length === 0) {
    return [
      "A partir dos relatórios e certidões anexados a este levantamento, não foram identificados débitos em nome da empresa nas esferas consultadas.",
      "Recomendamos manter o acompanhamento periódico, uma vez que o resultado reflete exclusivamente a situação constante nos portais governamentais na data desta consulta.",
    ];
  }

  return [
    `A análise dos documentos anexados identificou apontamentos em ${comDebito.length} das esferas consultadas (${comDebito
      .map((a) => a.titulo.replace("Âmbito ", ""))
      .join(", ")}), somando ${moeda(total)} na data desta consulta.`,
    "Os valores em aberto sofrem atualização de juros e multa até a data do efetivo pagamento, motivo pelo qual as guias devem ser recalculadas no momento da quitação.",
    "Nas seções seguintes apresentamos a análise de cada esfera, o detalhamento dos débitos e os pontos que exigem atenção específica.",
  ];
}

export type Alerta = { titulo: string; texto: string; tom: "atencao" | "neutro" };

/** Regras fixas de sinalização, aplicadas conforme o conteúdo dos anexos. */
export function alertas(dados: DadosDiagnostico): Alerta[] {
  const lista: Alerta[] = [];
  if (temIpva(dados)) lista.push({ titulo: "Débitos de IPVA", texto: AVISO_IPVA, tom: "atencao" });
  if (estadualParceladoOuSuspenso(dados))
    lista.push({
      titulo: "Certidão Negativa de Débitos Estadual",
      texto: AVISO_ESTADUAL,
      tom: "atencao",
    });
  lista.push({ titulo: "Débitos sindicais", texto: AVISO_SINDICAL, tom: "neutro" });
  return lista;
}

