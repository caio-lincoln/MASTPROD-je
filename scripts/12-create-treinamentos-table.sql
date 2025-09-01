-- Criação da tabela de treinamentos
create table public.treinamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  instrutor text,
  data_treinamento date not null,
  duracao text,
  certificado_url text, -- PDF armazenado no Supabase Storage
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criação da tabela de relacionamento funcionário-treinamento
create table public.treinamento_funcionarios (
  id uuid primary key default gen_random_uuid(),
  treinamento_id uuid references public.treinamentos(id) on delete cascade,
  funcionario_id uuid references public.funcionarios(id) on delete cascade,
  status text default 'concluído', -- ou 'pendente', 'reprovado'
  certificado_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para otimização
create index idx_treinamentos_empresa_id on public.treinamentos(empresa_id);
create index idx_treinamentos_data on public.treinamentos(data_treinamento);
create index idx_treinamento_funcionarios_treinamento_id on public.treinamento_funcionarios(treinamento_id);
create index idx_treinamento_funcionarios_funcionario_id on public.treinamento_funcionarios(funcionario_id);

-- Triggers para updated_at
create trigger update_treinamentos_updated_at
  before update on public.treinamentos
  for each row execute function update_updated_at_column();

create trigger update_treinamento_funcionarios_updated_at
  before update on public.treinamento_funcionarios
  for each row execute function update_updated_at_column();
