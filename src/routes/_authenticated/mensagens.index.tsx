import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, RefreshCw, Search, Star } from "lucide-react";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/escritorio/client";
import { formatarData, type Mensagem } from "@/lib/hub";
import {
  PERIODO_OPCOES,
  SIM_NAO_OPCOES,
  TAGS_GOB,
  TRIAGEM_LABEL,
  triagemEfetiva,
  dentroDoPeriodo,
  leituraEfetiva,
} from "@/lib/gob";
import { sincronizarGob } from "@/lib/gob.functions";

export const Route = createFileRoute("/_authenticated/mensagens/")({
  head: () => ({
    meta: [
      { title: "Caixa Postal e-CAC — Conecta Tributário" },
      {
        name: "description",
        content:
          "Caixa Postal e-CAC replicada do GOB: mesmos campos e filtros, com primeira leitura pendente até a visualização de um colaborador.",
      },
      { property: "og:title", content: "Caixa Postal e-CAC — Conecta Tributário" },
      {
        property: "og:description",
        content: "Mensagens do e-CAC sincronizadas do GOB, com registro de leitura humana.",
      },
    ],
  }),
  component: ListaMensagens,
});

type MensagemComRelacoes = Mensagem & {
  visualizacoes: {
    colaborador_id: string;
    data_visualizacao: string;
    perfis: { nome_completo: string } | null;
  }[];
  acoes: { tipo_acao: string; data_acao: string; perfis: { nome_completo: string } | null }[];
};

export function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "nova") return "default";
  if (status === "concluida") return "secondary";
  return "outline";
}

const TODOS = "todos";

function simNao(valor: string, alvo: boolean): boolean {
  if (valor === TODOS) return true;
  return valor === "sim" ? alvo : !alvo;
}

