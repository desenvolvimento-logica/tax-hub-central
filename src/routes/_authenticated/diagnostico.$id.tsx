import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatarData, useSessao } from "@/lib/hub";
import {
  AMBITOS,
  SITUACAO_AMBITO_LABEL,
  SITUACAO_DEBITO_LABEL,
  STATUS_LEVANTAMENTO_LABEL,
  alertas,
  ambitoDevedor,
  analiseAmbito,
  analiseGeral,
  certidoesRegulares,
  dadosVazios,
  debitoVazio,
  impactos,
  moeda,
  normalizarDados,
  omissaoVazia,
  parecer,
  pendenciasObrigatorias,
  planoAcao,
  situacaoApurada,
  totalAmbito,
  totalGeral,
  tudoRegular,
  type Ambito,
  type AmbitoChave,
  type DadosLevantamento,
  type SituacaoDebito,
  type StatusLevantamento,
} from "@/lib/diagnostico";
import { lerRelatorio } from "@/lib/extracao-relatorio";
import capa from "@/assets/capa-levantamento.jpg";
import {
  Aviso,
  CabecalhoMarca,
  CONTATO,
  EstilosDocumento,
  FaixaSecao,
  LOGO_URL,
  MARCA_LEVANTAMENTO as M,
  RodapeDocumento,
} from "@/components/documento";

