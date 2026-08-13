import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Download,
  FileSearch,
  Filter,
  RefreshCw,
  Search,
  UserSearch,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  extrairResponsaveis,
  listarDeclaracoes,
  sincronizarPerdcomp,
  type Acompanhamento,
  type Declaracao,
} from "@/lib/perdcomp.functions";
import {
  dataCurta,
  diasRestantes,
  documento,
  emAnalise,
  moeda,
  tomSituacao,
} from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/perdcomp/")({
  head: () => ({
    meta: [
      { title: "PERDCOMP — HUB Tributário" },
      {
        name: "description",
        content:
          "Acompanhamento das declarações PERDCOMP: situação, auditoria, prazos e ordens de serviço.",
      },
      { property: "og:title", content: "PERDCOMP — HUB Tributário" },
      {
        property: "og:description",
        content: "Painel interno de acompanhamento das declarações PERDCOMP do e-CAC.",
      },
    ],
  }),
  component: PainelPerdcomp,
});

const POR_PAGINA = 20;

type Aba = "todas" | "acompanhamento" | "analise" | "prazos" | "auditoria" | "terceiros";

function prazosDe(a: Acompanhamento | undefined) {
  if (!a) return [] as { rotulo: string; prazo: string }[];
  const lista: { rotulo: string; prazo: string }[] = [];
  if (a.aviso_pagamento && a.aviso_pagamento_prazo)
    lista.push({ rotulo: "Aviso de pagamento", prazo: a.aviso_pagamento_prazo });
  if (a.compensacao_oficio && a.compensacao_oficio_prazo)
    lista.push({ rotulo: "Compensação de ofício", prazo: a.compensacao_oficio_prazo });
  if (a.intimacao && a.intimacao_prazo)
    lista.push({ rotulo: "Intimação", prazo: a.intimacao_prazo });
  return lista;
}

function menorPrazo(a: Acompanhamento | undefined): number | null {
  const dias = prazosDe(a)
    .map((p) => diasRestantes(p.prazo))
    .filter((d): d is number => d !== null);
  return dias.length ? Math.min(...dias) : null;
}

