import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ESCRITORIO_SUPABASE_URL } from "./config";

function criarAdmin() {
  const serviceRole = process.env["ESCRITORIO_SUPABASE_SERVICE_ROLE_KEY"];
  if (!serviceRole) {
    throw new Error(
      "ESCRITORIO_SUPABASE_SERVICE_ROLE_KEY não configurada. Cadastre o segredo do projeto Supabase do escritório.",
    );
  }
  return createClient<Database>(ESCRITORIO_SUPABASE_URL, serviceRole, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _admin: ReturnType<typeof criarAdmin> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof criarAdmin>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = criarAdmin();
    return Reflect.get(_admin, prop, receiver);
  },
});
