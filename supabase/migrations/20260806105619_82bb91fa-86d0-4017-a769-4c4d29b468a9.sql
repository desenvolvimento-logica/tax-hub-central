ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS gob_id text,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS ni text,
  ADD COLUMN IF NOT EXISTS remetente text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS importante boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primeira_leitura_gob timestamp with time zone,
  ADD COLUMN IF NOT EXISTS exibicao_ate timestamp with time zone,
  ADD COLUMN IF NOT EXISTS triagem text NOT NULL DEFAULT 'nao_classificado',
  ADD COLUMN IF NOT EXISTS tag text,
  ADD COLUMN IF NOT EXISTS organizacao text;

CREATE UNIQUE INDEX IF NOT EXISTS mensagens_gob_id_key ON public.mensagens (gob_id) WHERE gob_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sincronizacoes_gob (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamp with time zone NOT NULL DEFAULT now(),
  concluido_em timestamp with time zone,
  novas integer NOT NULL DEFAULT 0,
  atualizadas integer NOT NULL DEFAULT 0,
  situacao text NOT NULL DEFAULT 'executando',
  erro text,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sincronizacoes_gob TO authenticated;
GRANT ALL ON public.sincronizacoes_gob TO service_role;

ALTER TABLE public.sincronizacoes_gob ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sincronizacoes_select" ON public.sincronizacoes_gob
  FOR SELECT TO authenticated USING (true);