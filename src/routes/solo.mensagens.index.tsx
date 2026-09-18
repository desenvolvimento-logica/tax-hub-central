import { createFileRoute } from "@tanstack/react-router";

import { ListaMensagens } from "@/routes/_authenticated/mensagens.index";

export const Route = createFileRoute("/solo/mensagens/")({
  head: () => ({
    meta: [
      { title: "Caixa Postal e-CAC" },
      {
        name: "description",
        content:
          "Caixa Postal e-CAC do escritório: mensagens sincronizadas do GOB, filtros completos e registro de primeira leitura.",
      },
      { property: "og:title", content: "Caixa Postal e-CAC" },
      {
        property: "og:description",
        content: "Mensagens do e-CAC com filtros do GOB e registro de leitura humana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ListaMensagens solo />,
});
