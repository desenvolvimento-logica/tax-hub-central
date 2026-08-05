import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Eye, EyeOff, Inbox, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, formatarData, useSessao, type Mensagem } from "@/lib/hub";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de indicadores — HUB Tributário" },
      {
        name: "description",
        content:
          "Indicadores de gestão: mensagens sem visualização humana, tempo de resposta e produtividade por colaborador.",
      },
      { property: "og:title", content: "Painel de indicadores — HUB Tributário" },
      { property: "og:description", content: "Visão gerencial do tratamento de mensagens do e-CAC." },
    ],
  }),
  component: PainelPage,
});

type MensagemPainel = Mensagem & {
  visualizacoes: { data_visualizacao: string; perfis: { nome_completo: string } | null }[];
  acoes: { tipo_acao: string; data_acao: string; perfis: { nome_completo: string } | null }[];
};

function PainelPage() {
  const { data: sessao, isLoading: carregandoSessao } = useSessao();

  const { data: mensagens } = useQuery({
    queryKey: ["mensagens-painel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select(
          "*, visualizacoes(data_visualizacao, perfis(nome_completo)), acoes(tipo_acao, data_acao, perfis(nome_completo))",
        )
        .order("data_recebimento", { ascending: false });
      if (error) throw error;
      return data as unknown as MensagemPainel[];
    },
    enabled: Boolean(sessao?.isGestor),
  });

  const indicadores = useMemo(() => {
    const lista = mensagens ?? [];
    const semHumano = lista.filter((m) => (m.visualizacoes ?? []).length === 0);
    const porStatus = lista.reduce<Record<string, number>>((acc, m) => {
      acc[m.status_geral] = (acc[m.status_geral] ?? 0) + 1;
      return acc;
    }, {});

    const temposHoras: number[] = [];
    lista.forEach((m) => {
      const primeira = [...(m.visualizacoes ?? [])].sort(
        (a, b) => +new Date(a.data_visualizacao) - +new Date(b.data_visualizacao),
      )[0];
      if (primeira) {
        temposHoras.push(
          (+new Date(primeira.data_visualizacao) - +new Date(m.data_recebimento)) / 3_600_000,
        );
      }
    });
    const medio =
      temposHoras.length > 0 ? temposHoras.reduce((a, b) => a + b, 0) / temposHoras.length : null;

    const porColaborador = new Map<string, { acoes: number; visualizacoes: number }>();
    lista.forEach((m) => {
      m.acoes?.forEach((a) => {
        const nome = a.perfis?.nome_completo;
        if (!nome) return;
        const atual = porColaborador.get(nome) ?? { acoes: 0, visualizacoes: 0 };
        atual.acoes += 1;
        porColaborador.set(nome, atual);
      });
      m.visualizacoes?.forEach((v) => {
        const nome = v.perfis?.nome_completo;
        if (!nome) return;
        const atual = porColaborador.get(nome) ?? { acoes: 0, visualizacoes: 0 };
        atual.visualizacoes += 1;
        porColaborador.set(nome, atual);
      });
    });

    return {
      total: lista.length,
      semHumano,
      porStatus,
      medio,
      colaboradores: Array.from(porColaborador.entries()).sort((a, b) => b[1].acoes - a[1].acoes),
    };
  }, [mensagens]);

  if (carregandoSessao) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!sessao?.isGestor) {
    return (
      <div className="surface-panel mx-auto max-w-lg p-8">
        <h1 className="text-lg font-semibold">Painel restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Os indicadores de gestão são visíveis apenas para os papéis admin e coordenador.
        </p>
      </div>
    );
  }

  const percentualSemHumano =
    indicadores.total > 0 ? (indicadores.semHumano.length / indicadores.total) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Painel de indicadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Foco no risco operacional: mensagens marcadas como lidas pelo GOB que nenhum colaborador
          abriu.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao icone={<Inbox className="size-5" />} rotulo="Mensagens recebidas" valor={indicadores.total} />
        <Cartao
          icone={<EyeOff className="size-5 text-warning" />}
          rotulo="Sem visualização humana"
          valor={indicadores.semHumano.length}
        />
        <Cartao
          icone={<ShieldCheck className="size-5 text-success" />}
          rotulo="Concluídas"
          valor={indicadores.porStatus["concluida"] ?? 0}
        />
        <Cartao
          icone={<Clock className="size-5" />}
          rotulo="Tempo médio até 1ª leitura"
          valor={indicadores.medio === null ? "—" : `${indicadores.medio.toFixed(1)} h`}
        />
      </div>

      <section className="surface-panel space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cobertura de visualização humana</h2>
          <span className="text-sm text-muted-foreground">
            {(100 - percentualSemHumano).toFixed(0)}% visualizadas
          </span>
        </div>
        <Progress value={100 - percentualSemHumano} />
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(STATUS_LABEL).map(([valor, label]) => (
            <Badge key={valor} variant="outline">
              {label}: {indicadores.porStatus[valor] ?? 0}
            </Badge>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel space-y-3 p-6">
          <h2 className="text-lg font-semibold">Pendências críticas</h2>
          {indicadores.semHumano.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todas as mensagens já foram abertas por um colaborador.
            </p>
          ) : (
            <ul className="space-y-2">
              {indicadores.semHumano.slice(0, 8).map((m) => (
                <li key={m.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{m.nome_contribuinte}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{m.assunto}</p>
                  <p className="mt-1 text-xs text-warning">
                    Recebida em {formatarData(m.data_recebimento, false)}
                    {m.leitura_gob ? " · lida automaticamente pelo GOB" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel space-y-3 p-6">
          <h2 className="text-lg font-semibold">Produtividade por colaborador</h2>
          {indicadores.colaboradores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {indicadores.colaboradores.map(([nome, dados]) => (
                <li
                  key={nome}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <span className="font-medium">{nome}</span>
                  <span className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" />
                      {dados.visualizacoes}
                    </span>
                    <span>{dados.acoes} ações</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Cartao({
  icone,
  rotulo,
  valor,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string | number;
}) {
  return (
    <div className="surface-panel p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icone}
        <span className="text-xs">{rotulo}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{valor}</p>
    </div>
  );
}
