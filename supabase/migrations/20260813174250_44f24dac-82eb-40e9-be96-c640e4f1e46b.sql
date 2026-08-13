CREATE TABLE public.diagnosticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  empresa text NOT NULL,
  cnpj text,
  responsavel text,
  data_levantamento date NOT NULL DEFAULT current_date,
  observacoes text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnosticos TO authenticated;
GRANT ALL ON public.diagnosticos TO service_role;
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnosticos_select_colaborador" ON public.diagnosticos
  FOR SELECT TO authenticated USING (public.e_colaborador(auth.uid()));
CREATE POLICY "diagnosticos_insert_proprio" ON public.diagnosticos
  FOR INSERT TO authenticated WITH CHECK (perfil_id = public.meu_perfil_id());
CREATE POLICY "diagnosticos_update_proprio" ON public.diagnosticos
  FOR UPDATE TO authenticated USING (perfil_id = public.meu_perfil_id() OR public.e_gestor(auth.uid()))
  WITH CHECK (perfil_id = public.meu_perfil_id() OR public.e_gestor(auth.uid()));
CREATE POLICY "diagnosticos_delete_proprio" ON public.diagnosticos
  FOR DELETE TO authenticated USING (perfil_id = public.meu_perfil_id() OR public.e_gestor(auth.uid()));

CREATE TRIGGER diagnosticos_touch BEFORE UPDATE ON public.diagnosticos
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

INSERT INTO public.sistemas (nome, descricao, url, icone, ordem, ativo)
VALUES ('Diagnóstico Fiscal', 'Anexe relatórios de débito e certidões e gere o relatório de diagnóstico fiscal para o cliente.', '/diagnostico', 'ClipboardList', 40, true);

INSERT INTO public.sistema_papeis (sistema_id, papel_id)
SELECT s.id, p.id FROM public.sistemas s CROSS JOIN public.papeis p
WHERE s.url = '/diagnostico';