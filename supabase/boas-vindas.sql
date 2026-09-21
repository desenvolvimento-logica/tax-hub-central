-- =====================================================================
-- Registro de geração do comunicado de boas-vindas
-- Rodar no SQL Editor do banco do escritório.
-- =====================================================================

create table public.boas_vindas (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.perfis(id) on delete cascade,
  cliente text not null,
  gerado_em timestamptz not null default now()
);

grant select, insert on public.boas_vindas to authenticated;
grant all on public.boas_vindas to service_role;

alter table public.boas_vindas enable row level security;

create policy boas_vindas_select on public.boas_vindas for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy boas_vindas_insert_own on public.boas_vindas for insert to authenticated
  with check (colaborador_id = public.meu_perfil_id());
