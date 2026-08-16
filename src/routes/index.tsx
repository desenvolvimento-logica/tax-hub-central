import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, LayoutGrid, ShieldCheck } from "lucide-react";

import lampada from "@/assets/lampada-logica.png";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conecta Tributário — Portal do Departamento Tributário" },
      {
        name: "description",
        content:
          "Porta de entrada única do departamento tributário: acesso ao PERDCOMP e ao Acompanhamento de Mensagens e-CAC (GOB) com login e permissões compartilhadas.",
      },
      { property: "og:title", content: "Conecta Tributário — Portal do Departamento Tributário" },
      {
        property: "og:description",
        content: "Login único, cards por sistema e controle de acesso por papel para o time tributário.",
      },
    ],
  }),
  component: Landing,
});

const destaques = [
  {
    icon: KeyRound,
    titulo: "Autenticação única",
    texto: "Um login para todos os sistemas do departamento, com cadastro central de colaboradores.",
  },
  {
    icon: LayoutGrid,
    titulo: "Cards por perfil",
    texto: "Cada colaborador vê apenas os sistemas liberados para o seu papel.",
  },
  {
    icon: ShieldCheck,
    titulo: "Papéis e permissões",
    texto: "Admin, coordenação e analistas com visibilidade controlada por sistema.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <div className="brand-gradient">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 text-primary-foreground md:py-28">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary-foreground/15">
              <img src={lampada} alt="Símbolo Lógica" className="size-6 object-contain" />
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
              Conecta Tributário
            </span>
          </div>

          <div className="max-w-2xl space-y-5">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Um só acesso para todos os sistemas do departamento tributário.
            </h1>
            <p className="text-lg text-primary-foreground/80">
              O Conecta Tributário autentica o colaborador, mostra os sistemas liberados para o seu perfil e
              direciona para cada aplicação — PERDCOMP, Acompanhamento de Mensagens e-CAC (GOB) e os
              próximos que vierem.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">
                  Entrar no portal
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-3">
        {destaques.map((d) => (
          <div key={d.titulo} className="surface-panel p-6">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent/10 text-accent">
              <d.icon className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{d.titulo}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
