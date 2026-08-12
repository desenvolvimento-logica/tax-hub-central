import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileStack, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listarPerdcomp } from "@/lib/gob.functions";

export const Route = createFileRoute("/_authenticated/perdcomp")({
  head: () => ({
    meta: [
      { title: "PERDCOMP — HUB Tributário" },
      {
        name: "description",
        content:
          "Consulte pedidos de restituição e compensação (PER/DCOMP) direto no HUB Tributário, com situação, créditos e débitos.",
      },
      { property: "og:title", content: "PERDCOMP — HUB Tributário" },
      {
        property: "og:description",
        content: "Controle de PER/DCOMP integrado ao portal do departamento tributário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perdcomp,
});

const moeda = (v: number | null) =>
  v === null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const dataHora = (v: string | null) => {
  if (!v) return "—";
  const d = new Date(v.replace(" ", "T"));
  return Number.isNaN(+d) ? v : d.toLocaleString("pt-BR");
};

function Perdcomp() {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const buscar = useServerFn(listarPerdcomp);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["perdcomp", termo],
    queryFn: () => buscar({ data: { busca: termo } }),
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <FileStack className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">PERDCOMP</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedidos de restituição e compensação exibidos direto no portal
              {data?.total ? ` — ${data.total.toLocaleString("pt-BR")} registros` : ""}.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTermo(busca);
        }}
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição do PER/DCOMP"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isFetching}>
          Buscar
        </Button>
      </form>

      {data?.erro ? (
        <p className="surface-panel p-4 text-sm text-destructive">{data.erro}</p>
      ) : null}

      <div className="surface-panel overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Contribuinte</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Nº PER/DCOMP</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Crédito</th>
              <th className="px-3 py-2">Período</th>
              <th className="px-3 py-2">Transmissão</th>
              <th className="px-3 py-2 text-right">Valor crédito</th>
              <th className="px-3 py-2 text-right">Débitos</th>
              <th className="px-3 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && !data ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Carregando dados do GOB…
                </td>
              </tr>
            ) : null}
            {data?.itens.map((p) => (
              <tr key={p.id} className="border-t border-border/60 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{p.accountName ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.cnpj ?? "—"}</div>
                </td>
                <td className="px-3 py-2 max-w-[280px]">{p.nome}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.numeroPerdcomp ?? "—"}</td>
                <td className="px-3 py-2">{p.tipoDocumento ?? "—"}</td>
                <td className="px-3 py-2">{p.tipoCredito ?? "—"}</td>
                <td className="px-3 py-2">{p.periodoApuracao ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{dataHora(p.dataTransmissao)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {moeda(p.valorTotalCredito)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(p.totalDebitos)}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" title={p.ajudaSituacao ?? undefined}>
                    {p.situacao ?? "—"}
                  </Badge>
                </td>
              </tr>
            ))}
            {data && !data.itens.length && !isFetching ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum PER/DCOMP encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
