CREATE TABLE public.declaracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gob_id text NOT NULL UNIQUE,
  numero_perdcomp text,
  numero_recibo text,
  cnpj text,
  nome text,
  razao_social text,
  tipo_documento text,
  tipo_credito text,
  grupo_tributo text,
  codigo_receita text,
  situacao text,
  ajuda_situacao text,
  periodo_apuracao text,
  data_transmissao timestamptz,
  ultimo_registro boolean NOT NULL DEFAULT false,
  valor_total_credito numeric,
  valor_utilizado numeric,
  saldo_restante numeric,
  credito_atualizado numeric,
  total_debitos numeric,
  saldo_credito_original numeric,
  processo_administrativo text,
  processo_judicial text,
  processo_habilitacao text,
  arquivo_documento_id text,
  arquivo_documento_nome text,
  arquivo_recibo_id text,
  arquivo_recibo_nome text,
  responsavel_nome text,
  responsavel_cpf text,
  responsavel_crc text,
  responsavel_email text,
  responsavel_extraido_em timestamptz,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  primeira_sincronizacao timestamptz NOT NULL DEFAULT now(),
  ultima_sincronizacao timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.declaracoes TO authenticated;
GRANT ALL ON public.declaracoes TO service_role;
ALTER TABLE public.declaracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "declaracoes_select" ON public.declaracoes FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));

CREATE TABLE public.status_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES public.declaracoes(id) ON DELETE CASCADE,
  situacao_anterior text,
  situacao_nova text NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_historico TO authenticated;
GRANT ALL ON public.status_historico TO service_role;
ALTER TABLE public.status_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_historico_select" ON public.status_historico FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));

CREATE TABLE public.acompanhamentos (
  declaracao_id uuid PRIMARY KEY REFERENCES public.declaracoes(id) ON DELETE CASCADE,
  responsavel_id uuid REFERENCES public.perfis(id) ON DELETE SET NULL,
  ordem_servico text NOT NULL DEFAULT '',
  terceiro boolean NOT NULL DEFAULT false,
  aviso_pagamento boolean NOT NULL DEFAULT false,
  aviso_pagamento_data date,
  aviso_pagamento_prazo date,
  pagamento_confirmado boolean NOT NULL DEFAULT false,
  pagamento_confirmado_em date,
  compensacao_oficio boolean NOT NULL DEFAULT false,
  compensacao_oficio_prazo date,
  compensacao_oficio_opcao text NOT NULL DEFAULT '',
  intimacao boolean NOT NULL DEFAULT false,
  intimacao_prazo date,
  encerrado boolean NOT NULL DEFAULT false,
  encerrado_em date,
  observacao text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.acompanhamentos TO authenticated;
GRANT ALL ON public.acompanhamentos TO service_role;
ALTER TABLE public.acompanhamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acompanhamentos_select" ON public.acompanhamentos FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));

CREATE TABLE public.auditoria_achados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES public.declaracoes(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao text NOT NULL,
  severidade text NOT NULL DEFAULT 'atencao',
  revisado boolean NOT NULL DEFAULT false,
  revisado_por uuid REFERENCES public.perfis(id) ON DELETE SET NULL,
  revisado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (declaracao_id, codigo)
);
GRANT SELECT ON public.auditoria_achados TO authenticated;
GRANT ALL ON public.auditoria_achados TO service_role;
ALTER TABLE public.auditoria_achados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditoria_achados_select" ON public.auditoria_achados FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));

CREATE TABLE public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES public.declaracoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  prioridade text NOT NULL DEFAULT 'normal',
  mensagem text NOT NULL,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_por uuid REFERENCES public.perfis(id) ON DELETE SET NULL,
  resolvido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alertas TO authenticated;
GRANT ALL ON public.alertas TO service_role;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_select" ON public.alertas FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));

CREATE TABLE public.log_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid REFERENCES public.declaracoes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.perfis(id) ON DELETE SET NULL,
  usuario_nome text NOT NULL DEFAULT '',
  campo text NOT NULL,
  valor_anterior text,
  valor_novo text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.log_alteracoes TO authenticated;
GRANT ALL ON public.log_alteracoes TO service_role;
ALTER TABLE public.log_alteracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_alteracoes_select" ON public.log_alteracoes FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));

CREATE INDEX idx_declaracoes_situacao ON public.declaracoes (situacao);
CREATE INDEX idx_declaracoes_data ON public.declaracoes (data_transmissao DESC);
CREATE INDEX idx_declaracoes_responsavel ON public.declaracoes (responsavel_nome);
CREATE INDEX idx_alertas_abertos ON public.alertas (resolvido, criado_em DESC);