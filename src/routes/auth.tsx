import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import lampada from "@/assets/lampada-logica.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/escritorio/client";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Conecta Tributário" },
      {
        name: "description",
        content:
          "Acesse o portal do departamento tributário com a conta Microsoft corporativa do escritório.",
      },
      { property: "og:title", content: "Entrar — Conecta Tributário" },
      { property: "og:description", content: "Login único do departamento tributário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const destino = redirect && redirect.startsWith("/") ? redirect : "/portal";

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) navigate({ to: destino, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: destino, replace: true });
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, destino]);

  async function entrarComMicrosoft() {
    setCarregando(true);
    const retorno = new URL("/auth", window.location.origin);
    if (redirect && redirect.startsWith("/")) retorno.searchParams.set("redirect", redirect);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: retorno.toString(),
        scopes: "openid profile email offline_access",
      },
    });

    if (error) {
      setCarregando(false);
      toast.error("Falha no login Microsoft", { description: error.message });
    }
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
            O acesso é feito com a conta Microsoft do escritório (SSO). Não há cadastro de senha
            neste portal.
          </p>

          <Button className="mt-8 w-full" onClick={entrarComMicrosoft} disabled={carregando}>
            {carregando && <Loader2 className="size-4 animate-spin" />}
            Entrar com Microsoft
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            No primeiro acesso, seu perfil é criado automaticamente com nome e e-mail corporativos.
            A liberação de papéis é feita por um administrador.
          </p>
        </div>
      </div>
    </main>
  );
}
