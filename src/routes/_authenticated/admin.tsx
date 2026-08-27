import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/escritorio/client";
import { useSessao, type Papel, type Perfil, type Sistema } from "@/lib/hub";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Conecta Tributário" },
      {
        name: "description",
        content: "Cadastro de sistemas, colaboradores, papéis e regras de visibilidade do Conecta Tributário.",
      },
      { property: "og:title", content: "Administração — Conecta Tributário" },
      { property: "og:description", content: "Gestão de sistemas, usuários e papéis do departamento." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: sessao, isLoading } = useSessao();

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!sessao?.isGestor) {
    return (
      <div className="surface-panel mx-auto max-w-lg p-8">
        <h1 className="text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A área administrativa está disponível apenas para os papéis admin e coordenador.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Administração</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistemas do Conecta Tributário, colaboradores, papéis e visibilidade.
        </p>
      </header>

      <Tabs defaultValue="sistemas">
        <TabsList>
          <TabsTrigger value="sistemas">Sistemas</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="papeis">Papéis</TabsTrigger>
        </TabsList>
        <TabsContent value="sistemas" className="pt-4">
          <AbaSistemas isAdmin={sessao.isAdmin} />
        </TabsContent>
        <TabsContent value="usuarios" className="pt-4">
          <AbaUsuarios />
        </TabsContent>
        <TabsContent value="papeis" className="pt-4">
          <AbaPapeis isAdmin={sessao.isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function usePapeis() {
  return useQuery({
    queryKey: ["papeis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("papeis").select("*").order("nome");
      if (error) throw error;
      return data as Papel[];
    },
  });
}

type SistemaComPapeis = Sistema & { sistema_papeis: { papel_id: string }[] };

function AbaSistemas({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: papeis } = usePapeis();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<SistemaComPapeis | null>(null);

  const { data: sistemas } = useQuery({
    queryKey: ["sistemas-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sistemas")
        .select("*, sistema_papeis(papel_id)")
        .order("ordem");
      if (error) throw error;
      return data as SistemaComPapeis[];
    },
  });

  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    url: "",
    icone: "LayoutGrid",
    ativo: true,
    ordem: 0,
    papeis: [] as string[],
  });

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", descricao: "", url: "", icone: "LayoutGrid", ativo: true, ordem: 0, papeis: [] });
    setAberto(true);
  }

  function abrirEdicao(s: SistemaComPapeis) {
    setEditando(s);
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? "",
      url: s.url,
      icone: s.icone,
      ativo: s.ativo,
      ordem: s.ordem,
      papeis: (s.sistema_papeis ?? []).map((sp) => sp.papel_id),
    });
    setAberto(true);
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        url: form.url,
        icone: form.icone,
        ativo: form.ativo,
        ordem: Number(form.ordem) || 0,
      };
      let sistemaId = editando?.id;
      if (editando) {
        const { error } = await supabase.from("sistemas").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sistemas").insert(payload).select("id").single();
        if (error) throw error;
        sistemaId = data.id;
      }
      if (!sistemaId) return;
      await supabase.from("sistema_papeis").delete().eq("sistema_id", sistemaId);
      if (form.papeis.length > 0) {
        const { error } = await supabase
          .from("sistema_papeis")
          .insert(form.papeis.map((papel_id) => ({ sistema_id: sistemaId!, papel_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setAberto(false);
      toast.success("Sistema salvo");
      queryClient.invalidateQueries({ queryKey: ["sistemas-admin"] });
      queryClient.invalidateQueries({ queryKey: ["sistemas-visiveis"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sistemas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sistema removido");
      queryClient.invalidateQueries({ queryKey: ["sistemas-admin"] });
      queryClient.invalidateQueries({ queryKey: ["sistemas-visiveis"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  return (
    <div className="surface-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sistemas cadastrados</h2>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button onClick={abrirNovo}>
              <Plus className="size-4" />
              Novo sistema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar sistema" : "Novo sistema"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://… ou /mensagens"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Input
                    placeholder="FileStack, MailCheck, LayoutGrid"
                    value={form.icone}
                    onChange={(e) => setForm({ ...form, icone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="ativo"
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label htmlFor="ativo">Sistema ativo</Label>
              </div>
              <div className="space-y-2">
                <Label>Papéis que enxergam este sistema</Label>
                <div className="space-y-2">
                  {(papeis ?? []).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.papeis.includes(p.id)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            papeis: v
                              ? [...form.papeis, p.id]
                              : form.papeis.filter((id) => id !== p.id),
                          })
                        }
                      />
                      <span className="capitalize">{p.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => salvar.mutate()} disabled={!form.nome || !form.url || salvar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ordem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sistemas ?? []).map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.ordem}</TableCell>
              <TableCell className="font-medium">{s.nome}</TableCell>
              <TableCell className="max-w-[220px] truncate text-muted-foreground">{s.url}</TableCell>
              <TableCell>
                <Badge variant={s.ativo ? "secondary" : "outline"}>
                  {s.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(s)}>
                  <Pencil className="size-4" />
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => remover.mutate(s.id)}>
                    Excluir
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type PerfilComPapeis = Perfil & { perfil_papeis: { papel_id: string }[] };

function AbaUsuarios() {
  const queryClient = useQueryClient();
  const { data: papeis } = usePapeis();

  const { data: perfis } = useQuery({
    queryKey: ["perfis-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("*, perfil_papeis(papel_id)")
        .order("nome_completo");
      if (error) throw error;
      return data as PerfilComPapeis[];
    },
  });

  const alternarPapel = useMutation({
    mutationFn: async (args: { perfilId: string; papelId: string; ativar: boolean }) => {
      if (args.ativar) {
        const { error } = await supabase
          .from("perfil_papeis")
          .insert({ perfil_id: args.perfilId, papel_id: args.papelId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("perfil_papeis")
          .delete()
          .eq("perfil_id", args.perfilId)
          .eq("papel_id", args.papelId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-admin"] });
      queryClient.invalidateQueries({ queryKey: ["sessao"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar papéis", { description: e.message }),
  });

  const alternarAtivo = useMutation({
    mutationFn: async (args: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("perfis").update({ ativo: args.ativo }).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["perfis-admin"] }),
    onError: (e: Error) => toast.error("Erro ao atualizar colaborador", { description: e.message }),
  });

  return (
    <div className="surface-panel p-5">
      <h2 className="mb-4 text-lg font-semibold">Colaboradores</h2>
      <div className="space-y-3">
        {(perfis ?? []).map((p) => (
          <div key={p.id} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{p.nome_completo}</p>
                <p className="text-xs text-muted-foreground">
                  {p.email}
                  {p.cargo ? ` · ${p.cargo}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`ativo-${p.id}`} className="text-xs text-muted-foreground">
                  Ativo
                </Label>
                <Switch
                  id={`ativo-${p.id}`}
                  checked={p.ativo}
                  onCheckedChange={(v) => alternarAtivo.mutate({ id: p.id, ativo: v })}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {(papeis ?? []).map((papel) => {
                const marcado = (p.perfil_papeis ?? []).some((pp) => pp.papel_id === papel.id);
                return (
                  <label key={papel.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={(v) =>
                        alternarPapel.mutate({
                          perfilId: p.id,
                          papelId: papel.id,
                          ativar: Boolean(v),
                        })
                      }
                    />
                    <span className="capitalize">{papel.nome}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AbaPapeis({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: papeis } = usePapeis();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("papeis").insert({ nome, descricao });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      setDescricao("");
      toast.success("Papel criado");
      queryClient.invalidateQueries({ queryKey: ["papeis"] });
    },
    onError: (e: Error) => toast.error("Erro ao criar papel", { description: e.message }),
  });

  return (
    <div className="surface-panel space-y-5 p-5">
      <h2 className="text-lg font-semibold">Papéis</h2>
      <div className="space-y-2">
        {(papeis ?? []).map((p) => (
          <div key={p.id} className="rounded-md border border-border p-3">
            <p className="font-medium capitalize">{p.nome}</p>
            <p className="text-xs text-muted-foreground">{p.descricao}</p>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Novo papel</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nome (ex: revisor)" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => criar.mutate()} disabled={!nome || criar.isPending}>
            Criar papel
          </Button>
          <p className="text-xs text-muted-foreground">
            Após criar, defina em <strong>Sistemas</strong> quais sistemas o novo papel enxerga.
          </p>
        </div>
      )}
    </div>
  );
}
