/**
 * Módulo "Levantamento de Débitos" — tipos, textos institucionais e regras de
 * sinalização automática aplicadas no documento enviado ao cliente.
 *
 * Âmbitos analisados: Federal, Estadual, Municipal e FGTS.
 */

export type SituacaoAmbito = "regular" | "com_debitos" | "nao_aplicavel";

export type SituacaoDebito = "aberto" | "parcelado" | "exigibilidade_suspensa" | "divida_ativa";

export type StatusLevantamento = "em_andamento" | "concluido";

export type Debito = {
  id: string;
  tributo: string;
  referencia: string;
  vencimento: string;
  valor: string;
  situacao: SituacaoDebito;
};

/** Omissão de declaração/obrigação identificada nos relatórios. */
export type Omissao = {
  id: string;
  obrigacao: string;
  referencia: string;
};

export type Documento = {
  nome: string;
  caminho: string;
  /** Marcado quando o arquivo é uma certidão regular a anexar ao PDF final. */
  certidao?: boolean;
};

export type AmbitoChave = "federal" | "estadual" | "municipal" | "fgts";

export type Ambito = {
  chave: AmbitoChave;
  situacao: SituacaoAmbito;
  debitos: Debito[];
  documentos: Documento[];
  omissoes: Omissao[];
  parcelamento: boolean;
  exigibilidadeSuspensa: boolean;
  observacao: string;
};

export type DadosLevantamento = {
  ambitos: Record<AmbitoChave, Ambito>;
  mensagemInicial: string;
  mensagemFinal: string;
};

/** Compatibilidade com o nome anterior do tipo. */
export type DadosDiagnostico = DadosLevantamento;

export const AMBITOS: {
  chave: AmbitoChave;
  titulo: string;
  curto: string;
  descricao: string;
  obrigatorio: boolean;
}[] = [
  {
    chave: "federal",
    titulo: "Âmbito Federal",
    curto: "Federal",
    descricao: "Relatório de situação fiscal ou certidão da Receita Federal / PGFN.",
    obrigatorio: true,
  },
  {
    chave: "estadual",
    titulo: "Âmbito Estadual",
    curto: "Estadual",
    descricao: "Relatório de débitos ou certidão da Secretaria da Fazenda estadual (inclui IPVA).",
    obrigatorio: true,
  },
  {
    chave: "municipal",
    titulo: "Âmbito Municipal",
    curto: "Municipal",
    descricao: "Relatório de débitos ou certidão emitida pela Prefeitura.",
    obrigatorio: true,
  },
  {
    chave: "fgts",
    titulo: "FGTS",
    curto: "FGTS",
    descricao: "Certificado de Regularidade do FGTS (CRF) ou relatório de débitos da Caixa.",
    obrigatorio: true,
  },
];

export const SITUACAO_AMBITO_LABEL: Record<SituacaoAmbito, string> = {
  regular: "Regular",
  com_debitos: "Devedor",
  nao_aplicavel: "Não aplicável / documento indisponível",
};

export const SITUACAO_DEBITO_LABEL: Record<SituacaoDebito, string> = {
  aberto: "Em aberto",
  parcelado: "Parcelado",
  exigibilidade_suspensa: "Exigibilidade suspensa",
  divida_ativa: "Inscrito em dívida ativa",
};

export const STATUS_LEVANTAMENTO_LABEL: Record<StatusLevantamento, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export const MENSAGEM_INICIAL_PADRAO =
  "Prezado cliente, conforme solicitado, realizamos o levantamento de débitos da empresa com o objetivo de identificar possíveis pendências junto aos órgãos Federal, Estadual, Municipal e FGTS. As informações apresentadas refletem a situação apurada na data indicada, considerando os dados disponíveis nos sistemas oficiais. Colocamo-nos à disposição para prestar toda a assistência necessária na regularização dos débitos, oferecendo tanto o envio dos recálculos das guias quanto a apresentação de alternativas de pagamento, conforme a necessidade da empresa.";

