import { createFileRoute } from "@tanstack/react-router";

import { BoasVindas } from "@/routes/_authenticated/boas-vindas";

export const Route = createFileRoute("/solo/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Comunicado de boas-vindas" },
      {
        name: "description",
        content:
          "Gerador do comunicado de boas-vindas: informe o nome da empresa e do colaborador responsável e salve em PDF.",
      },
      { property: "og:title", content: "Comunicado de boas-vindas" },
      {
        property: "og:description",
        content: "Comunicado personalizado com nome da empresa e colaborador responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoasVindas,
});
