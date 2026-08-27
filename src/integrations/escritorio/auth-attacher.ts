import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "./client";

// Anexa o bearer da sessão do escritório em todas as chamadas de server function.
export const attachEscritorioAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
