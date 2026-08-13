import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Eye, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  SUB_TIPO_LABEL,
  TIPO_ACAO_LABEL,
  formatarData,
  useSessao,
  type Mensagem,
} from "@/lib/hub";
import { ORIGEM_LEITURA_LABEL, TRIAGEM_LABEL, leituraEfetiva } from "@/lib/gob";
import { ConteudoMensagem } from "@/components/conteudo-mensagem";
import { baixarHtmlComoPdf } from "@/lib/pdf";
import { statusVariant } from "./mensagens.index";

export const Route = createFileRoute("/_authenticated/mensagens/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da mensagem — HUB Tributário" },
      {
        name: "description",
        content: "Conteúdo integral da mensagem do e-CAC, histórico de visualizações e ações registradas.",
      },
      { property: "og:title", content: "Detalhe da mensagem — HUB Tributário" },
      { property: "og:description", content: "Tratamento e histórico de uma mensagem do e-CAC." },
    ],
  }),
  component: DetalheMensagem,
});

type Detalhe = Mensagem & {
  visualizacoes: {
    id: string;
    data_visualizacao: string;
    perfis: { nome_completo: string } | null;
  }[];
  acoes: {
    id: string;
    tipo_acao: string;
    sub_tipo: string | null;
    observacao: string | null;
    data_acao: string;
    perfis: { nome_completo: string } | null;
  }[];
};

