-- =====================================================================
-- Conecta Tributário — schema completo (public)
-- Rodar no SQL Editor do Supabase, de uma vez, em projeto novo.
-- =====================================================================

-- ---------- FUNÇÕES BASE ----------
create or replace function public.touch_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin new.atualizado_em = now(); return new; end; $$;

-- ---------- PERFIS / PAPÉIS ----------
create table public.perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome_completo text not null default '',
  email text not null default '',
  cargo text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.papeis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text
);

create table public.perfil_papeis (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  papel_id uuid not null references public.papeis(id) on delete cascade,
  primary key (perfil_id, papel_id)
);

create table public.sistemas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  url text not null,
  icone text not null default 'LayoutGrid',
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create table public.sistema_papeis (
  sistema_id uuid not null references public.sistemas(id) on delete cascade,
  papel_id uuid not null references public.papeis(id) on delete cascade,
  primary key (sistema_id, papel_id)
);

-- ---------- FUNÇÕES DE PERMISSÃO (security definer) ----------
create or replace function public.meu_perfil_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.perfis where user_id = auth.uid()
$$;

create or replace function public.tem_papel(_user_id uuid, _nome text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfil_papeis pp
    join public.perfis p on p.id = pp.perfil_id
    join public.papeis r on r.id = pp.papel_id
    where p.user_id = _user_id and r.nome = _nome
  )
$$;

create or replace function public.e_gestor(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.tem_papel(_user_id, 'admin') or public.tem_papel(_user_id, 'coordenador')
$$;

create or replace function public.e_colaborador(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfil_papeis pp
    join public.perfis p on p.id = pp.perfil_id
    where p.user_id = _user_id and p.ativo
  )
$$;

create or replace function public.bootstrap_primeiro_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_perfil uuid; v_papel uuid; v_existe boolean;
begin
  if auth.uid() is null then return false; end if;
  select exists (
    select 1 from public.perfil_papeis pp join public.papeis r on r.id = pp.papel_id
    where r.nome = 'admin'
  ) into v_existe;
  if v_existe then return false; end if;
  select id into v_perfil from public.perfis where user_id = auth.uid();
  if v_perfil is null then return false; end if;
  select id into v_papel from public.papeis where nome = 'admin';
  insert into public.perfil_papeis (perfil_id, papel_id) values (v_perfil, v_papel)
  on conflict do nothing;
  return true;
end; $$;

-- ---------- CAIXA POSTAL e-CAC (GOB) ----------
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  cnpj_contribuinte text not null,
  nome_contribuinte text not null,
  orgao text not null,
  assunto text not null,
  conteudo text not null default '',
  data_recebimento timestamptz not null default now(),
  leitura_gob boolean not null default false,
  data_leitura_gob timestamptz,
  status_geral text not null default 'nova',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  gob_id text unique,
  tipo text,
  ni text,
  remetente text,
  ativo boolean not null default true,
  arquivada boolean not null default false,
  importante boolean not null default false,
  primeira_leitura_gob timestamptz,
  exibicao_ate timestamptz,
  triagem text not null default 'nao_classificado',
  tag text,
  organizacao text,
  leitor_gob text
);

create table public.visualizacoes (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  colaborador_id uuid not null references public.perfis(id) on delete cascade,
  data_visualizacao timestamptz not null default now(),
  unique (mensagem_id, colaborador_id)
);

create table public.acoes (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.mensagens(id) on delete cascade,
  colaborador_id uuid not null references public.perfis(id) on delete cascade,
  tipo_acao text not null,
  sub_tipo text,
  observacao text,
  data_acao timestamptz not null default now()
);

create table public.sincronizacoes_gob (
  id uuid primary key default gen_random_uuid(),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  novas integer not null default 0,
  atualizadas integer not null default 0,
  situacao text not null default 'executando',
  erro text,
  criado_em timestamptz not null default now()
);

create or replace function public.aplicar_status_visualizacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.mensagens set status_geral = 'visualizada'
   where id = new.mensagem_id and status_geral = 'nova';
  return new;
end; $$;

create or replace function public.aplicar_status_da_acao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.mensagens set status_geral = 'em_tratamento'
   where id = new.mensagem_id and status_geral <> 'em_tratamento';
  return new;
end; $$;

create trigger mensagens_touch before update on public.mensagens
  for each row execute function public.touch_atualizado_em();
create trigger visualizacoes_aplicar_status after insert on public.visualizacoes
  for each row execute function public.aplicar_status_visualizacao();
create trigger acoes_aplicar_status after insert on public.acoes
  for each row execute function public.aplicar_status_da_acao();

