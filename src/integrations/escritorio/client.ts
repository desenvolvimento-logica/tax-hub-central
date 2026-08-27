import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  ESCRITORIO_SUPABASE_ANON_KEY,
  ESCRITORIO_SUPABASE_URL,
  ESCRITORIO_STORAGE_KEY,
} from "./config";

function criarCliente() {
  return createClient<Database>(ESCRITORIO_SUPABASE_URL, ESCRITORIO_SUPABASE_ANON_KEY, {
    auth: {
      storageKey: ESCRITORIO_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

let _cliente: ReturnType<typeof criarCliente> | undefined;

// Cliente do banco do escritório (SSO Microsoft + dados do portal).
export const supabase = new Proxy({} as ReturnType<typeof criarCliente>, {
  get(_, prop, receiver) {
    if (!_cliente) _cliente = criarCliente();
    return Reflect.get(_cliente, prop, receiver);
  },
});
