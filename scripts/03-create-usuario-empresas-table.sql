-- Criar tabela de relacionamento usuário-empresa
create table public.usuario_empresas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  role text default 'user' check (role in ('user', 'admin', 'manager')),
  created_at timestamp with time zone default now(),
  unique(user_id, empresa_id)
);

-- Criar índices para melhor performance
create index idx_usuario_empresas_user_id on public.usuario_empresas(user_id);
create index idx_usuario_empresas_empresa_id on public.usuario_empresas(empresa_id);
create index idx_usuario_empresas_role on public.usuario_empresas(role);
