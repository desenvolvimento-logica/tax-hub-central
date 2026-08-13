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
  "Débitos sindicais não são incluídos neste levantamento em razão das peculiaridades desse tipo de consulta. O assunto deve ser tratado diretamente com o Departamento Pessoal.";

export const AVISO_IPVA =
  "Foi identificado débito de IPVA. Esse débito, por sua natureza, deve ser verificado e regularizado diretamente com o despachante responsável pelos veículos da empresa.";

export const AVISO_ESTADUAL =
  "Havendo débitos estaduais parcelados ou com exigibilidade suspensa, não é possível a emissão da certidão negativa de forma online. Nesses casos é necessário abrir processo administrativo junto à Secretaria da Fazenda, procedimento que deve ser solicitado ao escritório com antecedência.";

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
