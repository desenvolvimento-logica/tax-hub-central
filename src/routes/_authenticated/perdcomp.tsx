import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileStack,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarPerdcomp, type ItemPerdcomp } from "@/lib/gob.functions";
import { formatarData } from "@/lib/hub";

export const Route = createFileRoute("/_authenticated/perdcomp")({
  head: () => ({
    meta: [
      { title: "PERDCOMP — HUB Tributário" },
      {
        name: "description",
        content:
          "Painel PERDCOMP dentro do HUB Tributário: pedidos de restituição e compensação com valores, situação e datas, sem login adicional.",
      },
      { property: "og:title", content: "PERDCOMP — HUB Tributário" },
      {
        property: "og:description",
        content: "Acompanhe os PER/DCOMP do escritório direto no portal, sem abrir outra aba.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perdcomp,
});

const TODOS = "__todos__";

const SITUACOES = [
  "Em análise",
  "Deferido",
  "Deferido parcialmente",
  "Indeferido",
  "Homologado",
  "Homologado parcialmente",
  "Não homologado",
  "Cancelado",
  "Processamento suspenso",
];

const TIPOS_DOCUMENTO = ["Decl. Compensação", "Ped. Restituição", "Ped. Ressarcimento"];

function moeda(valor: number | null) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cnpjFmt(v: string | null) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return v;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function perdcompFmt(v: string | null) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 24) return v;
  return `${d.slice(0, 5)}.${d.slice(5, 10)}.${d.slice(10, 16)}.${d.slice(16, 17)}.${d.slice(17, 21)}.${d.slice(21)}`;
}

function toneSituacao(situacao: string | null) {
  const s = (situacao ?? "").toLowerCase();
  if (s.includes("cancel") || s.includes("indefer") || s.includes("não homolog")) return "danger";
  if (s.includes("parcial") || s.includes("suspens") || s.includes("análise")) return "warning";
  if (s.includes("defer") || s.includes("homolog")) return "success";
  return "neutral";
}

function BadgeSituacao({ item }: { item: ItemPerdcomp }) {
  const tone = toneSituacao(item.situacao);
  const classe =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : tone === "danger"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={classe} title={item.ajudaSituacao ?? undefined}>
      {item.situacao ?? "—"}
    </Badge>
  );
}

function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="break-words text-sm">{valor && valor.trim() ? valor : "—"}</p>
    </div>
  );
}

