DROP POLICY IF EXISTS mensagens_update ON public.mensagens;

CREATE POLICY mensagens_update_gestor ON public.mensagens
  FOR UPDATE TO authenticated
  USING (public.e_gestor(auth.uid()))
  WITH CHECK (public.e_gestor(auth.uid()));

CREATE OR REPLACE FUNCTION public.marcar_mensagem_visualizada(_mensagem_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  UPDATE public.mensagens
     SET status_geral = 'visualizada'
   WHERE id = _mensagem_id
     AND status_geral = 'nova';
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_mensagem_visualizada(uuid) FROM public;
REVOKE ALL ON FUNCTION public.marcar_mensagem_visualizada(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.marcar_mensagem_visualizada(uuid) TO authenticated;