import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";

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
import { supabase } from "@/integrations/supabase/client";
import { formatarData, useSessao } from "@/lib/hub";
import {
  STATUS_LEVANTAMENTO_LABEL,
  moeda,
  normalizarDados,
  totalGeral,
  type StatusLevantamento,
} from "@/lib/diagnostico";

export const Route = createFileRoute("/_authenticated/diagnostico/")({
  head: () => ({
    meta: [
      { title: "Levantamento de Débitos — HUB Tributário" },
      {
        name: "description",
        content:
          "Levantamentos de débitos Federal, Estadual, Municipal e FGTS: anexe os relatórios, revise o que o sistema extraiu e gere o diagnóstico final em PDF.",
      },
      { property: "og:title", content: "Levantamento de Débitos — HUB Tributário" },
      {
        property: "og:description",
        content: "Histórico de levantamentos de débitos por cliente, CNPJ e data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListaLevantamentos,
});

function ListaLevantamentos() {
  const { data: sessao } = useSessao();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | StatusLevantamento>("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { data: levantamentos, isLoading } = useQuery({
    queryKey: ["diagnosticos"],
    enabled: Boolean(sessao),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnosticos")
        .select("id, empresa, cnpj, responsavel, data_levantamento, status, criado_em, dados")
        .order("criado_em", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const somenteDigitos = termo.replace(/\D/g, "");
    return (levantamentos ?? []).filter((item) => {
      if (status !== "todos" && item.status !== status) return false;
      if (de && item.data_levantamento < de) return false;
      if (ate && item.data_levantamento > ate) return false;
      if (!termo) return true;
      const cnpj = (item.cnpj ?? "").replace(/\D/g, "");
      return (
        item.empresa.toLowerCase().includes(termo) ||
        (somenteDigitos.length >= 3 && cnpj.includes(somenteDigitos))
      );
    });
  }, [levantamentos, busca, status, de, ate]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Levantamento de Débitos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Anexe os relatórios e certidões dos âmbitos Federal, Estadual, Municipal e FGTS. O
            sistema extrai as informações, você revisa e o diagnóstico final é gerado em PDF para
            envio ao cliente.
          </p>
        </div>
        <Button asChild>
          <Link to="/diagnostico/$id" params={{ id: "novo" }}>
            <Plus className="size-4" />
            Novo levantamento
          </Link>
        </Button>
      </header>

      <section className="surface-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="busca">Cliente ou CNPJ</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="busca"
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Razão social ou CNPJ"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Situação</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="de">Data de</Label>
          <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ate">Data até</Label>
          <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </section>

      <section className="surface-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">CNPJ</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Responsável</th>
              <th className="px-4 py-3 text-right">Total apurado</th>
              <th className="px-4 py-3 text-left">Situação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando levantamentos…
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum levantamento encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filtrados.map((item) => {
                const total = totalGeral(normalizarDados(item.dados));
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{item.empresa}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.cnpj ?? "—"}</td>
                    <td className="px-4 py-3">{formatarData(item.data_levantamento, false)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.responsavel ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{moeda(total)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === "concluido" ? "default" : "outline"}>
                        {STATUS_LEVANTAMENTO_LABEL[item.status as StatusLevantamento] ??
                          item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/diagnostico/$id" params={{ id: item.id }}>
                          <FileText className="size-4" />
                          Abrir
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
