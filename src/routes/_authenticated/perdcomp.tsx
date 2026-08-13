import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileStack } from "lucide-react";

import { Button } from "@/components/ui/button";

const PERDCOMP_URL = "https://perdcomp-pilot.lovable.app/painel";

export const Route = createFileRoute("/_authenticated/perdcomp")({
  head: () => ({
    meta: [
      { title: "PERDCOMP — HUB Tributário" },
      {
        name: "description",
        content:
          "Sistema PERDCOMP disponível dentro do HUB Tributário, com a mesma estrutura do painel original.",
      },
      { property: "og:title", content: "PERDCOMP — HUB Tributário" },
      {
        property: "og:description",
        content: "Painel PERDCOMP integrado ao portal do departamento tributário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perdcomp,
});

function Perdcomp() {
  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <FileStack className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">PERDCOMP</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Painel PERDCOMP exibido dentro do HUB, mantendo exatamente a estrutura original.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={PERDCOMP_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Abrir em nova aba
          </a>
        </Button>
      </header>

      <div className="surface-panel min-h-[70vh] flex-1 overflow-hidden p-0">
        <iframe
          src={PERDCOMP_URL}
          title="Sistema PERDCOMP"
          className="h-[calc(100vh-13rem)] min-h-[70vh] w-full border-0"
        />
      </div>
    </div>
  );
}
