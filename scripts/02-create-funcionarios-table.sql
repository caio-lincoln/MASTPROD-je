-- Criar tabela de funcionários
create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  matricula_esocial text,
  data_nascimento date,
  cpf text,
  email text,
  cargo text,
  setor text,
  status boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar índices para melhor performance
create index idx_funcionarios_empresa_id on public.funcionarios(empresa_id);
create index idx_funcionarios_cpf on public.funcionarios(cpf);
create index idx_funcionarios_matricula_esocial on public.funcionarios(matricula_esocial);
create index idx_funcionarios_status on public.funcionarios(status);

-- Trigger para atualizar updated_at automaticamente
create trigger update_funcionarios_updated_at
  before update on public.funcionarios
  for each row execute function update_updated_at_column();
