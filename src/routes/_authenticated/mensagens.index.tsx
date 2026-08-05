import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, formatarData, type Mensagem } from "@/lib/hub";

export const Route = createFileRoute("/_authenticated/mensagens/")({
  head: () => ({
    meta: [
      { title: "Mensagens e-CAC — HUB Tributário" },
      {
        name: "description",
        content:
          "Acompanhamento das mensagens recebidas no e-CAC via API GOB, com leitura automática e visualização humana separadas.",
      },
      { property: "og:title", content: "Mensagens e-CAC — HUB Tributário" },
      {
        property: "og:description",
        content: "Lista, filtros e tratamento das mensagens do e-CAC integradas ao GOB.",
      },
    ],
  }),
  component: ListaMensagens,
});

type MensagemComRelacoes = Mensagem & {
  visualizacoes: { colaborador_id: string; data_visualizacao: string; perfis: { nome_completo: string } | null }[];
  acoes: { tipo_acao: string; data_acao: string; perfis: { nome_completo: string } | null }[];
};

export function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "nova") return "default";
  if (status === "concluida") return "secondary";
  return "outline";
}

function ListaMensagens() {
  const [status, setStatus] = useState("todos");
  const [orgao, setOrgao] = useState("todos");
  const [periodo, setPeriodo] = useState("todos");
  const [humano, setHumano] = useState("todos");
  const [colaborador, setColaborador] = useState("todos");
  const [busca, setBusca] = useState("");

  const { data: mensagens, isLoading } = useQuery({
    queryKey: ["mensagens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select(
          "*, visualizacoes(colaborador_id, data_visualizacao, perfis(nome_completo)), acoes(tipo_acao, data_acao, perfis(nome_completo))",
        )
        .order("data_recebimento", { ascending: false });
      if (error) throw error;
      return data as unknown as MensagemComRelacoes[];
    },
  });

  const orgaos = useMemo(
    () => Array.from(new Set((mensagens ?? []).map((m) => m.orgao))).sort(),
    [mensagens],
  );

  const colaboradores = useMemo(() => {
    const nomes = new Set<string>();
    (mensagens ?? []).forEach((m) => {
      m.acoes?.forEach((a) => a.perfis?.nome_completo && nomes.add(a.perfis.nome_completo));
      m.visualizacoes?.forEach((v) => v.perfis?.nome_completo && nomes.add(v.perfis.nome_completo));
    });
    return Array.from(nomes).sort();
  }, [mensagens]);

  const filtradas = useMemo(() => {
    const limite =
      periodo === "todos"
        ? null
        : new Date(Date.now() - Number(periodo) * 24 * 60 * 60 * 1000);
    return (mensagens ?? []).filter((m) => {
      if (status !== "todos" && m.status_geral !== status) return false;
      if (orgao !== "todos" && m.orgao !== orgao) return false;
      if (limite && new Date(m.data_recebimento) < limite) return false;
      const visto = (m.visualizacoes ?? []).length > 0;
      if (humano === "sim" && !visto) return false;
      if (humano === "nao" && visto) return false;
      if (colaborador !== "todos") {
        const envolvidos = [
          ...(m.acoes ?? []).map((a) => a.perfis?.nome_completo),
          ...(m.visualizacoes ?? []).map((v) => v.perfis?.nome_completo),
        ];
        if (!envolvidos.includes(colaborador)) return false;
      }
      if (busca) {
        const alvo = `${m.protocolo} ${m.nome_contribuinte} ${m.cnpj_contribuinte} ${m.assunto}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [mensagens, status, orgao, periodo, humano, colaborador, busca]);

  function limpar() {
    setStatus("todos");
    setOrgao("todos");
    setPeriodo("todos");
    setHumano("todos");
    setColaborador("todos");
    setBusca("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Mensagens e-CAC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mensagens sincronizadas do e-CAC via GOB. A leitura automática do GOB e a visualização por
          um colaborador são indicadores independentes.
        </p>
      </header>

      <div className="surface-panel mb-5 space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por protocolo, contribuinte, CNPJ ou assunto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Órgão</Label>
            <Select value={orgao} onValueChange={setOrgao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {orgaos.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Recebimento</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer data</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Visualizada por humano</Label>
            <Select value={humano} onValueChange={setHumano}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Colaborador</Label>
            <Select value={colaborador} onValueChange={setColaborador}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtradas.length} de {(mensagens ?? []).length} mensagens
          </p>
          <Button variant="ghost" size="sm" onClick={limpar}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Contribuinte</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Recebimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Humano</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  Carregando mensagens…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  Nenhuma mensagem encontrada com os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((m) => {
              const visto = (m.visualizacoes ?? []).length > 0;
              const ultimaAcao = [...(m.acoes ?? [])].sort(
                (a, b) => +new Date(b.data_acao) - +new Date(a.data_acao),
              )[0];
              return (
                <TableRow key={m.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs">
                    <Link to="/mensagens/$id" params={{ id: m.id }} className="hover:underline">
                      {m.protocolo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to="/mensagens/$id" params={{ id: m.id }} className="block">
                      <span className="font-medium">{m.nome_contribuinte}</span>
                      <span className="block text-xs text-muted-foreground">{m.cnpj_contribuinte}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{m.orgao}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <Link to="/mensagens/$id" params={{ id: m.id }} className="line-clamp-2 text-sm hover:underline">
                      {m.assunto}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{formatarData(m.data_recebimento, false)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(m.status_geral)}>
                      {STATUS_LABEL[m.status_geral] ?? m.status_geral}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {visto ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <Eye className="size-4" /> Sim
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <EyeOff className="size-4" /> Não
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ultimaAcao?.perfis?.nome_completo ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
