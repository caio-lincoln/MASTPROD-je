-- Criar tabela de exames médicos
create table public.exames_medicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  funcionario_id uuid references public.funcionarios(id) on delete cascade,
  tipo_exame text not null,
  data_agendamento date,
  data_realizacao date,
  resultado text,
  observacoes text,
  status text default 'agendado' check (status in ('agendado', 'realizado', 'cancelado')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar tabela de treinamentos
create table public.treinamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  titulo text not null,
  descricao text,
  instrutor text,
  data_inicio date,
  data_fim date,
  carga_horaria integer,
  status text default 'planejado' check (status in ('planejado', 'em_andamento', 'concluido', 'cancelado')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar tabela de não conformidades
create table public.nao_conformidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  titulo text not null,
  descricao text,
  setor text,
  responsavel text,
  data_identificacao date default current_date,
  prazo_resolucao date,
  status text default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'fechada')),
  prioridade text default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar índices
create index idx_exames_empresa_id on public.exames_medicos(empresa_id);
create index idx_exames_funcionario_id on public.exames_medicos(funcionario_id);
create index idx_treinamentos_empresa_id on public.treinamentos(empresa_id);
create index idx_nao_conformidades_empresa_id on public.nao_conformidades(empresa_id);

-- Triggers para updated_at
create trigger update_exames_medicos_updated_at
  before update on public.exames_medicos
  for each row execute function update_updated_at_column();

create trigger update_treinamentos_updated_at
  before update on public.treinamentos
  for each row execute function update_updated_at_column();

create trigger update_nao_conformidades_updated_at
  before update on public.nao_conformidades
  for each row execute function update_updated_at_column();