function Perdcomp() {
  const buscar = useServerFn(listarPerdcomp);
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState(TODOS);
  const [tipoDocumento, setTipoDocumento] = useState(TODOS);
  const [pagina, setPagina] = useState(0);
  const [selecionado, setSelecionado] = useState<ItemPerdcomp | null>(null);
  const porPagina = 25;

  const filtros = {
    busca,
    situacao: situacao === TODOS ? "" : situacao,
    tipoDocumento: tipoDocumento === TODOS ? "" : tipoDocumento,
    pagina,
    porPagina,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["perdcomp", filtros],
    queryFn: () => buscar({ data: filtros }),
    staleTime: 60_000,
  });

  const itens = useMemo(() => data?.itens ?? [], [data]);
  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(0, Math.ceil(total / porPagina) - 1);

  const resumo = useMemo(() => {
    const credito = itens.reduce((acc, i) => acc + (i.valorTotalCredito ?? 0), 0);
    const debitos = itens.reduce((acc, i) => acc + (i.totalDebitos ?? 0), 0);
    const analise = itens.filter((i) => (i.situacao ?? "").toLowerCase().includes("análise")).length;
    return { credito, debitos, analise };
  }, [itens]);

  function exportarCsv() {
    const cabecalho = [
      "Empresa",
      "CNPJ",
      "Nº PER/DCOMP",
      "Documento",
      "Crédito",
      "Apuração",
      "Transmissão",
      "Crédito total",
      "Débitos",
      "Situação",
    ];
    const linhas = itens.map((i) => [
      i.accountName ?? i.nome,
      cnpjFmt(i.cnpj),
      i.numeroPerdcomp ?? "",
      i.tipoDocumento ?? "",
      i.tipoCredito ?? "",
      i.periodoApuracao ?? "",
      formatarData(i.dataTransmissao, false),
      String(i.valorTotalCredito ?? ""),
      String(i.totalDebitos ?? ""),
      i.situacao ?? "",
    ]);
    const csv = [cabecalho, ...linhas]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `perdcomp-pagina-${pagina + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <FileStack className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">PERDCOMP</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Consultas de restituição e compensação integradas ao HUB Tributário — mesmo acesso do
              portal, sem login à parte.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarCsv} disabled={!itens.length}>
            <Download className="size-4" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Atualizar
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Documentos" valor={total.toLocaleString("pt-BR")} detalhe="Total no GOB" />
        <Kpi rotulo="Crédito (página)" valor={moeda(resumo.credito)} />
        <Kpi rotulo="Débitos compensados (página)" valor={moeda(resumo.debitos)} />
        <Kpi
          rotulo="Em análise (página)"
          valor={resumo.analise.toLocaleString("pt-BR")}
          detalhe={`de ${itens.length} exibidos`}
        />
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPagina(0);
          setBusca(termo.trim());
        }}
      >
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por empresa, CNPJ ou nº do PER/DCOMP…"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
        <Select
          value={situacao}
          onValueChange={(v) => {
            setPagina(0);
            setSituacao(v);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as situações</SelectItem>
            {SITUACOES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tipoDocumento}
          onValueChange={(v) => {
            setPagina(0);
            setTipoDocumento(v);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tipo de documento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os documentos</SelectItem>
            {TIPOS_DOCUMENTO.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {data?.erro && (
        <div className="surface-panel flex items-start gap-3 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-warning" />
          <p className="text-muted-foreground">{data.erro}</p>
        </div>
      )}

      <div className="surface-panel overflow-x-auto p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : itens.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground">
            Nenhum PER/DCOMP encontrado para os critérios informados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Nº PER/DCOMP</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead>Apuração</TableHead>
                <TableHead>Transmissão</TableHead>
                <TableHead className="text-right">Crédito total</TableHead>
                <TableHead className="text-right">Débitos</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => setSelecionado(item)}
                >
                  <TableCell className="max-w-64 text-sm">
                    <span className="block truncate font-medium">
                      {item.accountName ?? item.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">{cnpjFmt(item.cnpj)}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {perdcompFmt(item.numeroPerdcomp)}
                  </TableCell>
                  <TableCell className="text-sm">{item.tipoDocumento ?? "—"}</TableCell>
                  <TableCell className="text-sm">{item.tipoCredito ?? "—"}</TableCell>
                  <TableCell className="text-sm">{item.periodoApuracao ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {formatarData(item.dataTransmissao, false)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {moeda(item.valorTotalCredito)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {moeda(item.totalDebitos)}
                  </TableCell>
                  <TableCell>
                    <BadgeSituacao item={item} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {total
            ? `Exibindo ${pagina * porPagina + 1}–${pagina * porPagina + itens.length} de ${total.toLocaleString("pt-BR")} registros`
            : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina === 0 || isFetching}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {pagina + 1} de {ultimaPagina + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= ultimaPagina || isFetching}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Sheet open={Boolean(selecionado)} onOpenChange={(v) => !v && setSelecionado(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selecionado ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-base leading-snug">{selecionado.nome}</SheetTitle>
                <SheetDescription>
                  {selecionado.accountName ?? "—"} · {cnpjFmt(selecionado.cnpj)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-8">
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeSituacao item={selecionado} />
                  {selecionado.retificador ? <Badge variant="secondary">Retificador</Badge> : null}
                  {selecionado.original ? <Badge variant="secondary">Original</Badge> : null}
                  {selecionado.ultimoRegistro ? (
                    <Badge variant="secondary">Último registro</Badge>
                  ) : null}
                </div>
                {selecionado.ajudaSituacao ? (
                  <p className="text-sm text-muted-foreground">{selecionado.ajudaSituacao}</p>
                ) : null}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <Campo rotulo="Nº PER/DCOMP" valor={perdcompFmt(selecionado.numeroPerdcomp)} />
                  <Campo rotulo="Tipo de documento" valor={selecionado.tipoDocumento} />
                  <Campo rotulo="Tipo de crédito" valor={selecionado.tipoCredito} />
                  <Campo rotulo="Período de apuração" valor={selecionado.periodoApuracao} />
                  <Campo
                    rotulo="Data de transmissão"
                    valor={formatarData(selecionado.dataTransmissao, true)}
                  />
                  <Campo
                    rotulo="Transmissão"
                    valor={selecionado.transmissaoViaDesktop ? "Desktop" : "PER/DCOMP Web"}
                  />
                  <Campo rotulo="Nº do recibo" valor={selecionado.numeroRecibo} />
                  <Campo
                    rotulo="Última consulta no e-CAC"
                    valor={formatarData(selecionado.dataConsulta, true)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <Campo rotulo="Crédito total" valor={moeda(selecionado.valorTotalCredito)} />
                  <Campo rotulo="Débitos compensados" valor={moeda(selecionado.totalDebitos)} />
                  <Campo rotulo="Crédito atualizado" valor={moeda(selecionado.creditoAtualizado)} />
                  <Campo
                    rotulo="Crédito original na entrega"
                    valor={moeda(selecionado.creditoOriginalDataEntrega)}
                  />
                  <Campo
                    rotulo="Saldo do crédito original"
                    valor={moeda(selecionado.saldoCreditoOriginal)}
                  />
                  <Campo rotulo="Selic acumulada" valor={moeda(selecionado.selicAcumulada)} />
                  <Campo
                    rotulo="Crédito utilizado"
                    valor={moeda(selecionado.totalCreditoOriginalUtilizado)}
                  />
                  <Campo
                    rotulo="Pedido de restituição"
                    valor={moeda(selecionado.valorPedidoRestituicao)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <Campo rotulo="Detentor do crédito" valor={cnpjFmt(selecionado.detentorCredito)} />
                  <Campo
                    rotulo="Identificação do crédito"
                    valor={selecionado.tipoIdentificacaoCreditoDescricao}
                  />
                  <Campo
                    rotulo="PER/DCOMP inicial"
                    valor={perdcompFmt(selecionado.numeroPerdcompInicial)}
                  />
                  <Campo
                    rotulo="PER/DCOMP relacionado"
                    valor={perdcompFmt(selecionado.numeroPerdcompRelacionado)}
                  />
                  <Campo
                    rotulo="PER/DCOMP retificado"
                    valor={perdcompFmt(selecionado.numeroPerdcompRetificado)}
                  />
                  <Campo
                    rotulo="PER/DCOMP cancelado"
                    valor={perdcompFmt(selecionado.numeroPerdcompCancelado)}
                  />
                  <Campo
                    rotulo="Processo administrativo"
                    valor={selecionado.processoAdministrativo}
                  />
                  <Campo rotulo="Processo de habilitação" valor={selecionado.processoHabilitacao} />
                  <Campo rotulo="Processo judicial" valor={selecionado.processoJudicial} />
                  <Campo rotulo="Documento" valor={selecionado.arquivoDocumentoName} />
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
