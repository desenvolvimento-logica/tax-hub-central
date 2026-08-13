ALTER TABLE public.diagnosticos
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS concluido_em timestamp with time zone;

ALTER TABLE public.diagnosticos
  DROP CONSTRAINT IF EXISTS diagnosticos_status_check;

ALTER TABLE public.diagnosticos
  ADD CONSTRAINT diagnosticos_status_check CHECK (status IN ('em_andamento','concluido'));

CREATE INDEX IF NOT EXISTS diagnosticos_cnpj_idx ON public.diagnosticos (cnpj);
CREATE INDEX IF NOT EXISTS diagnosticos_data_idx ON public.diagnosticos (data_levantamento DESC);