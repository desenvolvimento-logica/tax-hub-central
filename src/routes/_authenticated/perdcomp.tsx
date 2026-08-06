import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileStack } from "lucide-react";

import { Button } from "@/components/ui/button";

const PERDCOMP_URL = "https://perdcomp-pilot.lovable.app/";

export const Route = createFileRoute("/_authenticated/perdcomp")({
  head: () => ({
    meta: [
      { title: "PERDCOMP — HUB Tributário" },
      {
        name: "description",
        content:
          "Sistema PERDCOMP de controle de pedidos de restituição e compensação, disponível dentro do HUB Tributário.",
      },
      { property: "og:title", content: "PERDCOMP — HUB Tributário" },
      {
        property: "og:description",
        content: "Controle de PER/DCOMP integrado ao portal do departamento tributário.",
      },
    ],
  }),
  component: Perdcomp,
});

function Perdcomp() {
  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <FileStack className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">PERDCOMP</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sistema exibido dentro do portal, com a mesma estrutura original.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={PERDCOMP_URL} target="_blank" rel="noreferrer">
            Abrir em nova aba
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </header>

      <div className="surface-panel flex-1 overflow-hidden p-0">
        <iframe
          src={PERDCOMP_URL}
          title="Sistema PERDCOMP"
          className="size-full border-0"
          allow="clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}