function ListaMensagens() {
  const queryClient = useQueryClient();
  const sincronizar = useServerFn(sincronizarGob);

  const [tipo, setTipo] = useState(TODOS);
  const [ni, setNi] = useState("");
  const [ativo, setAtivo] = useState(TODOS);
  const [lida, setLida] = useState(TODOS);
  const [arquivada, setArquivada] = useState(TODOS);
  const [assunto, setAssunto] = useState("");
  const [remetente, setRemetente] = useState(TODOS);
  const [importante, setImportante] = useState(TODOS);
  const [enviadaEm, setEnviadaEm] = useState("sempre");
  const [enviadaDe, setEnviadaDe] = useState("");
  const [enviadaAte, setEnviadaAte] = useState("");
  const [exibicao, setExibicao] = useState("sempre");
  const [exibicaoDe, setExibicaoDe] = useState("");
  const [exibicaoAte, setExibicaoAte] = useState("");
  const [triagem, setTriagem] = useState(TODOS);
  const [tag, setTag] = useState(TODOS);
  const [organizacao, setOrganizacao] = useState(TODOS);
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

  const { data: ultimaSync } = useQuery({
    queryKey: ["sincronizacoes-gob"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sincronizacoes_gob")
        .select("*")
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const executarSync = useMutation({
    mutationFn: () => sincronizar({}),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error("Falha na sincronização com o GOB", { description: r.erro });
      } else {
        toast.success(
          `Sincronização concluída: ${r.novas} nova(s) e ${r.atualizadas} atualizada(s)`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
      queryClient.invalidateQueries({ queryKey: ["sincronizacoes-gob"] });
    },
    onError: (e: Error) => toast.error("Erro ao sincronizar", { description: e.message }),
  });




  const opcoes = useMemo(() => {
    const lista = mensagens ?? [];
    const unicos = (fn: (m: MensagemComRelacoes) => string | null) =>
      Array.from(new Set(lista.map(fn).filter((v): v is string => Boolean(v)))).sort();
    return {
      tipos: unicos((m) => m.tipo ?? null),
      remetentes: unicos((m) => m.remetente ?? m.orgao),
      organizacoes: unicos((m) => m.organizacao ?? null),
      tags: Array.from(new Set([...TAGS_GOB, ...unicos((m) => m.tag ?? null)])).sort(),
    };
  }, [mensagens]);

  const filtradas = useMemo(() => {
    return (mensagens ?? []).filter((m) => {
      const leituraHumana = leituraEfetiva(m, m.visualizacoes);
      if (tipo !== TODOS && (m.tipo ?? "") !== tipo) return false;
      if (ni && !`${m.ni ?? ""} ${m.cnpj_contribuinte} ${m.nome_contribuinte}`.toLowerCase().includes(ni.toLowerCase()))
        return false;
      if (!simNao(ativo, m.ativo)) return false;
      // "Lida" no Conecta Tributário = leitura efetiva por um colaborador, não a leitura do GOB.
      if (!simNao(lida, Boolean(leituraHumana))) return false;
      if (!simNao(arquivada, m.arquivada)) return false;
      if (assunto && !m.assunto.toLowerCase().includes(assunto.toLowerCase())) return false;
      if (remetente !== TODOS && (m.remetente ?? m.orgao) !== remetente) return false;
      if (!simNao(importante, m.importante)) return false;
      if (!dentroDoPeriodo(m.data_recebimento, enviadaEm, enviadaDe, enviadaAte)) return false;
      if (!dentroDoPeriodo(m.exibicao_ate, exibicao, exibicaoDe, exibicaoAte)) return false;
      if (triagem !== TODOS && triagemEfetiva(m, m.visualizacoes) !== triagem) return false;
      if (tag !== TODOS && (m.tag ?? "") !== tag) return false;
      if (organizacao !== TODOS && (m.organizacao ?? "") !== organizacao) return false;
      if (busca) {
        const alvo = `${m.protocolo} ${m.nome_contribuinte} ${m.cnpj_contribuinte} ${m.assunto}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [
    mensagens,
    tipo,
    ni,
    ativo,
    lida,
    arquivada,
    assunto,
    remetente,
    importante,
    enviadaEm,
    enviadaDe,
    enviadaAte,
    exibicao,
    exibicaoDe,
    exibicaoAte,
    triagem,
    tag,
    organizacao,
    busca,
  ]);

  function limpar() {
    setTipo(TODOS);
    setNi("");
    setAtivo(TODOS);
    setLida(TODOS);
    setArquivada(TODOS);
    setAssunto("");
    setRemetente(TODOS);
    setImportante(TODOS);
    setEnviadaEm("sempre");
    setEnviadaDe("");
    setEnviadaAte("");
    setExibicao("sempre");
    setExibicaoDe("");
    setExibicaoAte("");
    setTriagem(TODOS);
    setTag(TODOS);
    setOrganizacao(TODOS);
    setBusca("");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Caixa Postal e-CAC</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Mesmos campos e filtros do GOB. A <strong>primeira leitura</strong> permanece pendente
            mesmo quando o GOB informa leitura no e-CAC — ela só é registrada quando um colaborador
            abre a mensagem aqui, com nome, data e hora.
          </p>
        </div>
        <div className="text-right">
          <Button onClick={() => executarSync.mutate()} disabled={executarSync.isPending}>
            <RefreshCw className={executarSync.isPending ? "size-4 animate-spin" : "size-4"} />
            Sincronizar com o GOB
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {ultimaSync
              ? `Última sincronização: ${formatarData(ultimaSync.iniciado_em)} · ${ultimaSync.situacao}`
              : "Nenhuma sincronização executada"}
          </p>
        </div>
      </header>

      <div className="surface-panel mb-5 space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por protocolo, contribuinte, NI ou assunto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {opcoes.tipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">NI / Nome</Label>
            <Input value={ni} onChange={(e) => setNi(e.target.value)} placeholder="CNPJ ou nome" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ativa?</Label>
            <Select value={ativo} onValueChange={setAtivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIM_NAO_OPCOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Lida</Label>
            <Select value={lida} onValueChange={setLida}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIM_NAO_OPCOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Arquivada</Label>
            <Select value={arquivada} onValueChange={setArquivada}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIM_NAO_OPCOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assunto</Label>
            <Input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Contém…"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Remetente</Label>
            <Select value={remetente} onValueChange={setRemetente}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {opcoes.remetentes.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Importante</Label>
            <Select value={importante} onValueChange={setImportante}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIM_NAO_OPCOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Enviada em</Label>
            <Select value={enviadaEm} onValueChange={setEnviadaEm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODO_OPCOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {enviadaEm === "entre" && (
              <div className="flex gap-2">
                <Input type="date" value={enviadaDe} onChange={(e) => setEnviadaDe(e.target.value)} />
                <Input
                  type="date"
                  value={enviadaAte}
                  onChange={(e) => setEnviadaAte(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Exibição até</Label>
            <Select value={exibicao} onValueChange={setExibicao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODO_OPCOES.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {exibicao === "entre" && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={exibicaoDe}
                  onChange={(e) => setExibicaoDe(e.target.value)}
                />
                <Input
                  type="date"
                  value={exibicaoAte}
                  onChange={(e) => setExibicaoAte(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Triagem</Label>
            <Select value={triagem} onValueChange={setTriagem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {Object.entries(TRIAGEM_LABEL).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tag</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {opcoes.tags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Organização</Label>
            <Select value={organizacao} onValueChange={setOrganizacao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                {opcoes.organizacoes.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
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
              <TableHead>Remetente</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>NI / Nome</TableHead>
              <TableHead>Enviada em</TableHead>
              <TableHead>Primeira leitura</TableHead>
              <TableHead>Exibição até</TableHead>
              <TableHead>Triagem</TableHead>
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
              const leitura = leituraEfetiva(m, m.visualizacoes);
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1.5">
                      {m.importante && <Star className="size-3.5 fill-warning text-warning" />}
                      {m.remetente ?? m.orgao}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <Link
                      to="/mensagens/$id"
                      params={{ id: m.id }}
                      className="line-clamp-2 text-sm font-medium hover:underline"
                    >
                      {m.assunto}
                    </Link>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {m.protocolo}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{m.tipo ?? "—"}</TableCell>
                  <TableCell>
                    <span className="block text-sm font-medium">{m.nome_contribuinte}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.ni ?? m.cnpj_contribuinte}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{formatarData(m.data_recebimento)}</TableCell>
                  <TableCell>
                    {leitura ? (
                      <span className="inline-flex flex-col text-xs text-success">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3.5" /> {leitura.quem}
                        </span>
                        <span className="text-muted-foreground">
                          {formatarData(leitura.quando)} ·{" "}
                          {leitura.origem === "portal" ? "portal" : "GOB"}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex flex-col text-xs text-warning">
                        <span className="inline-flex items-center gap-1">
                          <EyeOff className="size-3.5" /> Pendente
                        </span>
                        {m.data_leitura_gob && (
                          <span className="text-muted-foreground">
                            e-CAC: {formatarData(m.data_leitura_gob)}
                          </span>
                        )}

                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatarData(m.exibicao_ate, false)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={triagemEfetiva(m, m.visualizacoes) === "concluido" ? "secondary" : "outline"}>
                      {TRIAGEM_LABEL[triagemEfetiva(m, m.visualizacoes)] ??
                        triagemEfetiva(m, m.visualizacoes)}
                    </Badge>
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
