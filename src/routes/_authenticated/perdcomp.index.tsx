/**
 * PERDCOMP — retoma o sistema já existente (painel externo) dentro do HUB,
 * sem exigir novo acesso do colaborador.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

const PAINEL_URL = "https://perdcomp-pilot.lovable.app/painel";

export const Route = createFileRoute("/_authenticated/perdcomp/")({
  head: () => ({
    meta: [
      { title: "PERDCOMP — Conecta Tributário" },
      {
        name: "description",
        content:
          "Painel PERDCOMP disponível dentro do Conecta Tributário: acompanhamento das declarações, prazos e situações.",
      },
      { property: "og:title", content: "PERDCOMP — Conecta Tributário" },
      {
        property: "og:description",
        content: "Painel de acompanhamento das declarações PERDCOMP dentro do Conecta Tributário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PainelPerdcomp,
});

function PainelPerdcomp() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">PERDCOMP</h1>
          <p className="text-sm text-muted-foreground">
            Painel de acompanhamento das declarações PERDCOMP, exibido aqui dentro do HUB.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={PAINEL_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 size-4" /> Abrir em nova aba
          </a>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border bg-card">
        <iframe
          src={PAINEL_URL}
          title="Painel PERDCOMP"
          className="size-full"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