function PainelPerdcomp() {
  const queryClient = useQueryClient();
  const carregar = useServerFn(listarDeclaracoes);
  const sincronizar = useServerFn(sincronizarPerdcomp);
  const lerResponsaveis = useServerFn(extrairResponsaveis);

  const { data, isLoading } = useQuery({
    queryKey: ["perdcomp", "declaracoes"],
    queryFn: () => carregar(),
  });

  const [aba, setAba] = useState<Aba>("todas");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("todas");
  const [os, setOs] = useState("todas");
  const [responsavel, setResponsavel] = useState("todos");
  const [pagina, setPagina] = useState(0);

  const declaracoes = data?.declaracoes ?? [];
  const acompanhamentos = useMemo(
    () => new Map((data?.acompanhamentos ?? []).map((a) => [a.declaracao_id, a])),
    [data],
  );
  const achadosPorDeclaracao = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of data?.achados ?? []) {
      if (a.revisado) continue;
      mapa.set(a.declaracao_id, (mapa.get(a.declaracao_id) ?? 0) + 1);
    }
    return mapa;
  }, [data]);

  const situacoes = useMemo(
    () => [...new Set(declaracoes.map((d) => d.situacao).filter(Boolean))].sort() as string[],
    [declaracoes],
  );
  const responsaveis = useMemo(
    () =>
      [...new Set(declaracoes.map((d) => d.responsavel_nome).filter(Boolean))].sort() as string[],
    [declaracoes],
  );

  const kpis = useMemo(() => {
    const proprias = declaracoes.filter((d) => !acompanhamentos.get(d.id)?.terceiro);
    return {
      acompanhamento: proprias.length,
      analise: proprias.filter((d) => emAnalise(d.situacao)).length,
      prazos: proprias.filter((d) => {
        const dias = menorPrazo(acompanhamentos.get(d.id));
        return dias !== null && dias <= 7;
      }).length,
      auditoria: proprias.filter((d) => (achadosPorDeclaracao.get(d.id) ?? 0) > 0).length,
      semOs: proprias.filter((d) => !acompanhamentos.get(d.id)?.ordem_servico?.trim()).length,
    };
  }, [declaracoes, acompanhamentos, achadosPorDeclaracao]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");

    return declaracoes.filter((d) => {
      const a = acompanhamentos.get(d.id);
      const pendencias = achadosPorDeclaracao.get(d.id) ?? 0;
      const dias = menorPrazo(a);

      if (aba === "acompanhamento" && a?.terceiro) return false;
      if (aba === "analise" && !emAnalise(d.situacao)) return false;
      if (aba === "prazos" && !(dias !== null && dias <= 7)) return false;
      if (aba === "auditoria" && pendencias === 0) return false;
      if (aba === "terceiros" && !a?.terceiro) return false;

      if (situacao !== "todas" && d.situacao !== situacao) return false;
      if (os === "com" && !a?.ordem_servico?.trim()) return false;
      if (os === "sem" && a?.ordem_servico?.trim()) return false;
      if (responsavel !== "todos" && d.responsavel_nome !== responsavel) return false;

      if (!termo) return true;
      const alvo = [d.numero_perdcomp, d.cnpj, d.razao_social, d.nome, d.numero_recibo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo) || (digitos.length >= 3 && alvo.replace(/\D/g, "").includes(digitos));
    });
  }, [declaracoes, acompanhamentos, achadosPorDeclaracao, aba, busca, situacao, os, responsavel]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = filtradas.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);

  const sync = useMutation({
    mutationFn: () => sincronizar(),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.erro ?? "Falha na sincronização.");
        return;
      }
      toast.success(
        `Sincronização concluída: ${r.novas} novas, ${r.atualizadas} atualizadas, ${r.alertas} alertas.`,
      );
      queryClient.invalidateQueries({ queryKey: ["perdcomp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const responsaveisLote = useMutation({
    mutationFn: () => lerResponsaveis({ data: { limite: 150 } }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.erro ?? "Falha na leitura dos PDFs.");
        return;
      }
      toast.success(`${r.processadas} PDFs lidos · ${r.encontrados} responsáveis identificados.`);
      queryClient.invalidateQueries({ queryKey: ["perdcomp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportarCsv() {
    const colunas: (keyof Declaracao)[] = [
      "numero_perdcomp",
      "numero_recibo",
      "cnpj",
      "razao_social",
      "tipo_documento",
      "tipo_credito",
      "grupo_tributo",
      "codigo_receita",
      "periodo_apuracao",
      "situacao",
      "data_transmissao",
      "valor_total_credito",
      "valor_utilizado",
      "saldo_restante",
      "credito_atualizado",
      "total_debitos",
      "processo_administrativo",
      "processo_judicial",
      "processo_habilitacao",
      "responsavel_nome",
      "responsavel_cpf",
      "responsavel_crc",
      "responsavel_email",
      "ultima_sincronizacao",
    ];
    const extras = [
      "ordem_servico",
      "terceiro",
      "aviso_pagamento_prazo",
      "compensacao_oficio_prazo",
      "intimacao_prazo",
      "encerrado",
      "pendencias_auditoria",
    ];
    const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const linhas = [
      [...colunas, ...extras].join(";"),
      ...filtradas.map((d) => {
        const a = acompanhamentos.get(d.id);
        return [
          ...colunas.map((c) => escapar(d[c])),
          escapar(a?.ordem_servico ?? ""),
          escapar(a?.terceiro ? "Sim" : "Não"),
          escapar(a?.aviso_pagamento_prazo ?? ""),
          escapar(a?.compensacao_oficio_prazo ?? ""),
          escapar(a?.intimacao_prazo ?? ""),
          escapar(a?.encerrado ? "Sim" : "Não"),
          escapar(achadosPorDeclaracao.get(d.id) ?? 0),
        ].join(";");
      }),
    ].join("\n");

    const url = URL.createObjectURL(new Blob([`\ufeff${linhas}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `perdcomp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">PERDCOMP</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento das declarações espelhadas do GOB — auditoria, prazos e pós-processamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={!filtradas.length}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => responsaveisLote.mutate()}
            disabled={responsaveisLote.isPending}
          >
            <UserSearch className="size-4" />
            {responsaveisLote.isPending ? "Lendo PDFs..." : "Ler responsáveis"}
          </Button>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
            <RefreshCw className={sync.isPending ? "size-4 animate-spin" : "size-4"} />
            {sync.isPending ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { rotulo: "Em acompanhamento", valor: kpis.acompanhamento },
          { rotulo: "Em análise", valor: kpis.analise },
          { rotulo: "Prazos vencendo", valor: kpis.prazos, tom: "text-warning" },
          { rotulo: "Pendência na auditoria", valor: kpis.auditoria, tom: "text-destructive" },
          { rotulo: "Sem ordem de serviço", valor: kpis.semOs },
        ].map((k) => (
          <div key={k.rotulo} className="surface-panel p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{k.rotulo}</p>
            <p className={`mt-2 font-display text-2xl font-semibold ${k.tom ?? ""}`}>{k.valor}</p>
          </div>
        ))}
      </section>

      <Tabs value={aba} onValueChange={(v) => { setAba(v as Aba); setPagina(0); }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="acompanhamento">Em acompanhamento</TabsTrigger>
          <TabsTrigger value="analise">Em análise</TabsTrigger>
          <TabsTrigger value="prazos">Prazos</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="terceiros">Terceiros</TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="surface-panel grid gap-4 p-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <Search className="size-3.5" /> Busca
          </Label>
          <Input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(0); }}
            placeholder="Número do PERDCOMP, CNPJ ou razão social"
          />
        </div>
        <div>
          <Label className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <Filter className="size-3.5" /> Situação
          </Label>
          <Select value={situacao} onValueChange={(v) => { setSituacao(v); setPagina(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {situacoes.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Ordem de serviço
          </Label>
          <Select value={os} onValueChange={(v) => { setOs(v); setPagina(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="com">Com O.S.</SelectItem>
              <SelectItem value="sem">Sem O.S.</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Responsável pelo preenchimento
          </Label>
          <Select value={responsavel} onValueChange={(v) => { setResponsavel(v); setPagina(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº PERDCOMP</TableHead>
              <TableHead>Contribuinte</TableHead>
              <TableHead>Tributo / competência</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Transmissão</TableHead>
              <TableHead className="text-right">Saldo restante</TableHead>
              <TableHead>O.S. / prazos</TableHead>
              <TableHead className="text-right">Apontamentos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando declarações...
                </TableCell>
              </TableRow>
            ) : !visiveis.length ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma declaração encontrada. Use “Sincronizar” para buscar no GOB.
                </TableCell>
              </TableRow>
            ) : (
              visiveis.map((d) => {
                const a = acompanhamentos.get(d.id);
                const pendencias = achadosPorDeclaracao.get(d.id) ?? 0;
                const dias = menorPrazo(a);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/perdcomp/$id"
                        params={{ id: d.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {d.numero_perdcomp ?? d.nome ?? "—"}
                      </Link>
                      {d.numero_recibo ? (
                        <p className="text-muted-foreground">Recibo {d.numero_recibo}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-sm">{d.razao_social ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{documento(d.cnpj)}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{d.grupo_tributo || d.codigo_receita || d.tipo_credito || "—"}</p>
                      <p className="text-xs text-muted-foreground">{d.periodo_apuracao ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tomSituacao(d.situacao)}>
                        {d.situacao ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{dataCurta(d.data_transmissao)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {moeda(d.saldo_restante)}
                    </TableCell>
                    <TableCell className="space-y-1">
                      {a?.ordem_servico?.trim() ? (
                        <Badge variant="secondary">O.S. {a.ordem_servico}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-warning/30 bg-warning/15 text-warning">
                          Sem O.S.
                        </Badge>
                      )}
                      {a?.terceiro ? <Badge variant="outline">Terceiro</Badge> : null}
                      {dias !== null ? (
                        <Badge
                          variant="outline"
                          className={
                            dias < 0
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : dias <= 7
                                ? "border-warning/30 bg-warning/15 text-warning"
                                : ""
                          }
                        >
                          {dias < 0 ? `Vencido há ${Math.abs(dias)}d` : `Vence em ${dias}d`}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {pendencias ? (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                          <AlertTriangle className="size-3" /> {pendencias}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <FileSearch className="mr-1 inline size-4" />
          {filtradas.length} declaração(ões) · página {paginaAtual + 1} de {totalPaginas}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={paginaAtual === 0}
            onClick={() => setPagina(paginaAtual - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={paginaAtual + 1 >= totalPaginas}
            onClick={() => setPagina(paginaAtual + 1)}
          >
            Próxima
          </Button>
        </div>
      </footer>
    </div>
  );
}
