-- Criar tabela de inspeções de segurança
create table public.inspecoes_seguranca (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  setor text,
  local_inspecao text,
  data_inspecao date not null,
  responsavel text,
  status text default 'pendente', -- 'pendente', 'concluída'
  observacoes text,
  agendar_proxima date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar índices para otimização
create index idx_inspecoes_seguranca_empresa_id on public.inspecoes_seguranca(empresa_id);
create index idx_inspecoes_seguranca_data_inspecao on public.inspecoes_seguranca(data_inspecao);
create index idx_inspecoes_seguranca_status on public.inspecoes_seguranca(status);

-- Trigger para atualizar updated_at
create trigger update_inspecoes_seguranca_updated_at
  before update on public.inspecoes_seguranca
  for each row execute function update_updated_at_column();

-- Habilitar RLS
alter table public.inspecoes_seguranca enable row level security;

-- Políticas RLS
create policy "Acesso por empresa (Inspeções - Select)"
on public.inspecoes_seguranca
for select using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = inspecoes_seguranca.empresa_id
  )
);

create policy "Acesso por empresa (Inspeções - Insert)"
on public.inspecoes_seguranca
for insert with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = empresa_id
  )
);

create policy "Acesso por empresa (Inspeções - Update)"
on public.inspecoes_seguranca
for update using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = inspecoes_seguranca.empresa_id
  )
) with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = empresa_id
  )
);

create policy "Acesso por empresa (Inspeções - Delete)"
on public.inspecoes_seguranca
for delete using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = inspecoes_seguranca.empresa_id
  )
);
