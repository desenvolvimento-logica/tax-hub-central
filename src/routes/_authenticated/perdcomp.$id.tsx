import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Download, FileText, History, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  baixarArquivo,
  buscarResponsavel,
  obterDeclaracao,
  resolverAlerta,
  revisarAchado,
  salvarAcompanhamento,
  type EntradaAcompanhamento,
} from "@/lib/perdcomp.functions";
import { abrirPdf, dataCurta, dataHora, documento, moeda, tomSituacao } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/perdcomp/$id")({
  head: () => ({
    meta: [
      { title: "Declaração PERDCOMP — HUB Tributário" },
      {
        name: "description",
        content:
          "Extrato consolidado da declaração PERDCOMP, auditoria, prazos e log de alterações da equipe.",
      },
      { property: "og:title", content: "Declaração PERDCOMP — HUB Tributário" },
      {
        property: "og:description",
        content: "Detalhe da declaração PERDCOMP com pós-processamento e histórico.",
      },
    ],
  }),
  component: DetalheDeclaracao,
});

function vazio(id: string): EntradaAcompanhamento {
  return {
    declaracao_id: id,
    ordem_servico: "",
    terceiro: false,
    aviso_pagamento: false,
    aviso_pagamento_data: null,
    aviso_pagamento_prazo: null,
    pagamento_confirmado: false,
    pagamento_confirmado_em: null,
    compensacao_oficio: false,
    compensacao_oficio_prazo: null,
    compensacao_oficio_opcao: "",
    intimacao: false,
    intimacao_prazo: null,
    encerrado: false,
    encerrado_em: null,
    observacao: "",
  };
}

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{rotulo}</p>
      <p className="text-sm">{valor ?? "—"}</p>
    </div>
  );
}