export const Route = createFileRoute("/_authenticated/diagnostico/$id")({
  head: () => ({
    meta: [
      { title: "Levantamento de Débitos — HUB Tributário" },
      {
        name: "description",
        content:
          "Anexe os relatórios Federal, Estadual, Municipal e FGTS, revise o que o sistema extraiu e gere o diagnóstico final em PDF.",
      },
      { property: "og:title", content: "Levantamento de Débitos — HUB Tributário" },
      {
        property: "og:description",
        content: "Extração assistida dos relatórios e geração do documento enviado ao cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorLevantamento,
});

function EditorLevantamento() {
  const { id } = Route.useParams();
  const novo = id === "novo";
  const { data: sessao } = useSessao();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [registroId, setRegistroId] = useState<string | null>(novo ? null : id);
  const [status, setStatus] = useState<StatusLevantamento>("em_andamento");
  // A data do levantamento é sempre a data do sistema no momento da criação.
  const [dataDocumento, setDataDocumento] = useState(() => new Date().toISOString().slice(0, 10));
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dados, setDados] = useState<DadosLevantamento>(() => dadosVazios());
  const [enviando, setEnviando] = useState<AmbitoChave | null>(null);
  const [leituras, setLeituras] = useState<string[]>([]);

  const responsavel = sessao?.perfil.nome_completo ?? "";

  /* ---------- Cadastro de clientes compartilhado com o HUB ---------- */
  const { data: clientes } = useQuery({
    queryKey: ["clientes-hub"],
    enabled: Boolean(sessao),
    queryFn: async () => {
      const [decl, diag] = await Promise.all([
        supabase
          .from("declaracoes")
          .select("cnpj, razao_social, nome")
          .not("cnpj", "is", null)
          .limit(2000),
        supabase.from("diagnosticos").select("cnpj, empresa").limit(500),
      ]);
      const mapa = new Map<string, { nome: string; cnpj: string }>();
      for (const d of decl.data ?? []) {
        const nome = (d.razao_social ?? d.nome ?? "").trim();
        if (!nome || !d.cnpj) continue;
        mapa.set(d.cnpj, { nome, cnpj: d.cnpj });
      }
      for (const d of diag.data ?? []) {
        if (!d.empresa) continue;
        mapa.set(d.cnpj ?? d.empresa, { nome: d.empresa, cnpj: d.cnpj ?? "" });
      }
      return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  /* ---------- Carregamento de um levantamento existente ---------- */
  const { data: registro } = useQuery({
    queryKey: ["diagnostico", id],
    enabled: Boolean(sessao) && !novo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!registro) return;
    setRegistroId(registro.id);
    setEmpresa(registro.empresa);
    setCnpj(registro.cnpj ?? "");
    setObservacoes(registro.observacoes ?? "");
    setDataDocumento(registro.data_levantamento);
    setStatus((registro.status as StatusLevantamento) ?? "em_andamento");
    setDados(normalizarDados(registro.dados));
  }, [registro]);

  const concluido = status === "concluido";

  /* ---------- Persistência ---------- */
  const salvar = useMutation({
    mutationFn: async (proximoStatus: StatusLevantamento) => {
      if (!sessao) throw new Error("Sessão não carregada.");
      if (!empresa.trim()) throw new Error("Informe ou selecione o cliente do levantamento.");
      const payload = {
        empresa: empresa.trim(),
        cnpj: cnpj.trim() || null,
        responsavel: responsavel || null,
        observacoes: observacoes.trim() || null,
        status: proximoStatus,
        concluido_em: proximoStatus === "concluido" ? new Date().toISOString() : null,
        dados: dados as unknown as never,
      };

      if (registroId) {
        const { error } = await supabase.from("diagnosticos").update(payload).eq("id", registroId);
        if (error) throw error;
        return registroId;
      }

      const { data, error } = await supabase
        .from("diagnosticos")
        .insert({
          ...payload,
          perfil_id: sessao.perfil.id,
          data_levantamento: dataDocumento,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (novoId, proximoStatus) => {
      setRegistroId(novoId);
      setStatus(proximoStatus);
      void queryClient.invalidateQueries({ queryKey: ["diagnosticos"] });
      toast.success(
        proximoStatus === "concluido"
          ? "Levantamento concluído. Você já pode gerar o PDF final."
          : "Levantamento salvo como Em andamento.",
      );
      if (novo) void navigate({ to: "/diagnostico/$id", params: { id: novoId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function atualizarAmbito(chave: AmbitoChave, patch: Partial<Ambito>) {
    setDados((atual) => ({
      ...atual,
      ambitos: { ...atual.ambitos, [chave]: { ...atual.ambitos[chave], ...patch } },
    }));
  }

  /* ---------- Anexos + extração assistida ---------- */
  async function anexar(chave: AmbitoChave, arquivos: FileList | null) {
    if (!arquivos?.length || !sessao) return;
    setEnviando(chave);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const caminho = `${sessao.perfil.id}/${Date.now()}-${arquivo.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("diagnosticos").upload(caminho, arquivo);
        if (error) throw error;

        try {
          const leitura = await lerRelatorio(arquivo);
          if (leitura.razaoSocial) setEmpresa((atual) => atual || leitura.razaoSocial!);
          if (leitura.cnpj) setCnpj((atual) => atual || leitura.cnpj!);
          setDados((atual) => {
            const ambito = atual.ambitos[chave];
            const debitos = [...ambito.debitos, ...leitura.debitos];
            return {
              ...atual,
              ambitos: {
                ...atual.ambitos,
                [chave]: {
                  ...ambito,
                  debitos,
                  omissoes: [...ambito.omissoes, ...leitura.omissoes],
                  parcelamento: ambito.parcelamento || leitura.parcelamento,
                  exigibilidadeSuspensa:
                    ambito.exigibilidadeSuspensa || leitura.exigibilidadeSuspensa,
                  situacao:
                    debitos.length > 0
                      ? "com_debitos"
                      : leitura.semDebitos
                        ? "regular"
                        : ambito.situacao,
                },
              },
            };
          });
          setLeituras((atual) => [
            ...atual,
            `${arquivo.name}: ${
              leitura.debitos.length > 0
                ? `${leitura.debitos.length} débito(s) identificado(s)`
                : leitura.semDebitos
                  ? "certidão/relatório sem débitos"
                  : "nenhum débito reconhecido automaticamente — revise manualmente"
            }${leitura.omissoes.length ? ` · ${leitura.omissoes.length} omissão(ões)` : ""}${
              leitura.ipva ? " · menção a IPVA" : ""
            }`,
          ]);
        } catch {
          setLeituras((atual) => [
            ...atual,
            `${arquivo.name}: não foi possível ler o conteúdo — informe os dados manualmente.`,
          ]);
        }

        setDados((atual) => ({
          ...atual,
          ambitos: {
            ...atual.ambitos,
            [chave]: {
              ...atual.ambitos[chave],
              documentos: [
                ...atual.ambitos[chave].documentos,
                { nome: arquivo.name, caminho, certidao: true },
              ],
            },
          },
        }));
      }
      toast.success("Anexo enviado e analisado. Revise os dados extraídos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao anexar o arquivo.");
    } finally {
      setEnviando(null);
    }
  }

  async function abrirAnexo(caminho: string) {
    const { data, error } = await supabase.storage
      .from("diagnosticos")
      .createSignedUrl(caminho, 600);
    if (error || !data) {
      toast.error("Não foi possível abrir o anexo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const pendencias = pendenciasObrigatorias(dados);
  const regular = tudoRegular(dados);
  const total = totalGeral(dados);
  const listaAlertas = alertas(dados);
  const aberturas = analiseGeral(dados);
  const certidoes = certidoesRegulares(dados);
  const conclusao = parecer(dados);
  const listaImpactos = impactos(dados);
  const plano = planoAcao(dados);

  function imprimir() {
    if (!empresa.trim()) {
      toast.error("Informe o cliente antes de gerar o documento.");
      return;
    }
    if (!concluido) {
      toast.error("Revise os dados extraídos e conclua o levantamento para gerar o PDF final.");
      return;
    }
    setTimeout(() => window.print(), 120);
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <EstilosDocumento marca={M} />

      <div className="space-y-6 print:hidden">
        <header className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/diagnostico">
              <ArrowLeft className="size-4" />
              Levantamentos
            </Link>
          </Button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                {novo && !registroId ? "Novo levantamento" : "Levantamento de débitos"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Anexe os relatórios por âmbito. A extração automática é um auxílio — revise tudo
                antes de concluir e gerar o PDF.
              </p>
            </div>
            <Badge variant={concluido ? "default" : "outline"}>
              {STATUS_LEVANTAMENTO_LABEL[status]}
            </Badge>
          </div>
        </header>

        <section className="surface-panel space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </h2>
          <div className="space-y-2">
            <Label htmlFor="empresa">Razão social</Label>
            <Input
              id="empresa"
              list="clientes-hub"
              value={empresa}
              onChange={(e) => {
                const valor = e.target.value;
                setEmpresa(valor);
                const achado = (clientes ?? []).find((c) => c.nome === valor);
                if (achado?.cnpj) setCnpj(achado.cnpj);
              }}
              placeholder="Selecione um cliente já cadastrado ou digite um novo"
            />
            <datalist id="clientes-hub">
              {(clientes ?? []).map((c) => (
                <option key={`${c.nome}-${c.cnpj}`} value={c.nome}>
                  {c.cnpj}
                </option>
              ))}
            </datalist>
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
              <Label>Data do levantamento</Label>
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

        <section className="surface-panel space-y-2 p-5">
          <Label htmlFor="mensagem">Mensagem inicial do documento (editável)</Label>
          <Textarea
            id="mensagem"
            rows={7}
            value={dados.mensagemInicial}
            onChange={(e) => setDados((atual) => ({ ...atual, mensagemInicial: e.target.value }))}
          />
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
                <Badge variant={ambitoDevedor(ambito) ? "destructive" : "outline"}>
                  {ambitoDevedor(ambito) ? "Devedor" : "Regular"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Button asChild variant="secondary" size="sm" disabled={enviando === meta.chave}>
                  <label className="cursor-pointer">
                    {enviando === meta.chave ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileUp className="size-4" />
                    )}
                    Anexar relatório/certidão
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.txt,.csv,.xml,image/*"
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
                      <button
                        type="button"
                        className="truncate text-left hover:underline"
                        onClick={() => void abrirAnexo(doc.caminho)}
                      >
                        {doc.nome}
                      </button>
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

              <div className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Situação apurada pelo sistema: {SITUACAO_AMBITO_LABEL[situacaoApurada(ambito)]}
                </span>
                <p className="mt-1">
                  A classificação é definida automaticamente pelos documentos anexados (débitos
                  reconhecidos, parcelamentos, exigibilidade suspensa e omissões). Corrija abaixo
                  apenas os dados extraídos, se necessário.
                </p>
                {ambito.parcelamento || ambito.exigibilidadeSuspensa ? (
                  <p className="mt-1">
                    Identificado no documento:{" "}
                    {[
                      ambito.parcelamento ? "parcelamento" : null,
                      ambito.exigibilidadeSuspensa ? "exigibilidade suspensa" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    .
                  </p>
                ) : null}
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
                    Nenhum débito — o documento apresentará esta esfera como Regular e a certidão
                    anexada será citada como comprovação.
                  </p>
                ) : (
                  ambito.debitos.map((debito) => (
                    <div key={debito.id} className="rounded-md border border-border p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Tributo (ex.: ICMS, IPVA, ISS, FGTS)"
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
                          placeholder="Competência / período"
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Omissão de declaração</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      atualizarAmbito(meta.chave, {
                        omissoes: [...ambito.omissoes, omissaoVazia()],
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Omissão
                  </Button>
                </div>
                {ambito.omissoes.map((omissao) => (
                  <div key={omissao.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Declaração/obrigação omitida"
                      value={omissao.obrigacao}
                      onChange={(e) =>
                        atualizarAmbito(meta.chave, {
                          omissoes: ambito.omissoes.map((o) =>
                            o.id === omissao.id ? { ...o, obrigacao: e.target.value } : o,
                          ),
                        })
                      }
                    />
                    <Input
                      placeholder="Competência"
                      className="max-w-[130px]"
                      value={omissao.referencia}
                      onChange={(e) =>
                        atualizarAmbito(meta.chave, {
                          omissoes: ambito.omissoes.map((o) =>
                            o.id === omissao.id ? { ...o, referencia: e.target.value } : o,
                          ),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover omissão"
                      onClick={() =>
                        atualizarAmbito(meta.chave, {
                          omissoes: ambito.omissoes.filter((o) => o.id !== omissao.id),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
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
              Âmbitos ainda sem anexo: {pendencias.join(", ")}.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => salvar.mutate("em_andamento")}
              disabled={salvar.isPending}
            >
              {salvar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar em andamento
            </Button>
            <Button onClick={() => salvar.mutate("concluido")} disabled={salvar.isPending}>
              <CheckCircle2 className="size-4" />
              Revisei — concluir
            </Button>
            <Button variant="outline" onClick={imprimir} disabled={!concluido}>
              <Printer className="size-4" />
              Baixar PDF final
            </Button>
          </div>
          {!concluido ? (
            <p className="text-xs text-muted-foreground">
              O PDF final é liberado após a revisão dos dados extraídos e a conclusão do
              levantamento.
            </p>
          ) : null}
        </section>
      </div>

      {/* ============ Documento gerado ============ */}
      <div className="doc-preview">
        {/* Capa */}
        <section aria-label="Capa do documento" className="doc-page">
          <div className="doc-body" style={{ background: "#fff" }}>
            {/* Bloco superior: fotografia com o título institucional */}
            <div style={{ position: "relative", flex: "0 0 66%", overflow: "hidden" }}>
              <img
                src={capa}
                alt=""
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.86) 45%, rgba(255,255,255,0.25) 72%, rgba(255,255,255,0) 100%)",
                }}
              />
              {/* Chanfro dourado à esquerda, como no modelo */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "3%",
                  top: "4%",
                  bottom: "16%",
                  width: "14%",
                  borderLeft: `1.5px solid ${M.dourado}`,
                  borderTop: `1.5px solid ${M.dourado}`,
                  borderBottom: `1.5px solid ${M.dourado}`,
                  clipPath: "polygon(0 0, 100% 0, 100% 8%, 18% 50%, 100% 92%, 100% 100%, 0 100%)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  padding: "7% 8% 0 14%",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78em",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: M.douradoEscuro,
                      fontWeight: 600,
                    }}
                  >
                    Orientação exclusiva ao cliente
                  </p>
                  <div
                    aria-hidden="true"
                    style={{
                      width: "9%",
                      height: "2px",
                      background: M.dourado,
                      margin: "1.1em auto 0",
                    }}
                  />
                </div>

                <div style={{ marginTop: "9%", textAlign: "center" }}>
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: '"Space Grotesk", Arial, sans-serif',
                      fontSize: "3.4em",
                      lineHeight: 1,
                      fontWeight: 300,
                      letterSpacing: "0.04em",
                      color: M.grafite,
                    }}
                  >
                    LÓGICA
                  </h1>
                  <p
                    style={{
                      margin: "0.12em 0 0",
                      fontFamily: '"Space Grotesk", Arial, sans-serif',
                      fontSize: "3.5em",
                      lineHeight: 0.98,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: M.douradoEscuro,
                    }}
                  >
                    EM CONFORMIDADE
                  </p>
                  <p
                    style={{
                      margin: "0.35em 0 0",
                      fontFamily: '"Space Grotesk", Arial, sans-serif',
                      fontSize: "1.35em",
                      fontWeight: 700,
                      letterSpacing: "0.01em",
                      color: M.grafite,
                    }}
                  >
                    DO DIAGNÓSTICO À REGULARIZAÇÃO.
                  </p>
                </div>
              </div>

              {/* Faixa dourada inferior */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, ${M.douradoEscuro}, ${M.dourado})`,
                  padding: "1.5% 8%",
                  textAlign: "center",
                  color: "#fff",
                  fontSize: "1.05em",
                  fontWeight: 600,
                }}
              >
                Levantamento de débitos — Federal, Estadual, Municipal e FGTS
              </div>
            </div>

            {/* Bloco inferior: destinatário e identificação do escritório */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: M.creme,
                textAlign: "center",
                padding: "4% 10% 0",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.7em",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: M.douradoEscuro,
                  fontWeight: 600,
                }}
              >
                Preparado para
              </p>
              <p
                style={{
                  margin: "0.5em 0 0",
                  fontSize: "1.25em",
                  fontWeight: 700,
                  wordBreak: "break-word",
                  opacity: empresa.trim() ? 1 : 0.5,
                }}
              >
                {empresa.trim() ? empresa.trim().toUpperCase() : "RAZÃO SOCIAL DO CLIENTE"}
              </p>
              <p style={{ margin: "0.5em 0 0", fontSize: "0.85em", color: M.grafiteClaro }}>
                {cnpj.trim() ? `CNPJ ${cnpj.trim()}` : "CNPJ a identificar"} · Emitido em{" "}
                {formatarData(dataDocumento, false)}
              </p>
              <p
                style={{
                  margin: "0.5em 0 0",
                  fontSize: "0.68em",
                  fontStyle: "italic",
                  color: M.grafiteClaro,
                }}
              >
                Documento confidencial — uso exclusivo do destinatário
              </p>

              <img
                src={LOGO_URL}
                alt="Lógica Assessoria Contábil"
                style={{ width: "34%", alignSelf: "center", marginTop: "auto" }}
              />
            </div>

            <RodapeDocumento pagina={1} total={2} marca={M} />
          </div>
        </section>

        {/* Conteúdo */}
        <div className="doc-flow">
          <div className="doc-flow-body">
            <CabecalhoMarca titulo="Levantamento de débitos" marca={M} />

            <div style={{ padding: "3% 8% 0" }}>
              <section>
                <FaixaSecao marca={M}>1. Apresentação e identificação</FaixaSecao>
                <table>
                  <tbody>
                    <tr>
                      <th style={{ width: "34%" }}>Razão social</th>
                      <td>{empresa.trim() || "—"}</td>
                    </tr>
                    <tr>
                      <th>CNPJ</th>
                      <td>{cnpj.trim() || "—"}</td>
                    </tr>
                    <tr>
                      <th>Data-base da consulta</th>
                      <td>{formatarData(dataDocumento, false)}</td>
                    </tr>
                    <tr>
                      <th>Responsável técnico</th>
                      <td>{responsavel || "Departamento Tributário"}</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ margin: "1em 0" }}>{dados.mensagemInicial}</p>
              </section>

              <section className="evitar-quebra">
                <FaixaSecao marca={M}>2. Sumário executivo</FaixaSecao>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8em",
                    marginBottom: "0.9em",
                  }}
                >
                  <span
                    style={{
                      background: conclusao.classificacao === "regular" ? M.grafite : M.dourado,
                      color: conclusao.classificacao === "regular" ? "#fff" : M.grafite,
                      padding: "0.35em 0.9em",
                      fontSize: "0.8em",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {conclusao.selo}
                  </span>
                  <span style={{ fontSize: "0.8em", color: M.grafiteClaro }}>
                    Posição em {formatarData(dataDocumento, false)}
                  </span>
                </div>
                <p style={{ margin: "0 0 1em" }}>{conclusao.sintese}</p>
                <div style={{ display: "flex", gap: "2%", marginBottom: "1em" }}>
                  {conclusao.indicadores.map((ind) => (
                    <div
                      key={ind.rotulo}
                      style={{
                        flex: 1,
                        border: `1px solid ${M.cinza}`,
                        borderTop: `3px solid ${M.dourado}`,
                        padding: "0.7em 0.8em",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.62em",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: M.grafiteClaro,
                        }}
                      >
                        {ind.rotulo}
                      </div>
                      <div style={{ fontSize: "1.15em", fontWeight: 700, marginTop: "0.2em" }}>
                        {ind.valor}
                      </div>
                    </div>
                  ))}
                </div>
                {aberturas.map((paragrafo) => (
                  <p key={paragrafo} style={{ margin: "0 0 1em" }}>
                    {paragrafo}
                  </p>
                ))}
              </section>

              <section className="evitar-quebra">
                <FaixaSecao marca={M}>3. Panorama por esfera</FaixaSecao>
                <table>
                  <thead>
                    <tr>
                      <th>Esfera</th>
                      <th>Situação apurada</th>
                      <th>Apontamentos</th>
                      <th style={{ textAlign: "right" }}>Valor posicional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AMBITOS.map((meta) => {
                      const ambito = dados.ambitos[meta.chave];
                      const situacao = situacaoApurada(ambito);
                      return (
                        <tr key={meta.chave}>
                          <td>{meta.curto}</td>
                          <td style={{ fontWeight: 700 }}>{SITUACAO_AMBITO_LABEL[situacao]}</td>
                          <td>{ambito.debitos.length}</td>
                          <td style={{ textAlign: "right" }}>{moeda(totalAmbito(ambito))}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 700, background: M.cinza }}>
                        Total apurado
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, background: M.cinza }}>
                        {moeda(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ margin: "0 0 1em", fontSize: "0.85em", color: M.grafiteClaro }}>
                  Situação apurada automaticamente pelo sistema a partir dos documentos oficiais
                  anexados a este levantamento — sem classificação manual.
                </p>
                {regular ? (
                  <Aviso titulo="Empresa regular na data da consulta" tom="neutro" marca={M}>
                    Não foram identificados débitos nas esferas consultadas. As certidões que
                    comprovam a regularidade seguem relacionadas ao final deste documento.
                  </Aviso>
                ) : null}
              </section>

              <section>
                <FaixaSecao marca={M}>4. Análise detalhada por esfera</FaixaSecao>
                {AMBITOS.map((meta) => {
                  const ambito = dados.ambitos[meta.chave];
                  return (
                    <div key={meta.chave} className="evitar-quebra" style={{ marginBottom: "1.4em" }}>
                      <h3
                        style={{
                          margin: "0 0 0.4em",
                          fontSize: "0.95em",
                          fontWeight: 700,
                          borderBottom: `1px solid ${M.dourado}`,
                          paddingBottom: "0.25em",
                        }}
                      >
                        4.{AMBITOS.indexOf(meta) + 1} {meta.titulo}
                      </h3>
                      <p style={{ margin: "0 0 0.8em" }}>{analiseAmbito(meta.titulo, ambito)}</p>
                      {ambito.debitos.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Tributo</th>
                              <th>Competência/período</th>
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
                      {ambito.omissoes.length > 0 ? (
                        <p style={{ margin: "0 0 0.8em" }}>
                          Omissão de entrega identificada:{" "}
                          {ambito.omissoes
                            .map((o) =>
                              [o.obrigacao || "declaração não identificada", o.referencia]
                                .filter(Boolean)
                                .join(" — "),
                            )
                            .join("; ")}
                          .
                        </p>
                      ) : null}
                      {ambito.observacao.trim() ? (
                        <p style={{ margin: "0 0 0.8em" }}>{ambito.observacao}</p>
                      ) : null}
                      <p style={{ margin: 0, fontSize: "0.82em", color: M.grafiteClaro }}>
                        {ambito.documentos.length > 0
                          ? `Base documental: ${ambito.documentos.map((d) => d.nome).join(", ")}.`
                          : "Base documental: consulta oficial ainda não apresentada."}
                      </p>
                    </div>
                  );
                })}
              </section>

              <section>
                <FaixaSecao marca={M}>5. Efeitos práticos e fundamentos legais</FaixaSecao>
                {listaImpactos.length > 0 ? (
                  listaImpactos.map((item) => (
                    <Aviso key={item.titulo} titulo={item.titulo} tom={item.tom} marca={M}>
                      {item.texto}
                    </Aviso>
                  ))
                ) : (
                  <p style={{ margin: "0 0 1em" }}>
                    Não há efeitos restritivos decorrentes de débitos na data desta consulta: a
                    empresa está apta à obtenção das certidões negativas nas esferas analisadas
                    (arts. 205 e 206 do Código Tributário Nacional).
                  </p>
                )}
              </section>

              <section>
                <FaixaSecao marca={M}>6. Pontos de atenção específicos</FaixaSecao>
                {listaAlertas.map((alerta) => (
                  <Aviso key={alerta.titulo} titulo={alerta.titulo} tom={alerta.tom} marca={M}>
                    {alerta.texto}
                  </Aviso>
                ))}
              </section>

              <section className="evitar-quebra">
                <FaixaSecao marca={M}>7. Plano de regularização recomendado</FaixaSecao>
                <ol style={{ margin: "0 0 1em", paddingLeft: "1.2em" }}>
                  {plano.map((passo) => (
                    <li key={passo} style={{ marginBottom: "0.45em" }}>
                      {passo}
                    </li>
                  ))}
                </ol>
              </section>

              {certidoes.length > 0 ? (
                <section className="evitar-quebra">
                  <FaixaSecao marca={M}>8. Documentos que comprovam a regularidade</FaixaSecao>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "26%" }}>Esfera</th>
                        <th>Documento anexo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certidoes.map((c) => (
                        <tr key={`${c.ambito}-${c.nome}`}>
                          <td>{c.ambito}</td>
                          <td>{c.nome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ) : null}

              <section className="evitar-quebra">
                <FaixaSecao marca={M}>Encerramento e ressalvas</FaixaSecao>
                <p style={{ margin: "0 0 1em" }}>{dados.mensagemFinal}</p>
                <p style={{ margin: "0 0 1em", fontSize: "0.85em", color: M.grafiteClaro }}>
                  Este levantamento reflete exclusivamente as informações constantes nos sistemas
                  oficiais na data-base indicada, com base nos documentos apresentados. Valores em
                  aberto sofrem atualização de juros e multa até o efetivo pagamento, sendo
                  indispensável o recálculo das guias na quitação. Documento de uso exclusivo do
                  cliente identificado.
                </p>
                <p style={{ margin: "1.5em 0 0", fontWeight: 700 }}>Departamento Tributário</p>
                <p style={{ margin: "0.2em 0 0", fontSize: "0.9em", color: M.grafiteClaro }}>
                  {responsavel ? `${responsavel} · ` : ""}Lógica Assessoria Contábil ·{" "}
                  {CONTATO.telefone} · {CONTATO.email}
                </p>
              </section>
            </div>

            <RodapeDocumento pagina={2} total={2} marca={M} />
          </div>
        </div>
      </div>
    </div>
  );
}
