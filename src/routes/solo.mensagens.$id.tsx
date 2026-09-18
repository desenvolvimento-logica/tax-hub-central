import { createFileRoute } from "@tanstack/react-router";

import { DetalheMensagem } from "@/routes/_authenticated/mensagens.$id";

export const Route = createFileRoute("/solo/mensagens/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da mensagem do e-CAC" },
      {
        name: "description",
        content:
          "Conteúdo integral da mensagem do e-CAC, histórico de visualizações e ações registradas.",
      },
      { property: "og:title", content: "Detalhe da mensagem do e-CAC" },
      { property: "og:description", content: "Tratamento e histórico de uma mensagem do e-CAC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <DetalheMensagem solo />,
});
