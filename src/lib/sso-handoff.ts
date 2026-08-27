import { supabase } from "@/integrations/escritorio/client";

// URL do hub (Luz.IA) que emite a sessão. Pode ser sobrescrita por env.
export const HUB_URL =
  (import.meta.env["VITE_HUB_URL"] as string | undefined) ?? "https://luz-ia.lovable.app";

function limparUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const p of ["access_token", "refresh_token", "sso_token", "expires_in", "token_type", "type"]) {
    url.searchParams.delete(p);
  }
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

function lerPar(fonte: URLSearchParams) {
  const access = fonte.get("access_token") ?? fonte.get("sso_token");
  const refresh = fonte.get("refresh_token");
  return access ? { access, refresh } : null;
}

/**
 * Consome um token de acesso emitido pelo hub e cria a sessão local.
 * Aceita tokens tanto no hash (#access_token=...) quanto na query (?access_token=...).
 */
export async function consumirTokenDoHub(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const doHash = window.location.hash.startsWith("#")
    ? lerPar(new URLSearchParams(window.location.hash.slice(1)))
    : null;
  const par = doHash ?? lerPar(new URLSearchParams(window.location.search));
  if (!par) return false;

  try {
    if (par.refresh) {
      const { error } = await supabase.auth.setSession({
        access_token: par.access,
        refresh_token: par.refresh,
      });
      if (error) return false;
    } else {
      // Sem refresh token só é possível validar o access token.
      const { data, error } = await supabase.auth.getUser(par.access);
      if (error || !data.user) return false;
      const { error: erroSessao } = await supabase.auth.setSession({
        access_token: par.access,
        refresh_token: par.access,
      });
      if (erroSessao) return false;
    }
    return true;
  } finally {
    limparUrl();
  }
}

/** Envia o usuário ao hub para autenticar e voltar com o token. */
export function irParaHub(destino: string) {
  const retorno = new URL("/auth", window.location.origin);
  if (destino.startsWith("/")) retorno.searchParams.set("redirect", destino);
  const url = new URL("/sso", HUB_URL);
  url.searchParams.set("redirect_uri", retorno.toString());
  window.location.assign(url.toString());
}