-- ---------- PERDCOMP ----------
create table public.declaracoes (
  id uuid primary key default gen_random_uuid(),
  gob_id text not null unique,
  numero_perdcomp text,
  numero_recibo text,
  cnpj text,
  nome text,
  razao_social text,
  tipo_documento text,
  tipo_credito text,
  grupo_tributo text,
  codigo_receita text,
  situacao text,
  ajuda_situacao text,
  periodo_apuracao text,
  data_transmissao timestamptz,
  ultimo_registro boolean not null default false,
  valor_total_credito numeric,
  valor_utilizado numeric,
  saldo_restante numeric,
  credito_atualizado numeric,
  total_debitos numeric,
  saldo_credito_original numeric,
  processo_administrativo text,
  processo_judicial text,
  processo_habilitacao text,
  arquivo_documento_id text,
  arquivo_documento_nome text,
  arquivo_recibo_id text,
  arquivo_recibo_nome text,
  responsavel_nome text,
  responsavel_cpf text,
  responsavel_crc text,
  responsavel_email text,
  responsavel_extraido_em timestamptz,
  dados jsonb not null default '{}'::jsonb,
  primeira_sincronizacao timestamptz not null default now(),
  ultima_sincronizacao timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_declaracoes_data on public.declaracoes (data_transmissao desc);
create index idx_declaracoes_situacao on public.declaracoes (situacao);
create index idx_declaracoes_responsavel on public.declaracoes (responsavel_nome);

create table public.acompanhamentos (
  declaracao_id uuid primary key references public.declaracoes(id) on delete cascade,
  responsavel_id uuid references public.perfis(id) on delete set null,
  ordem_servico text not null default '',
  terceiro boolean not null default false,
  aviso_pagamento boolean not null default false,
  aviso_pagamento_data date,
  aviso_pagamento_prazo date,
  pagamento_confirmado boolean not null default false,
  pagamento_confirmado_em date,
  compensacao_oficio boolean not null default false,
  compensacao_oficio_prazo date,
  compensacao_oficio_opcao text not null default '',
  intimacao boolean not null default false,
  intimacao_prazo date,
  encerrado boolean not null default false,
  encerrado_em date,
  observacao text not null default '',
  updated_at timestamptz not null default now()
);

create table public.auditoria_achados (
  id uuid primary key default gen_random_uuid(),
  declaracao_id uuid not null references public.declaracoes(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  severidade text not null default 'atencao',
  revisado boolean not null default false,
  revisado_por uuid references public.perfis(id) on delete set null,
  revisado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (declaracao_id, codigo)
);

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  declaracao_id uuid not null references public.declaracoes(id) on delete cascade,
  tipo text not null,
  prioridade text not null default 'normal',
  mensagem text not null,
  resolvido boolean not null default false,
  resolvido_por uuid references public.perfis(id) on delete set null,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index idx_alertas_abertos on public.alertas (resolvido, criado_em desc);

create table public.status_historico (
  id uuid primary key default gen_random_uuid(),
  declaracao_id uuid not null references public.declaracoes(id) on delete cascade,
  situacao_anterior text,
  situacao_nova text not null,
  registrado_em timestamptz not null default now()
);

create table public.log_alteracoes (
  id uuid primary key default gen_random_uuid(),
  declaracao_id uuid references public.declaracoes(id) on delete cascade,
  usuario_id uuid references public.perfis(id) on delete set null,
  usuario_nome text not null default '',
  campo text not null,
  valor_anterior text,
  valor_novo text,
  criado_em timestamptz not null default now()
);

-- ---------- LEVANTAMENTO DE DÉBITOS (diagnósticos) ----------
create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  empresa text not null,
  cnpj text,
  responsavel text,
  data_levantamento date not null default current_date,
  observacoes text,
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'em_andamento' check (status in ('em_andamento','concluido')),
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index diagnosticos_cnpj_idx on public.diagnosticos (cnpj);
create index diagnosticos_data_idx on public.diagnosticos (data_levantamento desc);

create trigger diagnosticos_touch before update on public.diagnosticos
  for each row execute function public.touch_atualizado_em();

-- ---------- GRANTS (obrigatório para a Data API) ----------
grant select, insert, update, delete on
  public.perfis, public.papeis, public.perfil_papeis, public.sistemas,
  public.sistema_papeis, public.mensagens, public.visualizacoes, public.acoes,
  public.diagnosticos to authenticated;
grant select on
  public.sincronizacoes_gob, public.declaracoes, public.acompanhamentos,
  public.auditoria_achados, public.alertas, public.status_historico,
  public.log_alteracoes to authenticated;
grant all on all tables in schema public to service_role;

-- ---------- RLS ----------
alter table public.perfis enable row level security;
alter table public.papeis enable row level security;
alter table public.perfil_papeis enable row level security;
alter table public.sistemas enable row level security;
alter table public.sistema_papeis enable row level security;
alter table public.mensagens enable row level security;
alter table public.visualizacoes enable row level security;
alter table public.acoes enable row level security;
alter table public.sincronizacoes_gob enable row level security;
alter table public.declaracoes enable row level security;
alter table public.acompanhamentos enable row level security;
alter table public.auditoria_achados enable row level security;
alter table public.alertas enable row level security;
alter table public.status_historico enable row level security;
alter table public.log_alteracoes enable row level security;
alter table public.diagnosticos enable row level security;

-- perfis
create policy perfis_select on public.perfis for select to authenticated
  using (user_id = auth.uid() or public.e_colaborador(auth.uid()));
create policy perfis_insert_own on public.perfis for insert to authenticated
  with check (user_id = auth.uid());
create policy perfis_update_own on public.perfis for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy perfis_update_admin on public.perfis for update to authenticated
  using (public.tem_papel(auth.uid(),'admin')) with check (public.tem_papel(auth.uid(),'admin'));
create policy perfis_delete_admin on public.perfis for delete to authenticated
  using (public.tem_papel(auth.uid(),'admin'));

-- papeis / vínculos / sistemas
create policy papeis_select on public.papeis for select to authenticated using (true);
create policy papeis_write on public.papeis for all to authenticated
  using (public.tem_papel(auth.uid(),'admin')) with check (public.tem_papel(auth.uid(),'admin'));
create policy perfil_papeis_select on public.perfil_papeis for select to authenticated using (true);
create policy perfil_papeis_write on public.perfil_papeis for all to authenticated
  using (public.e_gestor(auth.uid())) with check (public.e_gestor(auth.uid()));
create policy sistemas_select on public.sistemas for select to authenticated using (true);
create policy sistemas_write on public.sistemas for all to authenticated
  using (public.e_gestor(auth.uid())) with check (public.e_gestor(auth.uid()));
create policy sistema_papeis_select on public.sistema_papeis for select to authenticated using (true);
create policy sistema_papeis_write on public.sistema_papeis for all to authenticated
  using (public.e_gestor(auth.uid())) with check (public.e_gestor(auth.uid()));

-- mensagens e histórico
create policy mensagens_select on public.mensagens for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy mensagens_insert on public.mensagens for insert to authenticated
  with check (public.e_gestor(auth.uid()));
create policy mensagens_update_gestor on public.mensagens for update to authenticated
  using (public.e_gestor(auth.uid())) with check (public.e_gestor(auth.uid()));
create policy mensagens_update_triagem on public.mensagens for update to authenticated
  using (public.e_colaborador(auth.uid())) with check (public.e_colaborador(auth.uid()));

create policy visualizacoes_select on public.visualizacoes for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy visualizacoes_insert_own on public.visualizacoes for insert to authenticated
  with check (colaborador_id = public.meu_perfil_id());

create policy acoes_select on public.acoes for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy acoes_insert_own on public.acoes for insert to authenticated
  with check (colaborador_id = public.meu_perfil_id());

create policy sincronizacoes_select on public.sincronizacoes_gob for select to authenticated using (true);

-- perdcomp (somente leitura pelo app; escrita via service_role)
create policy declaracoes_select on public.declaracoes for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy acompanhamentos_select on public.acompanhamentos for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy auditoria_achados_select on public.auditoria_achados for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy alertas_select on public.alertas for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy status_historico_select on public.status_historico for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy log_alteracoes_select on public.log_alteracoes for select to authenticated
  using (public.e_colaborador(auth.uid()));

-- diagnósticos
create policy diagnosticos_select_colaborador on public.diagnosticos for select to authenticated
  using (public.e_colaborador(auth.uid()));
create policy diagnosticos_insert_proprio on public.diagnosticos for insert to authenticated
  with check (perfil_id = public.meu_perfil_id());
create policy diagnosticos_update_proprio on public.diagnosticos for update to authenticated
  using (perfil_id = public.meu_perfil_id() or public.e_gestor(auth.uid()))
  with check (perfil_id = public.meu_perfil_id() or public.e_gestor(auth.uid()));
create policy diagnosticos_delete_proprio on public.diagnosticos for delete to authenticated
  using (perfil_id = public.meu_perfil_id() or public.e_gestor(auth.uid()));

-- ---------- DADOS INICIAIS ----------
insert into public.papeis (nome, descricao) values
  ('admin','Administrador do portal'),
  ('coordenador','Coordenação do departamento'),
  ('colaborador','Colaborador do departamento')
on conflict (nome) do nothing;

-- Storage: criar bucket privado "diagnosticos" pelo painel de Storage.
