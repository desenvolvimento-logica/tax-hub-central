CREATE POLICY "diagnosticos_arquivos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'diagnosticos' AND public.e_colaborador(auth.uid()));
CREATE POLICY "diagnosticos_arquivos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diagnosticos' AND public.e_colaborador(auth.uid()));
CREATE POLICY "diagnosticos_arquivos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'diagnosticos' AND public.e_colaborador(auth.uid()));