function DetalheDeclaracao() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const carregar = useServerFn(obterDeclaracao);
  const salvar = useServerFn(salvarAcompanhamento);
  const revisar = useServerFn(revisarAchado);
  const resolver = useServerFn(resolverAlerta);
  const baixar = useServerFn(baixarArquivo);
  const lerResponsavel = useServerFn(buscarResponsavel);

  const { data, isLoading } = useQuery({
    queryKey: ["perdcomp", "declaracao", id],
    queryFn: () => carregar({ data: { id } }),
  });

  const [form, setForm] = useState<EntradaAcompanhamento>(() => vazio(id));

  useEffect(() => {
    if (!data) return;
    const a = data.acompanhamento;
    if (!a) {
      setForm(vazio(id));
      return;
    }
    const opcao = a.compensacao_oficio_opcao;
    setForm({
      ...vazio(id),
      ...a,
      compensacao_oficio_opcao:
        opcao === "compensacao" || opcao === "recusa" ? opcao : "",
    });
  }, [data, id]);

  const gravar = useMutation({
    mutationFn: () => salvar({ data: form }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi possível salvar.");
        return;
      }
      toast.success(
        r.alteracoes ? `${r.alteracoes} alteração(ões) registradas no log.` : "Acompanhamento salvo.",
      );
      queryClient.invalidateQueries({ queryKey: ["perdcomp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declaracao = data?.declaracao;

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando declaração...</p>;
  if (!declaracao) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Declaração não encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/perdcomp">Voltar ao painel</Link>
        </Button>
      </div>
    );
  }

  async function baixarAnexo(tipo: "recibo" | "documento") {
    const r = await baixar({ data: { declaracaoId: id, tipo } });
    if (!r.ok) {
      toast.error(r.erro ?? "Anexo indisponível.");
      return;
    }
    abrirPdf(r.base64, r.nome, r.mime);
  }

  function set<K extends keyof EntradaAcompanhamento>(campo: K, valor: EntradaAcompanhamento[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/perdcomp">
              <ArrowLeft className="size-4" /> Painel PERDCOMP
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold">
            {declaracao.numero_perdcomp ?? declaracao.nome ?? "Declaração"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {declaracao.razao_social ?? "—"} · {documento(declaracao.cnpj)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={tomSituacao(declaracao.situacao)}>
            {declaracao.situacao ?? "—"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => baixarAnexo("recibo")}>
            <Download className="size-4" /> Recibo
          </Button>
          <Button variant="outline" size="sm" onClick={() => baixarAnexo("documento")}>
            <FileText className="size-4" /> Declaração
          </Button>
        </div>
      </header>

      <section className="surface-panel grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Campo rotulo="Tipo de documento" valor={declaracao.tipo_documento} />
        <Campo rotulo="Tipo de crédito" valor={declaracao.tipo_credito} />
        <Campo rotulo="Tributo / grupo" valor={declaracao.grupo_tributo} />
        <Campo rotulo="Código da receita" valor={declaracao.codigo_receita} />
        <Campo rotulo="Período de apuração" valor={declaracao.periodo_apuracao} />
        <Campo rotulo="Data de transmissão" valor={dataCurta(declaracao.data_transmissao)} />
        <Campo rotulo="Número do recibo" valor={declaracao.numero_recibo} />
        <Campo rotulo="Crédito total" valor={moeda(declaracao.valor_total_credito)} />
        <Campo rotulo="Crédito atualizado" valor={moeda(declaracao.credito_atualizado)} />
        <Campo rotulo="Valor utilizado" valor={moeda(declaracao.valor_utilizado)} />
        <Campo rotulo="Total de débitos" valor={moeda(declaracao.total_debitos)} />
        <Campo rotulo="Saldo restante" valor={moeda(declaracao.saldo_restante)} />
        <Campo rotulo="Processo administrativo" valor={declaracao.processo_administrativo} />
        <Campo rotulo="Processo judicial" valor={declaracao.processo_judicial} />
        <Campo rotulo="Processo de habilitação" valor={declaracao.processo_habilitacao} />
        <Campo rotulo="Orientação da situação" valor={declaracao.ajuda_situacao} />
        <Campo rotulo="Última sincronização" valor={dataHora(declaracao.ultima_sincronizacao)} />
      </section>

      <section className="surface-panel space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Responsável pelo preenchimento</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const r = await lerResponsavel({ data: { id } });
              if (!r.ok) {
                toast.error(r.erro ?? "Não foi possível ler o PDF.");
                return;
              }
              toast.success(r.responsavel.nome ?? "PDF lido, sem responsável identificado.");
              queryClient.invalidateQueries({ queryKey: ["perdcomp"] });
            }}
          >
            Ler do PDF
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Nome" valor={declaracao.responsavel_nome} />
          <Campo rotulo="CPF" valor={documento(declaracao.responsavel_cpf)} />
          <Campo rotulo="CRC" valor={declaracao.responsavel_crc} />
          <Campo rotulo="E-mail" valor={declaracao.responsavel_email} />
        </div>
      </section>

      <section className="surface-panel space-y-5 p-6">
        <h2 className="text-lg font-semibold">Pós-processamento</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Ordem de serviço
            </Label>
            <Input
              value={form.ordem_servico ?? ""}
              onChange={(e) => set("ordem_servico", e.target.value)}
              placeholder="Número da O.S."
            />
          </div>
          <label className="flex items-center gap-3 pt-6 text-sm">
            <Switch
              checked={Boolean(form.terceiro)}
              onCheckedChange={(v) => set("terceiro", v)}
            />
            Declaração de terceiro (fora dos totais)
          </label>
        </div>

        <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={Boolean(form.aviso_pagamento)}
              onCheckedChange={(v) => set("aviso_pagamento", v)}
            />
            Aviso de pagamento
          </label>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Data do aviso</Label>
            <Input
              type="date"
              value={form.aviso_pagamento_data ?? ""}
              onChange={(e) => set("aviso_pagamento_data", e.target.value || null)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Prazo</Label>
            <Input
              type="date"
              value={form.aviso_pagamento_prazo ?? ""}
              onChange={(e) => set("aviso_pagamento_prazo", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={Boolean(form.pagamento_confirmado)}
                onCheckedChange={(v) => set("pagamento_confirmado", v)}
              />
              Pagamento em conta
            </label>
            <Input
              type="date"
              value={form.pagamento_confirmado_em ?? ""}
              onChange={(e) => set("pagamento_confirmado_em", e.target.value || null)}
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-3">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={Boolean(form.compensacao_oficio)}
              onCheckedChange={(v) => set("compensacao_oficio", v)}
            />
            Compensação de ofício
          </label>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Prazo</Label>
            <Input
              type="date"
              value={form.compensacao_oficio_prazo ?? ""}
              onChange={(e) => set("compensacao_oficio_prazo", e.target.value || null)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Opção do cliente</Label>
            <Select
              value={form.compensacao_oficio_opcao || "nenhuma"}
              onValueChange={(v) =>
                set("compensacao_oficio_opcao", v === "nenhuma" ? "" : (v as "compensacao" | "recusa"))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Não informado</SelectItem>
                <SelectItem value="compensacao">Compensação</SelectItem>
                <SelectItem value="recusa">Recusa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={Boolean(form.intimacao)} onCheckedChange={(v) => set("intimacao", v)} />
            Intimação recebida
          </label>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Prazo de atendimento</Label>
            <Input
              type="date"
              value={form.intimacao_prazo ?? ""}
              onChange={(e) => set("intimacao_prazo", e.target.value || null)}
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={Boolean(form.encerrado)} onCheckedChange={(v) => set("encerrado", v)} />
            Encerrado
          </label>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Data do encerramento</Label>
            <Input
              type="date"
              value={form.encerrado_em ?? ""}
              onChange={(e) => set("encerrado_em", e.target.value || null)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Observação
          </Label>
          <Textarea
            rows={3}
            value={form.observacao ?? ""}
            onChange={(e) => set("observacao", e.target.value)}
          />
        </div>

        <Button onClick={() => gravar.mutate()} disabled={gravar.isPending}>
          {gravar.isPending ? "Salvando..." : "Salvar acompanhamento"}
        </Button>
      </section>

      <section className="surface-panel space-y-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="size-4" /> Auditoria
        </h2>
        {!data?.achados.length ? (
          <p className="text-sm text-muted-foreground">Nenhum apontamento nesta declaração.</p>
        ) : (
          <ul className="space-y-2">
            {data.achados.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm">{a.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.severidade === "critico" ? "Crítico" : "Atenção"} ·{" "}
                    {a.revisado ? `revisado em ${dataHora(a.revisado_em)}` : "pendente"}
                  </p>
                </div>
                {!a.revisado ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const r = await revisar({ data: { id: a.id } });
                      if (!r.ok) toast.error(r.erro ?? "Falha ao marcar.");
                      else queryClient.invalidateQueries({ queryKey: ["perdcomp"] });
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Marcar revisado
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-panel space-y-3 p-6">
        <h2 className="text-lg font-semibold">Alertas de situação</h2>
        {!data?.alertas.length ? (
          <p className="text-sm text-muted-foreground">Sem alertas registrados.</p>
        ) : (
          <ul className="space-y-2">
            {data.alertas.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm">{a.mensagem}</p>
                  <p className="text-xs text-muted-foreground">
                    {dataHora(a.criado_em)} ·{" "}
                    {a.resolvido ? `resolvido em ${dataHora(a.resolvido_em)}` : "aberto"}
                  </p>
                </div>
                {!a.resolvido ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const r = await resolver({ data: { id: a.id } });
                      if (!r.ok) toast.error(r.erro ?? "Falha ao resolver.");
                      else queryClient.invalidateQueries({ queryKey: ["perdcomp"] });
                    }}
                  >
                    Resolver
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel space-y-3 p-6">
          <h2 className="text-lg font-semibold">Histórico de situação</h2>
          {!data?.historico.length ? (
            <p className="text-sm text-muted-foreground">Sem histórico.</p>
          ) : (
            <ol className="space-y-2">
              {data.historico.map((h) => (
                <li key={h.id} className="rounded-md border border-border p-3 text-sm">
                  <p>
                    {h.situacao_anterior ?? "—"} <span className="text-muted-foreground">→</span>{" "}
                    <strong>{h.situacao_nova}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">{dataHora(h.registrado_em)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="surface-panel space-y-3 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <History className="size-4" /> Log da equipe
          </h2>
          {!data?.log.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          ) : (
            <ol className="space-y-2">
              {data.log.map((l) => (
                <li key={l.id} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{l.campo}</p>
                  <p className="text-muted-foreground">
                    De {l.valor_anterior ?? "não preenchido"} → {l.valor_novo ?? "não preenchido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.usuario_nome || "—"} · {dataHora(l.criado_em)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
