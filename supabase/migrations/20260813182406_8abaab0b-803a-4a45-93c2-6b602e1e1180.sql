CREATE OR REPLACE FUNCTION public.aplicar_status_da_acao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mensagens
     SET status_geral = 'em_tratamento'
   WHERE id = NEW.mensagem_id
     AND status_geral <> 'em_tratamento';
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS mensagens_update_triagem ON public.mensagens;
CREATE POLICY mensagens_update_triagem ON public.mensagens
FOR UPDATE TO authenticated
USING (e_colaborador(auth.uid()))
WITH CHECK (e_colaborador(auth.uid()));

UPDATE public.sistemas
   SET nome = 'Levantamento de Débitos',
       descricao = 'Anexe os relatórios municipais, estaduais e federais e gere o levantamento de débitos para envio ao cliente.'
 WHERE url = '/diagnostico' OR nome ILIKE '%Diagn%';