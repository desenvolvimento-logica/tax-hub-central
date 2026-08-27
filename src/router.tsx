import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { instalarListenerDoHub } from "./lib/sso-handoff";

// Listener da sessão do hub (Luz.IA) instalado antes de qualquer rota/redirect.
instalarListenerDoHub();


export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
