import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ESCRITORIO_SUPABASE_ANON_KEY, ESCRITORIO_SUPABASE_URL } from "./config";

// Valida o bearer emitido pelo Supabase do escritório e devolve um cliente com RLS do usuário.
export const requireEscritorioAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: sessão não encontrada");
    }

    const token = authHeader.slice("Bearer ".length);
    if (token.split(".").length !== 3) {
      throw new Error("Unauthorized: token inválido");
    }

    const supabase = createClient<Database>(
      ESCRITORIO_SUPABASE_URL,
      ESCRITORIO_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      },
    );

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new Error("Unauthorized: token inválido");
    }

    return next({
      context: { supabase, userId: data.user.id, claims: data.user },
    });
  },
);
