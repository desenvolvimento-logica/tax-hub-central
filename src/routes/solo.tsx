/**
 * Camada "avulsa": as mesmas telas dos módulos, mas sem o menu do Conecta
 * Tributário — feitas para abrir/incorporar em outros sistemas do escritório.
 * O acesso continua sendo o mesmo (token do hub Luz.IA ou login do escritório).
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/escritorio/client";
import { consumirTokenDoHub, esperarSessaoDoHub } from "@/lib/sso-handoff";

export const Route = createFileRoute("/solo")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await consumirTokenDoHub();
    let { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      if (await esperarSessaoDoHub()) {
        ({ data, error } = await supabase.auth.getUser());
      }
    }
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: CascaAvulsa,
});

function CascaAvulsa() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8">
      <Outlet />
    </main>
  );
}