export const MENSAGEM_FINAL_PADRAO =
  "O Departamento Tributário permanece à disposição para esclarecer dúvidas, realizar o recálculo de guias, apresentar as demais formas de pagamento disponíveis e acompanhar a regularização dos débitos apontados. Basta acionar o seu contato principal no departamento.";

export const AVISO_SINDICAL =
  "Débitos sindicais não fazem parte da análise realizada neste levantamento. Devido às particularidades desse tipo de consulta, caso necessário, o assunto deve ser tratado diretamente com o Departamento Pessoal, que fica à disposição.";

export const AVISO_IPVA =
  "Foram identificados débitos de IPVA. A regularização do IPVA deve ser realizada diretamente com o despachante, não sendo executada por este escritório.";

export const AVISO_ESTADUAL =
  "Há débitos estaduais em parcelamento e/ou com exigibilidade suspensa. Nessa condição, a Certidão Negativa de Débitos não é emitida automaticamente: a emissão só é possível mediante processo administrativo, que deve ser solicitado com a devida antecedência quando houver necessidade da certidão.";

export const AVISO_OMISSAO =
  "Foram identificadas omissões de entrega de declarações/obrigações acessórias. Além de impedirem a emissão de certidões, as omissões estão sujeitas a multas por atraso na entrega, motivo pelo qual recomendamos a regularização o quanto antes.";

/* ==========================================================================
   Estruturas iniciais
   ========================================================================== */

export function ambitoVazio(chave: AmbitoChave): Ambito {
  return {
    chave,
    situacao: "regular",
    debitos: [],
    documentos: [],
    omissoes: [],
    parcelamento: false,
    exigibilidadeSuspensa: false,
    observacao: "",
  };
}