function DetalheMensagem() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: sessao } = useSessao();

  const conteudoRef = useRef<HTMLDivElement>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [tipoAcao, setTipoAcao] = useState("");
  const [subTipo, setSubTipo] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: mensagem, isLoading } = useQuery({
    queryKey: ["mensagem", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select(
          "*, visualizacoes(id, data_visualizacao, perfis(nome_completo)), acoes(id, tipo_acao, sub_tipo, observacao, data_acao, perfis(nome_completo))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Detalhe | null;
    },
  });

  // Registra a visualização humana ao abrir a mensagem (uma por colaborador).
  useEffect(() => {
    const perfilId = sessao?.perfil.id;
    if (!perfilId || !mensagem) return;
    const jaViu = (mensagem.visualizacoes ?? []).some(
      (v) => v.perfis?.nome_completo === sessao?.perfil.nome_completo,
    );
    if (jaViu) return;
    void (async () => {
      const { error } = await supabase
        .from("visualizacoes")
        .insert({ mensagem_id: id, colaborador_id: perfilId });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["mensagem", id] });
        queryClient.invalidateQueries({ queryKey: ["mensagens"] });
      }

    })();
  }, [mensagem, sessao, id, queryClient]);

  const registrarAcao = useMutation({
    mutationFn: async () => {
      if (!sessao) throw new Error("Sessão não encontrada");
      const { error } = await supabase.from("acoes").insert({
        mensagem_id: id,
        colaborador_id: sessao.perfil.id,
        tipo_acao: tipoAcao,
        sub_tipo: tipoAcao === "enviado_cliente" ? subTipo || null : null,
        observacao: observacao || null,
      });
      if (error) throw error;

    },
    onSuccess: () => {
      setTipoAcao("");
      setSubTipo("");
      setObservacao("");
      toast.success("Ação registrada");
      queryClient.invalidateQueries({ queryKey: ["mensagem", id] });
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
    },
    onError: (e: Error) => toast.error("Erro ao registrar ação", { description: e.message }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando mensagem…</p>;
  if (!mensagem) {
    return (
      <div className="surface-panel mx-auto max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold">Mensagem não encontrada</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/mensagens">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  const leitura = leituraEfetiva(mensagem, mensagem.visualizacoes);

  const historico = [
    ...(mensagem.visualizacoes ?? []).map((v) => ({
      id: v.id,
      quando: v.data_visualizacao,
      quem: v.perfis?.nome_completo ?? "—",
      titulo: "Visualização humana",
      detalhe: null as string | null,
    })),
    ...(mensagem.acoes ?? []).map((a) => ({
      id: a.id,
      quando: a.data_acao,
      quem: a.perfis?.nome_completo ?? "—",
      titulo: TIPO_ACAO_LABEL[a.tipo_acao] ?? a.tipo_acao,
      detalhe:
        [a.sub_tipo ? (SUB_TIPO_LABEL[a.sub_tipo] ?? a.sub_tipo) : null, a.observacao]
          .filter(Boolean)
          .join(" · ") || null,
    })),
  ].sort((a, b) => +new Date(b.quando) - +new Date(a.quando));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/mensagens">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
      </Button>

      <header className="surface-panel space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{mensagem.protocolo}</p>
            <h1 className="mt-1 text-xl font-semibold">{mensagem.assunto}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mensagem.nome_contribuinte} · {mensagem.cnpj_contribuinte}
            </p>
          </div>
          <Badge variant={statusVariant(mensagem.status_geral)}>
            {STATUS_LABEL[mensagem.status_geral] ?? mensagem.status_geral}
          </Badge>
        </div>

        <Separator />

        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Remetente</dt>
            <dd className="font-medium">{mensagem.remetente ?? mensagem.orgao}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tipo</dt>
            <dd className="font-medium">{mensagem.tipo ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">NI</dt>
            <dd className="font-medium">{mensagem.ni ?? mensagem.cnpj_contribuinte}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Enviada em</dt>
            <dd className="font-medium">{formatarData(mensagem.data_recebimento)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Exibição até</dt>
            <dd className="font-medium">{formatarData(mensagem.exibicao_ate, false)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Triagem</dt>
            <dd className="font-medium">{TRIAGEM_LABEL[mensagem.triagem] ?? mensagem.triagem}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Organização</dt>
            <dd className="font-medium">{mensagem.organizacao ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tag</dt>
            <dd className="font-medium">{mensagem.tag ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Situação no GOB</dt>
            <dd className="font-medium">
              {[
                mensagem.ativo ? "Ativa" : "Inativa",
                mensagem.arquivada ? "Arquivada" : null,
                mensagem.importante ? "Importante" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-xs text-muted-foreground">Primeira leitura</dt>
            <dd className="font-medium">
              {leitura ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-success">
                  <span className="inline-flex items-center gap-1">
                    <MailCheck className="size-4" /> {leitura.quem} · {formatarData(leitura.quando)}
                  </span>
                  <Badge variant={leitura.origem === "portal" ? "default" : "secondary"}>
                    {ORIGEM_LEITURA_LABEL[leitura.origem]}
                  </Badge>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warning">
                  <MailX className="size-4" /> Pendente — aguardando leitura de um colaborador no
                  portal
                </span>
              )}
              {mensagem.primeira_leitura_gob && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (e-CAC/GOB sinalizou leitura em {formatarData(mensagem.primeira_leitura_gob)}
                  {mensagem.leitor_gob ? ` por ${mensagem.leitor_gob}` : ""})
                </span>
              )}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Conteúdo da mensagem</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={gerandoPdf || !mensagem.conteudo.trim()}
            onClick={async () => {
              if (!conteudoRef.current) return;
              setGerandoPdf(true);
              try {
                await baixarHtmlComoPdf(
                  conteudoRef.current,
                  `mensagem-${mensagem.protocolo}.pdf`,
                );
              } catch (e) {
                toast.error("Não foi possível gerar o PDF", {
                  description: e instanceof Error ? e.message : undefined,
                });
              } finally {
                setGerandoPdf(false);
              }
            }}
          >
            <Download className="size-4" />
            {gerandoPdf ? "Gerando…" : "Baixar PDF"}
          </Button>
        </div>

        <div ref={conteudoRef} className="rounded-md bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">{mensagem.protocolo}</p>
          <h3 className="mb-1 text-base font-semibold">{mensagem.assunto}</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {mensagem.nome_contribuinte} · {mensagem.cnpj_contribuinte} ·{" "}
            {mensagem.remetente ?? mensagem.orgao} · {formatarData(mensagem.data_recebimento)}
          </p>
          <ConteudoMensagem html={mensagem.conteudo} />
        </div>

        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          {(mensagem.visualizacoes ?? []).length} visualização(ões) por colaboradores
        </p>

      </header>

      <section className="surface-panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Registrar tratamento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Ação</Label>
            <Select value={tipoAcao} onValueChange={setTipoAcao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a ação" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_ACAO_LABEL).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tipoAcao === "enviado_cliente" && (
            <div className="space-y-1.5">
              <Label>Canal de envio</Label>
              <Select value={subTipo} onValueChange={setSubTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="E-mail ou Acessórias" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUB_TIPO_LABEL).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observação</Label>
            <Textarea
              rows={3}
              placeholder="Detalhes do encaminhamento, prazos, responsável no cliente…"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={() => registrarAcao.mutate()}
          disabled={
            !tipoAcao ||
            (tipoAcao === "enviado_cliente" && !subTipo) ||
            registrarAcao.isPending
          }
        >
          Registrar ação
        </Button>
      </section>

      <section className="surface-panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Histórico</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <ol className="space-y-3">
            {historico.map((h) => (
              <li key={h.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{h.titulo}</p>
                  <p className="text-xs text-muted-foreground">{formatarData(h.quando)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{h.quem}</p>
                {h.detalhe && <p className="mt-2 text-sm">{h.detalhe}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
