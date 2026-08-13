import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileUp, Loader2, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSessao, formatarData } from "@/lib/hub";
import {
  AMBITOS,
  SITUACAO_AMBITO_LABEL,
  SITUACAO_DEBITO_LABEL,
  alertas,
  analiseAmbito,
  analiseGeral,
  dadosVazios,
  debitoVazio,
  moeda,
  pendenciasObrigatorias,
  totalAmbito,
  totalGeral,
  tudoRegular,
  type Ambito,
  type AmbitoChave,
  type DadosDiagnostico,
  type SituacaoAmbito,
  type SituacaoDebito,
} from "@/lib/diagnostico";
import { lerRelatorio } from "@/lib/extracao-relatorio";
import {
  Aviso,
  CabecalhoMarca,
  CONTATO,
  EstilosDocumento,
  FaixaSecao,
  LOGO_URL,
  MARCA,
  RodapeDocumento,
} from "@/components/documento";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({
    meta: [
      { title: "Levantamento de Débitos — HUB Tributário" },
      {
        name: "description",
        content:
          "Anexe os relatórios municipais, estaduais e federais: o sistema identifica razão social, CNPJ e débitos e gera o levantamento para envio ao cliente.",
      },
      { property: "og:title", content: "Levantamento de Débitos — HUB Tributário" },
      {
        property: "og:description",
        content:
          "Leitura automática dos relatórios de débito e geração do levantamento enviado ao cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LevantamentoPagina,
});

function LevantamentoPagina() {
  const { data: sessao } = useSessao();
  const queryClient = useQueryClient();

  // A data do documento é sempre a data da geração.
  const dataDocumento = new Date().toISOString().slice(0, 10);

  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dados, setDados] = useState<DadosDiagnostico>(() => dadosVazios());
  const [enviando, setEnviando] = useState<AmbitoChave | null>(null);
  const [leituras, setLeituras] = useState<string[]>([]);

  const responsavel = sessao?.perfil.nome_completo ?? "";

  const { data: historico } = useQuery({
    queryKey: ["diagnosticos"],
    enabled: Boolean(sessao),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnosticos")
        .select("id, empresa, cnpj, responsavel, data_levantamento, criado_em")
        .order("criado_em", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!sessao) throw new Error("Sessão não carregada.");
      if (!empresa.trim()) throw new Error("Nenhuma razão social identificada nos anexos.");
      const { error } = await supabase.from("diagnosticos").insert({
        perfil_id: sessao.perfil.id,
        empresa: empresa.trim(),
        cnpj: cnpj.trim() || null,
        responsavel: responsavel || null,
        data_levantamento: dataDocumento,
        observacoes: observacoes.trim() || null,
        dados: dados as unknown as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Levantamento registrado no HUB.");
      void queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function atualizarAmbito(chave: AmbitoChave, patch: Partial<Ambito>) {
    setDados((atual) => ({
      ...atual,
      ambitos: { ...atual.ambitos, [chave]: { ...atual.ambitos[chave], ...patch } },
    }));
  }

  async function anexar(chave: AmbitoChave, arquivos: FileList | null) {
    if (!arquivos?.length || !sessao) return;
    setEnviando(chave);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const caminho = `${sessao.perfil.id}/${Date.now()}-${arquivo.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("diagnosticos").upload(caminho, arquivo);
        if (error) throw error;

        // Leitura automática: razão social, CNPJ e débitos apontados no relatório.
        let identificados = 0;
        let semDebitos = false;
        try {
          const leitura = await lerRelatorio(arquivo);
          identificados = leitura.debitos.length;
          semDebitos = leitura.semDebitos;
          if (leitura.razaoSocial) setEmpresa((atual) => atual || leitura.razaoSocial!);
          if (leitura.cnpj) setCnpj((atual) => atual || leitura.cnpj!);
          setDados((atual) => {
            const ambito = atual.ambitos[chave];
            return {
              ...atual,
              ambitos: {
                ...atual.ambitos,
                [chave]: {
                  ...ambito,
                  debitos: [...ambito.debitos, ...leitura.debitos],
                  situacao:
                    ambito.debitos.length + leitura.debitos.length > 0
                      ? "com_debitos"
                      : semDebitos
                        ? "regular"
                        : ambito.situacao,
                },
              },
            };
          });
          setLeituras((atual) => [
            ...atual,
            `${arquivo.name}: ${
              identificados > 0
                ? `${identificados} débito(s) identificado(s)`
                : semDebitos
                  ? "nenhum débito (documento negativo)"
                  : "nenhum débito reconhecido automaticamente — revise manualmente"
            }`,
          ]);
        } catch {
          setLeituras((atual) => [
            ...atual,
            `${arquivo.name}: não foi possível ler o conteúdo — informe os débitos manualmente.`,
          ]);
        }

        setDados((atual) => ({
          ...atual,
          ambitos: {
            ...atual.ambitos,
            [chave]: {
              ...atual.ambitos[chave],
              documentos: [...atual.ambitos[chave].documentos, { nome: arquivo.name, caminho }],
            },
          },
        }));
      }
      toast.success("Relatório anexado e analisado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao anexar o relatório.");
    } finally {
      setEnviando(null);
    }
  }

  const pendencias = pendenciasObrigatorias(dados);
  const regular = tudoRegular(dados);
  const total = totalGeral(dados);
  const listaAlertas = alertas(dados);
  const aberturas = analiseGeral(dados);

  function imprimir() {
    if (!empresa.trim()) {
      toast.error("Anexe os relatórios ou informe a razão social antes de gerar o documento.");
      return;
    }
    setTimeout(() => window.print(), 120);
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <EstilosDocumento />

      <div className="space-y-6 print:hidden">
        <header>
          <h1 className="text-2xl font-semibold">Levantamento de Débitos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anexe os relatórios de débito e certidões de cada esfera. O sistema lê os documentos,
            identifica a razão social, o CNPJ e os débitos apontados e monta o documento para envio
            ao cliente com a data de hoje.
          </p>
        </header>

        <section className="surface-panel space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Identificação (preenchida pelos anexos)
          </h2>
          <div className="space-y-2">
            <Label htmlFor="empresa">Razão social identificada</Label>
            <Input
              id="empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Será preenchida ao anexar o primeiro relatório"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ identificado</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data do documento</Label>
              <Input value={formatarData(dataDocumento, false)} readOnly disabled />
            </div>
          </div>
          {leituras.length > 0 ? (
            <ul className="space-y-1 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
              {leituras.map((linha, i) => (
                <li key={`${linha}-${i}`}>{linha}</li>
              ))}
            </ul>
          ) : null}
        </section>

        {AMBITOS.map((meta) => {
          const ambito = dados.ambitos[meta.chave];
          return (
            <section key={meta.chave} className="surface-panel space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{meta.titulo}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.descricao}</p>
                </div>
                <Badge variant={meta.obrigatorio ? "default" : "outline"}>
                  {meta.obrigatorio ? "Obrigatório" : "Opcional"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Relatório de débitos ou certidão</Label>
                <Button asChild variant="secondary" size="sm" disabled={enviando === meta.chave}>
                  <label className="cursor-pointer">
                    {enviando === meta.chave ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileUp className="size-4" />
                    )}
                    Anexar e analisar
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.txt,.csv,.xml"
                      onChange={(e) => {
                        void anexar(meta.chave, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                <ul className="space-y-1">
                  {ambito.documentos.map((doc) => (
                    <li
                      key={doc.caminho}
                      className="flex items-center justify-between gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs"
                    >
                      <span className="truncate">{doc.nome}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          atualizarAmbito(meta.chave, {
                            documentos: ambito.documentos.filter((d) => d.caminho !== doc.caminho),
                          })
                        }
                        aria-label={`Remover ${doc.nome}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Label>Situação apurada</Label>
                <Select
                  value={ambito.situacao}
                  onValueChange={(v) =>
                    atualizarAmbito(meta.chave, { situacao: v as SituacaoAmbito })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SITUACAO_AMBITO_LABEL).map(([valor, label]) => (
                      <SelectItem key={valor} value={valor}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Débitos identificados nos anexos</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      atualizarAmbito(meta.chave, {
                        debitos: [...ambito.debitos, debitoVazio()],
                        situacao: "com_debitos",
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Débito
                  </Button>
                </div>
                {ambito.debitos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum débito identificado — o documento apresentará esta esfera como regular.
                  </p>
                ) : (
                  ambito.debitos.map((debito) => (
                    <div key={debito.id} className="rounded-md border border-border p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Tributo (ex.: ICMS, IPVA, ISS)"
                          value={debito.tributo}
                          onChange={(e) =>
                            atualizarAmbito(meta.chave, {
                              debitos: ambito.debitos.map((d) =>
                                d.id === debito.id ? { ...d, tributo: e.target.value } : d,
                              ),
                            })
                          }
                        />
                        <Input
                          placeholder="Competência / referência"
                          value={debito.referencia}
                          onChange={(e) =>
                            atualizarAmbito(meta.chave, {
                              debitos: ambito.debitos.map((d) =>
                                d.id === debito.id ? { ...d, referencia: e.target.value } : d,
                              ),
                            })
                          }
                        />
                        <Input
                          placeholder="Vencimento"
                          value={debito.vencimento}
                          onChange={(e) =>
                            atualizarAmbito(meta.chave, {
                              debitos: ambito.debitos.map((d) =>
                                d.id === debito.id ? { ...d, vencimento: e.target.value } : d,
                              ),
                            })
                          }
                        />
                        <Input
                          placeholder="Valor (R$)"
                          value={debito.valor}
                          onChange={(e) =>
                            atualizarAmbito(meta.chave, {
                              debitos: ambito.debitos.map((d) =>
                                d.id === debito.id ? { ...d, valor: e.target.value } : d,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Select
                          value={debito.situacao}
                          onValueChange={(v) =>
                            atualizarAmbito(meta.chave, {
                              debitos: ambito.debitos.map((d) =>
                                d.id === debito.id ? { ...d, situacao: v as SituacaoDebito } : d,
                              ),
                            })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SITUACAO_DEBITO_LABEL).map(([valor, label]) => (
                              <SelectItem key={valor} value={valor}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover débito"
                          onClick={() =>
                            atualizarAmbito(meta.chave, {
                              debitos: ambito.debitos.filter((d) => d.id !== debito.id),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <Label>Complemento da análise desta esfera (opcional)</Label>
                <Textarea
                  rows={2}
                  value={ambito.observacao}
                  onChange={(e) => atualizarAmbito(meta.chave, { observacao: e.target.value })}
                />
              </div>
            </section>
          );
        })}

        <section className="surface-panel space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="obs">Observações internas (não saem no documento)</Label>
            <Textarea
              id="obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {pendencias.length > 0 ? (
            <p className="rounded-md bg-warning/15 p-3 text-xs text-foreground">
              Relatórios obrigatórios ainda não anexados: {pendencias.join(", ")}.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={imprimir}>
              <Printer className="size-4" />
              Gerar documento em PDF
            </Button>
            <Button variant="secondary" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar no HUB
            </Button>
          </div>
        </section>

        {(historico ?? []).length > 0 ? (
          <section className="surface-panel p-5">
            <h2 className="text-sm font-semibold">Últimos levantamentos registrados</h2>
            <ul className="mt-3 space-y-2 text-xs">
              {(historico ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.empresa}</span>
                  <span className="text-muted-foreground">
                    {formatarData(item.criado_em, false)} · {item.responsavel ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* ============ Documento gerado ============ */}
      <div className="doc-preview">
        {/* Capa — mesma composição do comunicado de boas-vindas */}
        <section aria-label="Capa do documento" className="doc-page">
          <div className="doc-body">
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(120% 60% at 85% -10%, ${MARCA.douradoSuave} 0%, transparent 60%), linear-gradient(180deg, #fff 0%, ${MARCA.creme} 55%, ${MARCA.cinza} 100%)`,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "2.4%",
                background: `linear-gradient(180deg, ${MARCA.dourado}, ${MARCA.douradoEscuro})`,
              }}
            />

            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "9% 10% 0 12%",
              }}
            >
              <img
                src={LOGO_URL}
                alt="Lógica Assessoria Contábil"
                style={{ width: "44%", alignSelf: "center" }}
              />

              <p
                style={{
                  marginTop: "9%",
                  fontSize: "0.95em",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: MARCA.douradoEscuro,
                  fontWeight: 600,
                }}
              >
                Departamento Tributário
              </p>

              <h1
                style={{
                  margin: "0.5em 0 0",
                  fontFamily: '"Space Grotesk", Arial, sans-serif',
                  fontSize: "2.9em",
                  lineHeight: 1.05,
                  fontWeight: 700,
                }}
              >
                LEVANTAMENTO
              </h1>
              <p
                style={{
                  margin: "0.35em 0 0",
                  fontFamily: '"Space Grotesk", Arial, sans-serif',
                  fontSize: "2.1em",
                  fontWeight: 500,
                  color: MARCA.douradoEscuro,
                }}
              >
                de débitos
              </p>

              <div
                style={{
                  marginTop: "7%",
                  alignSelf: "flex-start",
                  borderRadius: 0,
                  background: `linear-gradient(90deg, ${MARCA.dourado}, ${MARCA.douradoSuave})`,
                  padding: "0.7em 1.6em",
                  fontSize: "1.05em",
                  fontWeight: 600,
                }}
              >
                Consulta nas esferas <strong>Municipal, Estadual e Federal</strong>
              </div>

              <div
                style={{
                  marginTop: "6%",
                  background: "#fff",
                  border: `1px solid ${MARCA.cinza}`,
                  borderTop: `3px solid ${MARCA.dourado}`,
                  padding: "6% 6% 5%",
                  fontSize: "1.05em",
                  lineHeight: 1.75,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.7em",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: MARCA.douradoEscuro,
                    fontWeight: 600,
                  }}
                >
                  Preparado para
                </p>
                <p
                  style={{
                    margin: "0.3em 0 0",
                    fontSize: "1.5em",
                    fontWeight: 700,
                    fontFamily: '"Space Grotesk", Arial, sans-serif',
                    wordBreak: "break-word",
                    opacity: empresa.trim() ? 1 : 0.5,
                  }}
                >
                  {empresa.trim() ? empresa.trim().toUpperCase() : "RAZÃO SOCIAL DO CLIENTE"}
                </p>
                <p style={{ margin: "0.35em 0 0", fontSize: "0.9em", color: MARCA.grafiteClaro }}>
                  {cnpj.trim() ? `CNPJ ${cnpj.trim()}` : "CNPJ a identificar"} · Documento gerado em{" "}
                  {formatarData(dataDocumento, false)}
                </p>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  marginBottom: "8%",
                  display: "flex",
                  alignItems: "center",
                  gap: "5%",
                  borderTop: `2px solid ${MARCA.dourado}`,
                  paddingTop: "5%",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.72em",
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      color: MARCA.douradoEscuro,
                      fontWeight: 600,
                    }}
                  >
                    Responsável pelo levantamento
                  </p>
                  <p
                    style={{
                      margin: "0.35em 0 0",
                      fontSize: "1.5em",
                      fontWeight: 700,
                      fontFamily: '"Space Grotesk", Arial, sans-serif',
                    }}
                  >
                    {responsavel || "Departamento Tributário"}
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    width: "22%",
                    height: "0.5em",
                    background: `linear-gradient(90deg, ${MARCA.douradoSuave}, ${MARCA.dourado})`,
                  }}
                />
              </div>
            </div>

            <RodapeDocumento pagina={1} total={2} />
          </div>
        </section>

        {/* Conteúdo */}
        <div className="doc-flow">
          <div className="doc-flow-body">
            <CabecalhoMarca titulo="Levantamento de débitos" />

            <div style={{ padding: "3% 8% 0" }}>
              <section>
                <FaixaSecao>Sobre este levantamento</FaixaSecao>
                <p style={{ margin: "0 0 1em" }}>
                  Prezados, <strong>{empresa.trim() || "cliente"}</strong>.
                </p>
                <p style={{ margin: "0 0 1em" }}>
                  Realizamos a consulta de débitos da empresa nos portais governamentais das esferas
                  municipal, estadual e federal. Este documento apresenta, de forma organizada, o
                  resultado apurado a partir dos relatórios e certidões obtidos, permitindo o
                  acompanhamento das pendências e o planejamento das regularizações necessárias.
                </p>
                <table>
                  <tbody>
                    <tr>
                      <th style={{ width: "34%" }}>Empresa</th>
                      <td>{empresa.trim() || "—"}</td>
                    </tr>
                    <tr>
                      <th>CNPJ</th>
                      <td>{cnpj.trim() || "—"}</td>
                    </tr>
                    <tr>
                      <th>Data do levantamento</th>
                      <td>{formatarData(dataDocumento, false)}</td>
                    </tr>
                    <tr>
                      <th>Responsável</th>
                      <td>{responsavel || "Departamento Tributário"}</td>
                    </tr>
                    <tr>
                      <th>Documentos analisados</th>
                      <td>
                        {AMBITOS.map((meta) => dados.ambitos[meta.chave].documentos.length).reduce(
                          (a, b) => a + b,
                          0,
                        )}{" "}
                        relatório(s)/certidão(ões)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section>
                <FaixaSecao>Análise do resultado apurado</FaixaSecao>
                {aberturas.map((paragrafo) => (
                  <p key={paragrafo} style={{ margin: "0 0 1em" }}>
                    {paragrafo}
                  </p>
                ))}
                <table>
                  <thead>
                    <tr>
                      <th>Esfera</th>
                      <th>Situação</th>
                      <th>Apontamentos</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AMBITOS.map((meta) => {
                      const ambito = dados.ambitos[meta.chave];
                      const qtd = ambito.debitos.length;
                      return (
                        <tr key={meta.chave}>
                          <td>{meta.titulo}</td>
                          <td>
                            {qtd > 0
                              ? SITUACAO_AMBITO_LABEL.com_debitos
                              : SITUACAO_AMBITO_LABEL[ambito.situacao]}
                          </td>
                          <td>{qtd}</td>
                          <td style={{ textAlign: "right" }}>{moeda(totalAmbito(ambito))}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 700, background: MARCA.cinza }}>
                        Total apurado
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, background: MARCA.cinza }}>
                        {moeda(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {regular ? (
                  <Aviso titulo="Empresa regular na data da consulta" tom="neutro">
                    Não foram identificados débitos nas esferas consultadas. Os relatórios e
                    certidões utilizados acompanham este levantamento.
                  </Aviso>
                ) : null}
              </section>

              {AMBITOS.map((meta) => {
                const ambito = dados.ambitos[meta.chave];
                return (
                  <section key={meta.chave}>
                    <FaixaSecao>{meta.titulo}</FaixaSecao>
                    <p style={{ margin: "0 0 1em" }}>{analiseAmbito(meta.titulo, ambito)}</p>
                    {ambito.debitos.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Tributo</th>
                            <th>Competência</th>
                            <th>Vencimento</th>
                            <th>Situação</th>
                            <th style={{ textAlign: "right" }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ambito.debitos.map((debito) => (
                            <tr key={debito.id}>
                              <td>{debito.tributo || "—"}</td>
                              <td>{debito.referencia || "—"}</td>
                              <td>{debito.vencimento || "—"}</td>
                              <td>{SITUACAO_DEBITO_LABEL[debito.situacao]}</td>
                              <td style={{ textAlign: "right" }}>{debito.valor || "—"}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={4} style={{ fontWeight: 700 }}>
                              Total da esfera
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {moeda(totalAmbito(ambito))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ) : null}
                    {ambito.observacao.trim() ? (
                      <p style={{ margin: "0 0 1em" }}>{ambito.observacao}</p>
                    ) : null}
                    {ambito.documentos.length > 0 ? (
                      <p style={{ margin: "0 0 1em", fontSize: "0.85em", color: MARCA.grafiteClaro }}>
                        Documento(s) analisado(s): {ambito.documentos.map((d) => d.nome).join(", ")}.
                      </p>
                    ) : null}
                  </section>
                );
              })}

              {dados.declaracoes.length > 0 ? (
                <section>
                  <FaixaSecao>Declarações</FaixaSecao>
                  <table>
                    <thead>
                      <tr>
                        <th>Declaração</th>
                        <th>Competência</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.declaracoes.map((decl) => (
                        <tr key={decl.id}>
                          <td>{decl.tipo || "—"}</td>
                          <td>{decl.referencia || "—"}</td>
                          <td>{decl.situacao || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ) : null}

              <section>
                <FaixaSecao>Pontos de atenção</FaixaSecao>
                {listaAlertas.map((alerta) => (
                  <Aviso key={alerta.titulo} titulo={alerta.titulo} tom={alerta.tom}>
                    {alerta.texto}
                  </Aviso>
                ))}
                <Aviso titulo="Abrangência do levantamento" tom="neutro">
                  As informações refletem a situação constante nos portais governamentais na data
                  desta consulta. Débitos em aberto sofrem atualização de juros e multa até a data do
                  efetivo pagamento, sendo necessário o recálculo das guias no momento da quitação.
                </Aviso>
              </section>

              <section>
                <FaixaSecao>Estamos à disposição</FaixaSecao>
                <p style={{ margin: "0 0 1em" }}>
                  O Departamento Tributário permanece à disposição para esclarecer dúvidas, realizar
                  o recálculo de guias, apresentar as formas de pagamento disponíveis, simular
                  parcelamentos e acompanhar a regularização dos débitos apontados. Basta acionar o
                  seu contato principal no departamento.
                </p>
                <p style={{ margin: 0, fontSize: "0.85em", color: MARCA.grafiteClaro }}>
                  {CONTATO.telefone} · {CONTATO.email}
                </p>
              </section>
            </div>

            <RodapeDocumento pagina={2} total={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
