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
  AVISO_ESTADUAL,
  AVISO_IPVA,
  AVISO_SINDICAL,
  SITUACAO_AMBITO_LABEL,
  SITUACAO_DEBITO_LABEL,
  dadosVazios,
  debitoVazio,
  declaracaoVazia,
  moeda,
  pendenciasObrigatorias,
  temDebitoEstadual,
  temIpva,
  totalAmbito,
  totalGeral,
  tudoRegular,
  type Ambito,
  type AmbitoChave,
  type DadosDiagnostico,
  type SituacaoAmbito,
  type SituacaoDebito,
} from "@/lib/diagnostico";
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
import capa from "@/assets/capa-fiscal.jpg";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico Fiscal — HUB Tributário" },
      {
        name: "description",
        content:
          "Anexe relatórios de débito e certidões municipais, estaduais e federais e gere o relatório de diagnóstico fiscal do cliente.",
      },
      { property: "og:title", content: "Diagnóstico Fiscal — HUB Tributário" },
      {
        property: "og:description",
        content: "Levantamento de débitos e geração do relatório de diagnóstico fiscal ao cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagnosticoPagina,
});

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function DiagnosticoPagina() {
  const { data: sessao } = useSessao();
  const queryClient = useQueryClient();

  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [dataLevantamento, setDataLevantamento] = useState(hoje());
  const [observacoes, setObservacoes] = useState("");
  const [dados, setDados] = useState<DadosDiagnostico>(() => dadosVazios());
  const [enviando, setEnviando] = useState<AmbitoChave | null>(null);

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
      if (!empresa.trim()) throw new Error("Informe o nome da empresa.");
      const { error } = await supabase.from("diagnosticos").insert({
        perfil_id: sessao.perfil.id,
        empresa: empresa.trim(),
        cnpj: cnpj.trim() || null,
        responsavel: responsavel || null,
        data_levantamento: dataLevantamento,
        observacoes: observacoes.trim() || null,
        dados: dados as unknown as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diagnóstico registrado no HUB.");
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
      toast.success("Documento anexado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao anexar o documento.");
    } finally {
      setEnviando(null);
    }
  }

  const pendencias = pendenciasObrigatorias(dados);
  const regular = tudoRegular(dados);
  const total = totalGeral(dados);

  function imprimir() {
    if (!empresa.trim()) {
      toast.error("Informe o nome da empresa antes de gerar o relatório.");
      return;
    }
    setTimeout(() => window.print(), 120);
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <EstilosDocumento />

      <div className="space-y-6 print:hidden">
        <header>
          <h1 className="text-2xl font-semibold">Diagnóstico Fiscal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anexe os relatórios de débito ou certidões, informe os débitos apurados e gere o
            relatório de diagnóstico para o cliente.
          </p>
        </header>

        <section className="surface-panel space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Dados da empresa
          </h2>
          <div className="space-y-2">
            <Label htmlFor="empresa">Razão social</Label>
            <Input
              id="empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ex.: Empresa Exemplo Ltda."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data do levantamento</Label>
              <Input
                id="data"
                type="date"
                value={dataLevantamento}
                onChange={(e) => setDataLevantamento(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mensagem-inicial">Mensagem inicial ao cliente</Label>
            <Textarea
              id="mensagem-inicial"
              rows={4}
              value={dados.mensagemInicial}
              onChange={(e) => setDados((a) => ({ ...a, mensagemInicial: e.target.value }))}
            />
          </div>
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
                <Label>Situação apurada</Label>
                <Select
                  value={ambito.situacao}
                  onValueChange={(v) => atualizarAmbito(meta.chave, { situacao: v as SituacaoAmbito })}
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

              <div className="space-y-2">
                <Label>Documento (relatório de débitos ou certidão)</Label>
                <div className="flex items-center gap-2">
                  <Button asChild variant="secondary" size="sm" disabled={enviando === meta.chave}>
                    <label className="cursor-pointer">
                      {enviando === meta.chave ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileUp className="size-4" />
                      )}
                      Anexar arquivo
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.xml,.txt"
                        onChange={(e) => {
                          void anexar(meta.chave, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </Button>
                </div>
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Débitos identificados</Label>
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
                    Nenhum débito informado — o relatório apresentará este âmbito como regular.
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
                <Label>Observação deste âmbito (opcional)</Label>
                <Textarea
                  rows={2}
                  value={ambito.observacao}
                  onChange={(e) => atualizarAmbito(meta.chave, { observacao: e.target.value })}
                />
              </div>
            </section>
          );
        })}

        <section className="surface-panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Declarações</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setDados((a) => ({ ...a, declaracoes: [...a.declaracoes, declaracaoVazia()] }))
              }
            >
              <Plus className="size-4" />
              Declaração
            </Button>
          </div>
          {dados.declaracoes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Opcional: informe declarações pendentes ou omissões identificadas no levantamento.
            </p>
          ) : (
            dados.declaracoes.map((decl) => (
              <div key={decl.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
                <Input
                  placeholder="Declaração (ex.: DCTF, GIA)"
                  value={decl.tipo}
                  onChange={(e) =>
                    setDados((a) => ({
                      ...a,
                      declaracoes: a.declaracoes.map((d) =>
                        d.id === decl.id ? { ...d, tipo: e.target.value } : d,
                      ),
                    }))
                  }
                />
                <Input
                  placeholder="Competência"
                  value={decl.referencia}
                  onChange={(e) =>
                    setDados((a) => ({
                      ...a,
                      declaracoes: a.declaracoes.map((d) =>
                        d.id === decl.id ? { ...d, referencia: e.target.value } : d,
                      ),
                    }))
                  }
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Situação"
                    value={decl.situacao}
                    onChange={(e) =>
                      setDados((a) => ({
                        ...a,
                        declaracoes: a.declaracoes.map((d) =>
                          d.id === decl.id ? { ...d, situacao: e.target.value } : d,
                        ),
                      }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover declaração"
                    onClick={() =>
                      setDados((a) => ({
                        ...a,
                        declaracoes: a.declaracoes.filter((d) => d.id !== decl.id),
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="surface-panel space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="mensagem-final">Mensagem final</Label>
            <Textarea
              id="mensagem-final"
              rows={4}
              value={dados.mensagemFinal}
              onChange={(e) => setDados((a) => ({ ...a, mensagemFinal: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observações internas (não saem no relatório)</Label>
            <Textarea
              id="obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {pendencias.length > 0 ? (
            <p className="rounded-md bg-warning/15 p-3 text-xs text-foreground">
              Documentos obrigatórios ainda não anexados: {pendencias.join(", ")}.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={imprimir}>
              <Printer className="size-4" />
              Gerar relatório em PDF
            </Button>
            <Button variant="secondary" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar no HUB
            </Button>
          </div>
        </section>

        {(historico ?? []).length > 0 ? (
          <section className="surface-panel p-5">
            <h2 className="text-sm font-semibold">Últimos diagnósticos registrados</h2>
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
        {/* Capa */}
        <section aria-label="Capa do relatório" className="doc-page">
          <div className="doc-body">
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, #fff 0%, ${MARCA.creme} 60%, ${MARCA.cinza} 100%)`,
              }}
            />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ padding: "7% 9% 0", textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.72em",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: MARCA.douradoEscuro,
                    fontWeight: 600,
                  }}
                >
                  Departamento Tributário · Lógica
                </p>
                <h1
                  style={{
                    margin: "0.6em 0 0",
                    fontFamily: '"Space Grotesk", Arial, sans-serif',
                    fontSize: "3em",
                    lineHeight: 1.02,
                    letterSpacing: "-0.02em",
                  }}
                >
                  DIAGNÓSTICO
                  <br />
                  <span style={{ color: MARCA.douradoEscuro }}>FISCAL</span>
                </h1>
                <p style={{ margin: "0.6em 0 0", fontSize: "1.05em", fontWeight: 500 }}>
                  Levantamento de débitos nos portais governamentais
                </p>
              </div>

              <div
                style={{
                  position: "relative",
                  margin: "6% 9% 0",
                  height: "34%",
                  overflow: "hidden",
                  borderTop: `4px solid ${MARCA.dourado}`,
                }}
              >
                <img
                  src={capa}
                  alt="Documentos fiscais sobre a mesa"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div
                style={{
                  margin: "0 9%",
                  background: MARCA.dourado,
                  color: MARCA.grafite,
                  padding: "0.7em 1.2em",
                  fontWeight: 600,
                  fontSize: "0.95em",
                }}
              >
                Documento confidencial — uso exclusivo do destinatário
              </div>

              <div style={{ padding: "5% 9% 0", textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.7em",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: MARCA.douradoEscuro,
                  }}
                >
                  Preparado para
                </p>
                <p
                  style={{
                    margin: "0.3em 0 0",
                    fontSize: "1.35em",
                    fontWeight: 700,
                    wordBreak: "break-word",
                    opacity: empresa.trim() ? 1 : 0.5,
                  }}
                >
                  {empresa.trim() ? empresa.trim().toUpperCase() : "NOME DO CLIENTE"}
                </p>
                <p style={{ margin: "0.25em 0 0", fontSize: "0.82em", color: MARCA.grafiteClaro }}>
                  {cnpj.trim() ? `CNPJ ${cnpj.trim()} · ` : ""}
                  Levantamento realizado em {formatarData(dataLevantamento, false)}
                </p>
                <img
                  src={LOGO_URL}
                  alt="Lógica Assessoria Contábil"
                  style={{ width: "34%", marginTop: "5%" }}
                />
              </div>

              <RodapeDocumento pagina={1} total={2} />
            </div>
          </div>
        </section>

        {/* Conteúdo */}
        <div className="doc-flow">
          <div className="doc-flow-body">
            <CabecalhoMarca titulo="Diagnóstico fiscal" />

            <div style={{ padding: "3% 8% 0" }}>
              <section>
                <FaixaSecao>Sobre este diagnóstico</FaixaSecao>
                <p style={{ margin: "0 0 1em" }}>
                  Olá,{" "}
                  <strong>{empresa.trim() ? empresa.trim() : "cliente"}</strong>.
                </p>
                <p style={{ margin: "0 0 1em" }}>{dados.mensagemInicial}</p>
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
                      <td>{formatarData(dataLevantamento, false)}</td>
                    </tr>
                    <tr>
                      <th>Responsável pelo levantamento</th>
                      <td>{responsavel || "Departamento Tributário"}</td>
                    </tr>
                    <tr>
                      <th>Esferas consultadas</th>
                      <td>Municipal, Estadual (inscritos e não inscritos) e Federal</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section>
                <FaixaSecao>Resumo por esfera</FaixaSecao>
                <table>
                  <thead>
                    <tr>
                      <th>Esfera</th>
                      <th>Situação</th>
                      <th>Débitos</th>
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
                    Não foram identificados débitos nas esferas consultadas. As certidões e os
                    relatórios utilizados neste levantamento acompanham este diagnóstico.
                  </Aviso>
                ) : null}
              </section>

              {AMBITOS.map((meta) => {
                const ambito = dados.ambitos[meta.chave];
                if (ambito.debitos.length === 0 && !ambito.observacao.trim()) return null;
                return (
                  <section key={meta.chave}>
                    <FaixaSecao>{meta.titulo}</FaixaSecao>
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
                        </tbody>
                      </table>
                    ) : null}
                    {ambito.observacao.trim() ? (
                      <p style={{ margin: "0 0 1em" }}>{ambito.observacao}</p>
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
                {temIpva(dados) ? <Aviso titulo="Débito de IPVA">{AVISO_IPVA}</Aviso> : null}
                {temDebitoEstadual(dados) ? (
                  <Aviso titulo="Certidão estadual e débitos parcelados ou suspensos">
                    {AVISO_ESTADUAL}
                  </Aviso>
                ) : null}
                <Aviso titulo="Débitos sindicais" tom="neutro">
                  {AVISO_SINDICAL}
                </Aviso>
                <Aviso titulo="Abrangência do levantamento" tom="neutro">
                  As informações apresentadas refletem a situação constante nos portais
                  governamentais na data da consulta. Valores em aberto sofrem atualização de juros
                  e multa até a data do efetivo pagamento.
                </Aviso>
              </section>

              <section>
                <FaixaSecao>Estamos à disposição</FaixaSecao>
                <p style={{ margin: "0 0 1em" }}>{dados.mensagemFinal}</p>
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
