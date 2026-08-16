import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import lampada from "@/assets/lampada-logica.png.asset.json";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Conecta Tributário" },
      {
        name: "description",
        content: "Acesse o portal do departamento tributário com e-mail e senha ou conta Google corporativa.",
      },
      { property: "og:title", content: "Entrar — Conecta Tributário" },
      { property: "og:description", content: "Login único do departamento tributário." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const destino = redirect && redirect.startsWith("/") ? redirect : "/portal";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ to: destino });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome_completo: nome, cargo },
      },
    });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (data.session) {
      navigate({ to: destino });
      return;
    }
    toast.success("Conta criada", {
      description: "Confirme o e-mail enviado para concluir o primeiro acesso.",
    });
  }

  async function entrarComGoogle() {
    setCarregando(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setCarregando(false);
      toast.error("Falha no login com Google", { description: String(result.error) });
      return;
    }
    if (result.redirected) return;
    setCarregando(false);
    navigate({ to: destino });
  }

  async function recuperarSenha() {
    if (!email) {
      toast.error("Informe o e-mail para receber o link de redefinição.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Não foi possível enviar o link", { description: error.message });
      return;
    }
    toast.success("Link enviado", { description: "Verifique sua caixa de entrada." });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="brand-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary-foreground/15">
            <img src={lampada.url} alt="Símbolo Lógica" className="size-6 object-contain" />
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
            Conecta Tributário
          </span>
        </Link>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Bem-vindo ao Portal do Departamento Tributário
          </h1>
          <p className="text-primary-foreground/80">
            Um ambiente centralizado para facilitar o acesso aos sistemas, ferramentas e informações
            que fazem parte da nossa rotina.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Acesso restrito a colaboradores.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold">Acessar o portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use suas credenciais corporativas para continuar.
          </p>

          <Tabs defaultValue="entrar" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={entrar} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando && <Loader2 className="size-4 animate-spin" />}
                  Entrar
                </Button>
                <button
                  type="button"
                  onClick={recuperarSenha}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </form>
            </TabsContent>

            <TabsContent value="criar">
              <form onSubmit={cadastrar} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    placeholder="Analista, Coordenador…"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-novo">E-mail corporativo</Label>
                  <Input
                    id="email-novo"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-nova">Senha</Label>
                  <Input
                    id="senha-nova"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando && <Loader2 className="size-4 animate-spin" />}
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={entrarComGoogle} disabled={carregando}>
            Continuar com Google
          </Button>
        </div>
      </div>
    </main>
  );
}
