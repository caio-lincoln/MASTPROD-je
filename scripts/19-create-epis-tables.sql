-- Etapa 14: Criar estrutura completa para gerenciamento de EPIs
-- Tabelas: epis, entregas_epi, inspecoes_epi, manutencoes_epi

-- 1. Tabela de EPIs
create table public.epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text,
  numero_ca text, -- Número do Certificado de Aprovação
  data_validade_ca date,
  status text default 'ativo', -- ativo, em manutenção, inativo
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Tabela de Distribuição de EPIs para Funcionários
create table public.entregas_epi (
  id uuid primary key default gen_random_uuid(),
  epi_id uuid references public.epis(id) on delete cascade,
  funcionario_id uuid references public.funcionarios(id) on delete cascade,
  data_entrega date not null,
  quantidade integer default 1,
  responsavel text,
  observacoes text,
  assinatura_url text, -- PDF ou imagem da ficha de entrega
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Tabela de Inspeções de EPIs
create table public.inspecoes_epi (
  id uuid primary key default gen_random_uuid(),
  epi_id uuid references public.epis(id) on delete cascade,
  data_inspecao date not null,
  resultado text, -- aprovado, reprovado
  responsavel text,
  observacoes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Tabela de Manutenção de EPIs
create table public.manutencoes_epi (
  id uuid primary key default gen_random_uuid(),
  epi_id uuid references public.epis(id) on delete cascade,
  tipo text, -- preventiva, corretiva
  data_manutencao date not null,
  responsavel text,
  descricao text,
  status text default 'realizada',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para otimização
create index idx_epis_empresa_id on public.epis(empresa_id);
create index idx_epis_status on public.epis(status);
create index idx_entregas_epi_funcionario_id on public.entregas_epi(funcionario_id);
create index idx_entregas_epi_epi_id on public.entregas_epi(epi_id);
create index idx_inspecoes_epi_epi_id on public.inspecoes_epi(epi_id);
create index idx_inspecoes_epi_data on public.inspecoes_epi(data_inspecao);
create index idx_manutencoes_epi_epi_id on public.manutencoes_epi(epi_id);
create index idx_manutencoes_epi_data on public.manutencoes_epi(data_manutencao);

-- Triggers para updated_at
create trigger update_epis_updated_at
  before update on public.epis
  for each row execute function update_updated_at_column();

create trigger update_entregas_epi_updated_at
  before update on public.entregas_epi
  for each row execute function update_updated_at_column();

create trigger update_inspecoes_epi_updated_at
  before update on public.inspecoes_epi
  for each row execute function update_updated_at_column();

create trigger update_manutencoes_epi_updated_at
  before update on public.manutencoes_epi
  for each row execute function update_updated_at_column();
