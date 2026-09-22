import { supabase } from "@/integrations/escritorio/client";

// URL do hub (Luz.IA) que emite a sessão. Pode ser sobrescrita por env.
export const HUB_URL =
  (import.meta.env["VITE_HUB_URL"] as string | undefined) ??
  "https://hub-ivory-eta.vercel.app";

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

// --- Handoff via postMessage (app embarcado no hub) -------------------------

let instalado = false;
let sessaoRecebida = false;
const aguardandoSessao = new Set<() => void>();

type MensagemSessao = {
  type?: string;
  access_token?: string;
  refresh_token?: string;
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
  data?: {
    session?: {
      access_token?: string;
      refresh_token?: string;
    };
  };
};

function extrairSessao(dados: MensagemSessao | undefined) {
  if (!dados) return null;
  const sessao = dados.session ?? dados.data?.session ?? dados;
  if (!sessao.access_token || !sessao.refresh_token) return null;
  return {
    access_token: sessao.access_token,
    refresh_token: sessao.refresh_token,
  };
}

function solicitarSessaoAoHub() {
  if (typeof window === "undefined") return;
  // A solicitação não contém dados sensíveis. A resposta só é aceita da
  // janela pai/abertura e os tokens ainda são validados pelo Supabase.
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "LUZIA_SESSION_REQUEST" }, "*");
  }
  if (window.opener && window.opener !== window) {
    window.opener.postMessage({ type: "LUZIA_SESSION_REQUEST" }, "*");
  }
}

/**
 * Instala o listener de sessão do hub o mais cedo possível (antes de qualquer
 * redirecionamento de autenticação). Idempotente.
 */
export function instalarListenerDoHub() {
  if (typeof window === "undefined" || instalado) return;
  instalado = true;

  window.addEventListener("message", (event: MessageEvent) => {
    const veioDaJanelaDoHub =
      event.source === window.parent || event.source === window.opener;
    if (!veioDaJanelaDoHub) return;

    const dados = event.data as MensagemSessao | undefined;
    const sessao = extrairSessao(dados);
    if (!sessao) return;

    void supabase.auth
      .setSession(sessao)
      .then(({ error }) => {
        if (error) return;
        sessaoRecebida = true;
        for (const concluir of aguardandoSessao) concluir();
        aguardandoSessao.clear();
      });
  });

  // Avisa o hub que já estamos prontos para receber a sessão.
  try {
    solicitarSessaoAoHub();
  } catch {
    // origem bloqueada — o hub pode enviar a sessão espontaneamente.
  }
}

/** Aguarda (com timeout curto) a sessão chegar por postMessage do hub. */
export async function esperarSessaoDoHub(ms = 5000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!(window.parent && window.parent !== window) && !window.opener) return false;
  if (sessaoRecebida) return true;

  solicitarSessaoAoHub();
  return await new Promise<boolean>((resolve) => {
    let concluido = false;
    const concluir = () => {
      if (concluido) return;
      concluido = true;
      clearTimeout(timeout);
      aguardandoSessao.delete(concluir);
      resolve(true);
    };
    aguardandoSessao.add(concluir);
    const timeout = window.setTimeout(() => {
      if (concluido) return;
      concluido = true;
      aguardandoSessao.delete(concluir);
      resolve(false);
    }, ms);
  });
}
