CREATE OR REPLACE FUNCTION public.aplicar_status_da_acao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mensagens
     SET status_geral = CASE WHEN NEW.tipo_acao = 'enviado_analise' THEN 'em_tratamento' ELSE 'concluida' END
   WHERE id = NEW.mensagem_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS acoes_aplicar_status ON public.acoes;
CREATE TRIGGER acoes_aplicar_status
AFTER INSERT ON public.acoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_status_da_acao();

CREATE OR REPLACE FUNCTION public.aplicar_status_visualizacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mensagens
     SET status_geral = 'visualizada'
   WHERE id = NEW.mensagem_id
     AND status_geral = 'nova';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visualizacoes_aplicar_status ON public.visualizacoes;
CREATE TRIGGER visualizacoes_aplicar_status
AFTER INSERT ON public.visualizacoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_status_visualizacao();

DROP FUNCTION IF EXISTS public.marcar_mensagem_visualizada(uuid);