export function dadosVazios(): DadosLevantamento {
  return {
    ambitos: {
      federal: ambitoVazio("federal"),
      estadual: ambitoVazio("estadual"),
      municipal: ambitoVazio("municipal"),
      fgts: ambitoVazio("fgts"),
    },
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

export function omissaoVazia(): Omissao {
  return { id: crypto.randomUUID(), obrigacao: "", referencia: "" };
}

/**
 * Normaliza dados salvos (inclusive de levantamentos antigos, que usavam
 * "estadual_nao_inscritos"/"estadual_inscritos" e não tinham FGTS).
 */
export function normalizarDados(bruto: unknown): DadosLevantamento {
  const base = dadosVazios();
  if (!bruto || typeof bruto !== "object") return base;
  const entrada = bruto as Record<string, unknown>;
  const ambitosBrutos = (entrada["ambitos"] ?? {}) as Record<string, unknown>;

  function ler(chave: string): Partial<Ambito> | null {
    const valor = ambitosBrutos[chave];
    return valor && typeof valor === "object" ? (valor as Partial<Ambito>) : null;
  }

  function montar(chave: AmbitoChave, fontes: (Partial<Ambito> | null)[]): Ambito {
    const vazio = ambitoVazio(chave);
    const presentes = fontes.filter(Boolean) as Partial<Ambito>[];
    if (presentes.length === 0) return vazio;
    const debitos = presentes.flatMap((f) => f.debitos ?? []);
    return {
      ...vazio,
      debitos,
      documentos: presentes.flatMap((f) => f.documentos ?? []),
      omissoes: presentes.flatMap((f) => f.omissoes ?? []),
      parcelamento: presentes.some((f) => f.parcelamento === true),
      exigibilidadeSuspensa: presentes.some((f) => f.exigibilidadeSuspensa === true),
      observacao: presentes.map((f) => f.observacao ?? "").filter(Boolean).join(" "),
      situacao: debitos.length > 0 ? "com_debitos" : (presentes[0]?.situacao ?? "regular"),
    };
  }

  return {
    ambitos: {
      federal: montar("federal", [ler("federal")]),
      estadual: montar("estadual", [
        ler("estadual"),
        ler("estadual_nao_inscritos"),
        ler("estadual_inscritos"),
      ]),
      municipal: montar("municipal", [ler("municipal")]),
      fgts: montar("fgts", [ler("fgts")]),
    },
    mensagemInicial:
      typeof entrada["mensagemInicial"] === "string" && entrada["mensagemInicial"].trim()
        ? (entrada["mensagemInicial"] as string)
        : MENSAGEM_INICIAL_PADRAO,
    mensagemFinal:
      typeof entrada["mensagemFinal"] === "string" && entrada["mensagemFinal"].trim()
        ? (entrada["mensagemFinal"] as string)
        : MENSAGEM_FINAL_PADRAO,
  };
}

/* ==========================================================================
   Cálculos
   ========================================================================== */

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

export function totalGeral(dados: DadosLevantamento): number {
  return Object.values(dados.ambitos).reduce((soma, a) => soma + totalAmbito(a), 0);
}

/**
 * Situação apurada pelo próprio sistema, a partir do conteúdo dos anexos.
 * O colaborador não classifica manualmente: se há débito identificado a
 * esfera é devedora; sem débito e com documento é regular; sem documento
 * fica pendente de comprovação.
 */
export function situacaoApurada(ambito: Ambito): SituacaoAmbito {
  if (ambito.debitos.length > 0) return "com_debitos";
  if (ambito.documentos.length === 0) return "nao_aplicavel";
  return "regular";
}

export function ambitoDevedor(ambito: Ambito): boolean {
  return situacaoApurada(ambito) === "com_debitos";
}

export function tudoRegular(dados: DadosLevantamento): boolean {
  return Object.values(dados.ambitos).every((a) => situacaoApurada(a) === "regular");
}

export function temIpva(dados: DadosLevantamento): boolean {
  return Object.values(dados.ambitos).some((a) => a.debitos.some((d) => /ipva/i.test(d.tributo)));
}

export function temOmissao(dados: DadosLevantamento): boolean {
  return Object.values(dados.ambitos).some((a) => a.omissoes.length > 0);
}

export function omissoesLista(dados: DadosLevantamento): { ambito: string; omissao: Omissao }[] {
  return AMBITOS.flatMap((meta) =>
    dados.ambitos[meta.chave].omissoes.map((omissao) => ({ ambito: meta.curto, omissao })),
  );
}

export function estadualParceladoOuSuspenso(dados: DadosLevantamento): boolean {
  const estadual = dados.ambitos.estadual;
  return (
    estadual.parcelamento ||
    estadual.exigibilidadeSuspensa ||
    estadual.debitos.some(
      (d) => d.situacao === "parcelado" || d.situacao === "exigibilidade_suspensa",
    )
  );
}

export function certidoesRegulares(dados: DadosLevantamento): { ambito: string; nome: string }[] {
  return AMBITOS.flatMap((meta) => {
    const ambito = dados.ambitos[meta.chave];
    if (ambitoDevedor(ambito)) return [];
    return ambito.documentos.map((doc) => ({ ambito: meta.curto, nome: doc.nome }));
  });
}

export function pendenciasObrigatorias(dados: DadosLevantamento): string[] {
  return AMBITOS.filter((a) => a.obrigatorio)
    .filter((a) => dados.ambitos[a.chave].documentos.length === 0)
    .map((a) => a.titulo);
}

/* ==========================================================================
   Texto dinâmico — nasce do conteúdo dos anexos
   ========================================================================== */

function contarPorSituacao(ambito: Ambito) {
  return ambito.debitos.reduce<Record<SituacaoDebito, number>>(
    (acc, d) => ({ ...acc, [d.situacao]: (acc[d.situacao] ?? 0) + 1 }),
    { aberto: 0, parcelado: 0, exigibilidade_suspensa: 0, divida_ativa: 0 },
  );
}

/** Frase de análise de um âmbito, construída a partir do que foi identificado. */
export function analiseAmbito(titulo: string, ambito: Ambito): string {
  const situacao = situacaoApurada(ambito);
  if (situacao === "nao_aplicavel") {
    return `${titulo}: não foi apresentado documento oficial para esta esfera. Sem a consulta correspondente não é possível atestar a regularidade, razão pela qual a situação permanece pendente de comprovação.`;
  }
  if (situacao === "regular") {
    return `${titulo}: situação REGULAR. A análise dos documentos apresentados não identificou débitos, parcelamentos em atraso ou pendências que impeçam a emissão de certidão nesta esfera. A comprovação acompanha este levantamento.`;
  }

  const contagem = contarPorSituacao(ambito);
  const trechos: string[] = [];
  if (contagem.aberto) trechos.push(`${contagem.aberto} em aberto`);
  if (contagem.parcelado) trechos.push(`${contagem.parcelado} em parcelamento`);
  if (contagem.exigibilidade_suspensa)
    trechos.push(`${contagem.exigibilidade_suspensa} com exigibilidade suspensa`);
  if (contagem.divida_ativa) trechos.push(`${contagem.divida_ativa} inscrito(s) em dívida ativa`);

  return `${titulo}: a empresa consta como DEVEDORA — foram identificados ${ambito.debitos.length} apontamento(s), totalizando ${moeda(
    totalAmbito(ambito),
  )}${trechos.length ? ` (${trechos.join(", ")})` : ""}. O detalhamento consta na tabela desta esfera.`;
}

/** Parágrafos de abertura da análise, também dependentes dos dados lidos. */
export function analiseGeral(dados: DadosLevantamento): string[] {
  const total = totalGeral(dados);
  const comDebito = AMBITOS.filter((a) => ambitoDevedor(dados.ambitos[a.chave]));

  if (comDebito.length === 0) {
    return [
      "A partir dos relatórios e certidões anexados a este levantamento, não foram identificados débitos em nome da empresa nas esferas consultadas (Federal, Estadual, Municipal e FGTS).",
      "Recomendamos manter o acompanhamento periódico, uma vez que o resultado reflete exclusivamente a situação constante nos sistemas oficiais na data desta consulta.",
    ];
  }

  return [
    `A análise dos documentos anexados identificou apontamentos em ${comDebito.length} das esferas consultadas (${comDebito
      .map((a) => a.curto)
      .join(", ")}), somando ${moeda(total)} na data desta consulta.`,
    "Os valores em aberto sofrem atualização de juros e multa até a data do efetivo pagamento, motivo pelo qual as guias devem ser recalculadas no momento da quitação.",
    "Nas seções seguintes apresentamos a situação de cada esfera, o detalhamento dos débitos identificados e os pontos que exigem atenção específica.",
  ];
}

export type Alerta = { titulo: string; texto: string; tom: "atencao" | "neutro" };

/** Regras fixas de sinalização, aplicadas conforme o conteúdo dos anexos. */
export function alertas(dados: DadosLevantamento): Alerta[] {
  const lista: Alerta[] = [];

  if (temOmissao(dados)) {
    const origens = omissoesLista(dados)
      .map(({ ambito, omissao }) =>
        [omissao.obrigacao || "Declaração não identificada", omissao.referencia, `(${ambito})`]
          .filter(Boolean)
          .join(" "),
      )
      .join("; ");
    lista.push({
      titulo: "Omissão de entrega de declaração",
      texto: `${AVISO_OMISSAO} Origem da omissão: ${origens}.`,
      tom: "atencao",
    });
  }

  if (temIpva(dados)) lista.push({ titulo: "Débitos de IPVA", texto: AVISO_IPVA, tom: "atencao" });

  if (estadualParceladoOuSuspenso(dados))
    lista.push({
      titulo: "Certidão Negativa de Débitos — âmbito estadual",
      texto: AVISO_ESTADUAL,
      tom: "atencao",
    });

  lista.push({ titulo: "Débitos sindicais", texto: AVISO_SINDICAL, tom: "neutro" });
  return lista;
}
