import { createFileRoute } from "@tanstack/react-router";

import { PainelPerdcomp } from "@/routes/_authenticated/perdcomp.index";

export const Route = createFileRoute("/solo/perdcomp")({
  head: () => ({
    meta: [
      { title: "PERDCOMP" },
      {
        name: "description",
        content:
          "Painel PERDCOMP: acompanhamento das declarações, prazos e situações das compensações.",
      },
      { property: "og:title", content: "PERDCOMP" },
      { property: "og:description", content: "Painel de acompanhamento das declarações PERDCOMP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PainelPerdcomp,
});
