import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AlertTriangle, FileStack, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarPerdcomp } from "@/lib/gob.functions";
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

function moeda(valor: number | null) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Perdcomp() {
  const buscar = useServerFn(listarPerdcomp);
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["perdcomp", busca],
    queryFn: () => buscar({ data: { busca } }),
    staleTime: 60_000,
  });

  const itens = useMemo(() => data?.itens ?? [], [data]);

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
              Pedidos de restituição e compensação exibidos dentro do HUB, sem login separado.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
          Atualizar
        </Button>
      </header>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setBusca(termo.trim());
        }}
      >
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por empresa, número do PER/DCOMP…"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
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
                <TableRow key={item.id}>
                  <TableCell className="max-w-64 text-sm">
                    <span className="block truncate font-medium">
                      {item.accountName ?? item.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.cnpj ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm">{item.numeroPerdcomp ?? "—"}</TableCell>
                  <TableCell className="text-sm">{item.tipoDocumento ?? "—"}</TableCell>
                  <TableCell className="text-sm">{item.tipoCredito ?? "—"}</TableCell>
                  <TableCell className="text-sm">{item.periodoApuracao ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {formatarData(item.dataTransmissao, false)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {moeda(item.valorTotalCredito)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{moeda(item.totalDebitos)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" title={item.ajudaSituacao ?? undefined}>
                      {item.situacao ?? "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data?.total ? (
        <p className="text-xs text-muted-foreground">
          Exibindo {itens.length} de {data.total} registros.
        </p>
      ) : null}
    </div>
  );
}
