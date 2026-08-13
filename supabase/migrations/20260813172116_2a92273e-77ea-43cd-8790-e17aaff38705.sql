CREATE OR REPLACE FUNCTION public.e_colaborador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_papeis pp
    JOIN public.perfis p ON p.id = pp.perfil_id
    WHERE p.user_id = _user_id AND p.ativo
  )
$$;

REVOKE ALL ON FUNCTION public.e_colaborador(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.e_colaborador(uuid) TO authenticated;

DROP POLICY IF EXISTS mensagens_select ON public.mensagens;
CREATE POLICY mensagens_select ON public.mensagens
  FOR SELECT TO authenticated
  USING (public.e_colaborador(auth.uid()));

DROP POLICY IF EXISTS acoes_select ON public.acoes;
CREATE POLICY acoes_select ON public.acoes
  FOR SELECT TO authenticated
  USING (public.e_colaborador(auth.uid()));

DROP POLICY IF EXISTS visualizacoes_select ON public.visualizacoes;
CREATE POLICY visualizacoes_select ON public.visualizacoes
  FOR SELECT TO authenticated
  USING (public.e_colaborador(auth.uid()));

DROP POLICY IF EXISTS perfis_select ON public.perfis;
CREATE POLICY perfis_select ON public.perfis
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.e_colaborador(auth.uid()));