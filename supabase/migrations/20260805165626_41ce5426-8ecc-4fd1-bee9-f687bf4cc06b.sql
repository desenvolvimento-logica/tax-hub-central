-- perfis
CREATE TABLE public.perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome_completo text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- papeis
CREATE TABLE public.papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papeis TO authenticated;
GRANT ALL ON public.papeis TO service_role;
ALTER TABLE public.papeis ENABLE ROW LEVEL SECURITY;

-- perfil_papeis
CREATE TABLE public.perfil_papeis (
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  papel_id uuid NOT NULL REFERENCES public.papeis(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, papel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_papeis TO authenticated;
GRANT ALL ON public.perfil_papeis TO service_role;
ALTER TABLE public.perfil_papeis ENABLE ROW LEVEL SECURITY;

-- sistemas
CREATE TABLE public.sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  url text NOT NULL,
  icone text NOT NULL DEFAULT 'LayoutGrid',
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sistemas TO authenticated;
GRANT ALL ON public.sistemas TO service_role;
ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;

-- sistema_papeis
CREATE TABLE public.sistema_papeis (
  sistema_id uuid NOT NULL REFERENCES public.sistemas(id) ON DELETE CASCADE,
  papel_id uuid NOT NULL REFERENCES public.papeis(id) ON DELETE CASCADE,
  PRIMARY KEY (sistema_id, papel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sistema_papeis TO authenticated;
GRANT ALL ON public.sistema_papeis TO service_role;
ALTER TABLE public.sistema_papeis ENABLE ROW LEVEL SECURITY;

-- mensagens
CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE,
  cnpj_contribuinte text NOT NULL,
  nome_contribuinte text NOT NULL,
  orgao text NOT NULL,
  assunto text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  data_recebimento timestamptz NOT NULL DEFAULT now(),
  leitura_gob boolean NOT NULL DEFAULT false,
  data_leitura_gob timestamptz,
  status_geral text NOT NULL DEFAULT 'nova',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- visualizacoes
CREATE TABLE public.visualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  data_visualizacao timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mensagem_id, colaborador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visualizacoes TO authenticated;
GRANT ALL ON public.visualizacoes TO service_role;
ALTER TABLE public.visualizacoes ENABLE ROW LEVEL SECURITY;

-- acoes
CREATE TABLE public.acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  tipo_acao text NOT NULL,
  sub_tipo text,
  observacao text,
  data_acao timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes TO authenticated;
GRANT ALL ON public.acoes TO service_role;
ALTER TABLE public.acoes ENABLE ROW LEVEL SECURITY;

-- helpers
CREATE OR REPLACE FUNCTION public.tem_papel(_user_id uuid, _nome text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfil_papeis pp
    JOIN public.perfis p ON p.id = pp.perfil_id
    JOIN public.papeis r ON r.id = pp.papel_id
    WHERE p.user_id = _user_id AND r.nome = _nome
  )
$$;

CREATE OR REPLACE FUNCTION public.meu_perfil_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.perfis WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.e_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tem_papel(_user_id, 'admin') OR public.tem_papel(_user_id, 'coordenador')
$$;

-- primeiro usuário torna-se admin
CREATE OR REPLACE FUNCTION public.bootstrap_primeiro_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_perfil uuid; v_papel uuid; v_existe boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.perfil_papeis pp JOIN public.papeis r ON r.id = pp.papel_id
    WHERE r.nome = 'admin'
  ) INTO v_existe;
  IF v_existe THEN RETURN false; END IF;
  SELECT id INTO v_perfil FROM public.perfis WHERE user_id = auth.uid();
  IF v_perfil IS NULL THEN RETURN false; END IF;
  SELECT id INTO v_papel FROM public.papeis WHERE nome = 'admin';
  INSERT INTO public.perfil_papeis (perfil_id, papel_id) VALUES (v_perfil, v_papel)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE TRIGGER mensagens_touch BEFORE UPDATE ON public.mensagens
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- policies
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_insert_own" ON public.perfis FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "perfis_update_own" ON public.perfis FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "perfis_update_admin" ON public.perfis FOR UPDATE TO authenticated USING (public.tem_papel(auth.uid(), 'admin')) WITH CHECK (public.tem_papel(auth.uid(), 'admin'));
CREATE POLICY "perfis_delete_admin" ON public.perfis FOR DELETE TO authenticated USING (public.tem_papel(auth.uid(), 'admin'));

CREATE POLICY "papeis_select" ON public.papeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "papeis_write" ON public.papeis FOR ALL TO authenticated USING (public.tem_papel(auth.uid(), 'admin')) WITH CHECK (public.tem_papel(auth.uid(), 'admin'));

CREATE POLICY "perfil_papeis_select" ON public.perfil_papeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil_papeis_write" ON public.perfil_papeis FOR ALL TO authenticated USING (public.e_gestor(auth.uid())) WITH CHECK (public.e_gestor(auth.uid()));

CREATE POLICY "sistemas_select" ON public.sistemas FOR SELECT TO authenticated USING (true);
CREATE POLICY "sistemas_write" ON public.sistemas FOR ALL TO authenticated USING (public.e_gestor(auth.uid())) WITH CHECK (public.e_gestor(auth.uid()));

CREATE POLICY "sistema_papeis_select" ON public.sistema_papeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "sistema_papeis_write" ON public.sistema_papeis FOR ALL TO authenticated USING (public.e_gestor(auth.uid())) WITH CHECK (public.e_gestor(auth.uid()));

CREATE POLICY "mensagens_select" ON public.mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "mensagens_insert" ON public.mensagens FOR INSERT TO authenticated WITH CHECK (public.e_gestor(auth.uid()));
CREATE POLICY "mensagens_update" ON public.mensagens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "visualizacoes_select" ON public.visualizacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "visualizacoes_insert_own" ON public.visualizacoes FOR INSERT TO authenticated WITH CHECK (colaborador_id = public.meu_perfil_id());

CREATE POLICY "acoes_select" ON public.acoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "acoes_insert_own" ON public.acoes FOR INSERT TO authenticated WITH CHECK (colaborador_id = public.meu_perfil_id());

-- seeds
INSERT INTO public.papeis (nome, descricao) VALUES
  ('admin', 'Administrador do HUB: gerencia sistemas, usuários e papéis'),
  ('coordenador', 'Coordenação do departamento tributário'),
  ('analista', 'Analista tributário');

INSERT INTO public.sistemas (nome, descricao, url, icone, ativo, ordem) VALUES
  ('PERDCOMP', 'Controle de pedidos de restituição, ressarcimento e compensação.', 'https://perdcomp-pilot.lovable.app/', 'FileStack', true, 1),
  ('e-CAC / GOB', 'Acompanhamento das mensagens recebidas no e-CAC via API GOB.', '/mensagens', 'MailCheck', true, 2);

INSERT INTO public.sistema_papeis (sistema_id, papel_id)
SELECT s.id, p.id FROM public.sistemas s CROSS JOIN public.papeis p;

INSERT INTO public.mensagens (protocolo, cnpj_contribuinte, nome_contribuinte, orgao, assunto, conteudo, data_recebimento, leitura_gob, data_leitura_gob, status_geral) VALUES
  ('2026.0001.884213', '12.345.678/0001-90', 'Alfa Indústria de Alimentos Ltda', 'Receita Federal', 'Intimação para apresentação de documentos - DCTF 03/2026', 'Prezado contribuinte, fica V.Sa. intimado a apresentar, no prazo de 20 (vinte) dias, os documentos que comprovem os débitos declarados na DCTF do período de apuração 03/2026, em especial os livros fiscais e comprovantes de recolhimento.', now() - interval '2 days', true, now() - interval '2 days', 'nova'),
  ('2026.0001.884377', '98.765.432/0001-11', 'Beta Comércio de Peças S.A.', 'Receita Federal', 'Comunicado de divergência em PER/DCOMP', 'Identificamos divergência entre o crédito informado no PER/DCOMP nº 41234.56789.010226.1.3.02-0000 e os valores escriturados. Regularize a situação ou apresente justificativa.', now() - interval '4 days', true, now() - interval '3 days', 'nova'),
  ('2026.0001.884402', '11.222.333/0001-44', 'Gama Serviços de TI Eireli', 'PGFN', 'Aviso de inscrição em Dívida Ativa da União', 'Informamos a inscrição do débito referente ao processo administrativo nº 10120.123456/2025-77 em Dívida Ativa da União. Consulte o Regularize para opções de negociação.', now() - interval '6 days', false, NULL, 'nova'),
  ('2026.0001.884519', '55.666.777/0001-22', 'Delta Transportes Ltda', 'Receita Federal', 'Malha fiscal - IRPJ/CSLL 2025', 'Sua empresa foi selecionada para procedimento de malha fiscal referente ao ano-calendário 2025. Verifique as inconsistências apontadas no e-CAC e providencie a retificação, se aplicável.', now() - interval '9 days', true, now() - interval '8 days', 'nova'),
  ('2026.0001.884588', '33.444.555/0001-66', 'Épsilon Farmacêutica S.A.', 'Receita Federal', 'Resultado de análise de pedido de restituição', 'O pedido de restituição protocolado sob nº 12345.678901.020126.1.2.04-1111 foi parcialmente deferido. O valor homologado será creditado conforme legislação vigente.', now() - interval '12 days', true, now() - interval '11 days', 'nova'),
  ('2026.0001.884640', '77.888.999/0001-33', 'Zeta Agro Participações Ltda', 'PGFN', 'Notificação de rescisão de parcelamento', 'Comunicamos a rescisão do parcelamento nº 2024/998877 por inadimplência de 3 (três) parcelas consecutivas. O saldo remanescente será encaminhado para cobrança.', now() - interval '15 days', false, NULL, 'nova');
