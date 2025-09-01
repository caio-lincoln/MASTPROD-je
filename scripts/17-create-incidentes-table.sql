-- Criar tabela de incidentes e acidentes
create table public.incidentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  data_ocorrencia date not null,
  local text,
  descricao text,
  tipo text, -- 'incidente' ou 'acidente'
  gravidade text, -- 'leve', 'moderada', 'grave'
  funcionario_id uuid references public.funcionarios(id),
  status text default 'aberto', -- 'aberto', 'investigando', 'fechado'
  investigacao text,
  evidencias_url text, -- link para fotos, documentos
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar índices para otimização
create index idx_incidentes_empresa_id on public.incidentes(empresa_id);
create index idx_incidentes_data_ocorrencia on public.incidentes(data_ocorrencia);
create index idx_incidentes_status on public.incidentes(status);
create index idx_incidentes_funcionario_id on public.incidentes(funcionario_id);
create index idx_incidentes_tipo on public.incidentes(tipo);

-- Trigger para atualizar updated_at
create trigger update_incidentes_updated_at
  before update on public.incidentes
  for each row execute function update_updated_at_column();

-- Habilitar RLS
alter table public.incidentes enable row level security;

-- Políticas RLS
create policy "Acesso por empresa (Incidentes - Select)"
on public.incidentes
for select using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = incidentes.empresa_id
  )
);

create policy "Acesso por empresa (Incidentes - Insert)"
on public.incidentes
for insert with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = empresa_id
  )
);

create policy "Acesso por empresa (Incidentes - Update)"
on public.incidentes
for update using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = incidentes.empresa_id
  )
) with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = empresa_id
  )
);

create policy "Acesso por empresa (Incidentes - Delete)"
on public.incidentes
for delete using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = incidentes.empresa_id
  )
);
