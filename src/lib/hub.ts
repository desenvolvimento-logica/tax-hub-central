import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/escritorio/client";
import type { Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfis">;
export type Papel = Tables<"papeis">;
export type Sistema = Tables<"sistemas">;
export type Mensagem = Tables<"mensagens">;
export type Acao = Tables<"acoes">;
export type Visualizacao = Tables<"visualizacoes">;

export type Sessao = {
  userId: string;
  email: string;
  perfil: Perfil;
  papeis: string[];
  isAdmin: boolean;
  isGestor: boolean;
};

export const sessaoQueryKey = ["sessao"] as const;

export async function carregarSessao(): Promise<Sessao | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: existente } = await supabase
    .from("perfis")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let perfil = existente;
  if (!perfil) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { data: novo, error } = await supabase
      .from("perfis")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
        nome_completo:
          (typeof metadata["nome_completo"] === "string" ? metadata["nome_completo"] : null) ??
          (typeof metadata["full_name"] === "string" ? metadata["full_name"] : null) ??
          (typeof metadata["name"] === "string" ? metadata["name"] : null) ??
          user.email?.split("@")[0] ??
          "Colaborador",
      })
      .select("*")
      .single();
    if (error) throw error;
    perfil = novo;
  }

  await supabase.rpc("bootstrap_primeiro_admin");

  const { data: vinculos } = await supabase
    .from("perfil_papeis")
    .select("papel_id, papeis(nome)")
    .eq("perfil_id", perfil.id);

  const papeis = (vinculos ?? [])
    .map((v) => (v.papeis as { nome: string } | null)?.nome)
    .filter((n): n is string => Boolean(n));

  return {
    userId: user.id,
    email: user.email ?? perfil.email,
    perfil,
    papeis,
    isAdmin: papeis.includes("admin"),
    isGestor: papeis.includes("admin") || papeis.includes("coordenador"),
  };
}

export function useSessao() {
  return useQuery({ queryKey: sessaoQueryKey, queryFn: carregarSessao, staleTime: 30_000 });
}

export const STATUS_LABEL: Record<string, string> = {
  nova: "Nova",
  visualizada: "Visualizada",
  em_tratamento: "Em tratamento",
  concluida: "Concluída",
};

export const TIPO_ACAO_LABEL: Record<string, string> = {
  enviado_cliente: "Enviado ao cliente",
  enviado_analise: "Enviado para análise/coordenação",
  comunicado: "Comunicado",
  declaracao: "Declaração",
};

export const SUB_TIPO_LABEL: Record<string, string> = {
  email: "E-mail",
  acessorias: "Acessórias",
};

export function statusDaAcao(tipo: string): string {
  return tipo === "enviado_analise" ? "em_tratamento" : "concluida";
}

export function formatarData(valor: string | null | undefined, comHora = true): string {
  if (!valor) return "—";
  const d = new Date(valor);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
