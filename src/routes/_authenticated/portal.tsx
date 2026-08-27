import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ExternalLink, FileStack, LayoutGrid, MailCheck, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/escritorio/client";
import { useSessao, type Sistema } from "@/lib/hub";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Portal de sistemas — Conecta Tributário" },
      {
        name: "description",
        content: "Sistemas do departamento tributário liberados para o seu perfil de acesso.",
      },
      { property: "og:title", content: "Portal de sistemas — Conecta Tributário" },
      { property: "og:description", content: "Acesse PERDCOMP e e-CAC/GOB a partir de um único portal." },
    ],
  }),
  component: Portal,
});

const ICONES: Record<string, LucideIcon> = {
  FileStack,
  MailCheck,
  LayoutGrid,
  Sparkles,
  ClipboardList,
};


// Sistemas espelhados dentro do portal não devem abrir em aba externa.
const ROTAS_INTERNAS: Record<string, string> = {
  "perdcomp-pilot.lovable.app": "/perdcomp",
};

function rotaInterna(url: string): string {
  if (url.startsWith("/")) return url;
  try {
    const host = new URL(url).hostname;
    return ROTAS_INTERNAS[host] ?? url;
  } catch {
    return url;
  }
}

function Portal() {
  const { data: sessao } = useSessao();

  const { data: sistemas, isLoading } = useQuery({
    queryKey: ["sistemas-visiveis", sessao?.papeis],
    enabled: Boolean(sessao),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sistemas")
        .select("*, sistema_papeis(papel_id, papeis(nome))")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      const papeis = sessao?.papeis ?? [];
      return (data ?? []).filter((s) => {
        const permitidos = (s.sistema_papeis ?? [])
          .map((sp) => (sp.papeis as { nome: string } | null)?.nome)
          .filter(Boolean) as string[];
        return permitidos.some((p) => papeis.includes(p));
      }) as (Sistema & { sistema_papeis: unknown })[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">
          Olá, {sessao?.perfil.nome_completo?.split(" ")[0] ?? "colaborador"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estes são os sistemas disponíveis para o seu perfil de acesso.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : (sistemas ?? []).length === 0 ? (
        <div className="surface-panel flex flex-col items-start gap-3 p-8">
          <span className="flex size-10 items-center justify-center rounded-md bg-warning/15 text-warning">
            <ShieldAlert className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">Nenhum sistema liberado</h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Seu usuário ainda não possui papel com acesso a sistemas. Entre em contato com o
            administrador do Conecta Tributário para liberar o acesso.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {(sistemas ?? []).map((sistema) => {
            const Icone = ICONES[sistema.icone] ?? LayoutGrid;
            const url = rotaInterna(sistema.url);
            const interno = url.startsWith("/");
            return (
              <article key={sistema.id} className="surface-panel flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Icone className="size-5" />
                  </span>
                  <Badge variant={interno ? "secondary" : "outline"}>
                    {interno ? "Neste portal" : "Sistema externo"}
                  </Badge>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{sistema.nome}</h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{sistema.descricao}</p>
                <div className="mt-5">
                  {interno ? (
                    <Button asChild>
                      <Link to={url as "/mensagens"}>Acessar</Link>
                    </Button>
                  ) : (
                    <Button asChild>
                      <a href={url} target="_blank" rel="noreferrer">
                        Acessar
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
