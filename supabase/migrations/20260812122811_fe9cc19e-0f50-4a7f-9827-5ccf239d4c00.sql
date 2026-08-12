DROP INDEX IF EXISTS public.mensagens_gob_id_key;
ALTER TABLE public.mensagens ADD CONSTRAINT mensagens_gob_id_unique UNIQUE (gob_id);