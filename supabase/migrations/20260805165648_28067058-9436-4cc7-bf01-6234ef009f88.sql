REVOKE EXECUTE ON FUNCTION public.tem_papel(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.e_gestor(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.meu_perfil_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_primeiro_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.tem_papel(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.e_gestor(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.meu_perfil_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_primeiro_admin() TO authenticated, service_role;