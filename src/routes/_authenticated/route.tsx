import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import lampada from "@/assets/lampada-logica.png";
import {
  FileStack,
  LayoutGrid,
  LogOut,
  MailCheck,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSessao, iniciais } from "@/lib/hub";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AppShell,
});

const NAV = [
  { to: "/portal", label: "Portal", icon: LayoutGrid, admin: false },
  { to: "/perdcomp", label: "PERDCOMP", icon: FileStack, admin: false },
  { to: "/mensagens", label: "Caixa Postal e-CAC", icon: MailCheck, admin: false },
  { to: "/boas-vindas", label: "Comunicado boas-vindas", icon: Sparkles, admin: false },
  { to: "/admin", label: "Administração", icon: Settings2, admin: true },
  { to: "/perfil", label: "Meu perfil", icon: UserRound, admin: false },
] as const;


function AppShell() {
  const { data: sessao } = useSessao();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/portal" className="flex items-center gap-3 px-5 py-6">
          <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <img src={lampada} alt="Símbolo Lógica" className="size-5 object-contain" />
          </span>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.16em]">
            Conecta Tributário
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.filter((item) => !item.admin || sessao?.isAdmin).map((item) => {
            const ativo = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
              {iniciais(sessao?.perfil.nome_completo ?? "?")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{sessao?.perfil.nome_completo}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {sessao?.papeis.join(", ") || "sem papel"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={sair}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3 md:hidden">
          <Link to="/portal" className="font-display text-sm font-semibold uppercase tracking-[0.14em]">
            Conecta Tributário
          </Link>
          <Button variant="ghost" size="sm" onClick={sair}>
            <LogOut className="size-4" />
          </Button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {NAV.filter((item) => !item.admin || sessao?.isAdmin).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-5 py-8 md:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
