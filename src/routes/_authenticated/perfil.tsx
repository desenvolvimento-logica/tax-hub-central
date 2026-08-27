import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/escritorio/client";
import { useSessao, sessaoQueryKey, formatarData } from "@/lib/hub";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Conecta Tributário" },
      { name: "description", content: "Dados do colaborador, papéis atribuídos e troca de senha." },
      { property: "og:title", content: "Meu perfil — Conecta Tributário" },
      { property: "og:description", content: "Gerencie seus dados de acesso ao Conecta Tributário." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { data: sessao } = useSessao();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    if (sessao) {
      setNome(sessao.perfil.nome_completo);
      setCargo(sessao.perfil.cargo ?? "");
    }
  }, [sessao]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!sessao) return;
      const { error } = await supabase
        .from("perfis")
        .update({ nome_completo: nome, cargo })
        .eq("id", sessao.perfil.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados atualizados");
      queryClient.invalidateQueries({ queryKey: sessaoQueryKey });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const trocarSenha = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovaSenha("");
      toast.success("Senha atualizada");
    },
    onError: (e: Error) => toast.error("Erro ao trocar senha", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Colaborador desde {formatarData(sessao?.perfil.criado_em, false)}
        </p>
      </header>

      <section className="surface-panel space-y-4 p-6">
        <h2 className="text-lg font-semibold">Dados básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>E-mail</Label>
            <Input value={sessao?.email ?? ""} disabled />
          </div>
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          Salvar alterações
        </Button>
      </section>

      <section className="surface-panel space-y-3 p-6">
        <h2 className="text-lg font-semibold">Papéis atribuídos</h2>
        {(sessao?.papeis ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum papel atribuído. Solicite liberação ao administrador do Conecta Tributário.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sessao?.papeis.map((p) => (
              <Badge key={p} variant="secondary" className="capitalize">
                {p}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section className="surface-panel space-y-2 p-6">
        <h2 className="text-lg font-semibold">Acesso</h2>
        <p className="text-sm text-muted-foreground">
          O acesso a este portal é feito pelo SSO Microsoft do escritório. A senha é gerenciada na
          sua conta corporativa — não há troca de senha aqui.
        </p>
      </section>

    </div>
  );
}
