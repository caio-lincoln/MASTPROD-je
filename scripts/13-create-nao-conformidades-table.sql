-- Criação da tabela de não conformidades
create table public.nao_conformidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text, -- por exemplo: segurança, processo, qualidade
  severidade text, -- leve, moderada, crítica
  responsavel text,
  prazo_resolucao date,
  status text default 'pendente',
  evidencias_url text, -- link de arquivos enviados
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para otimização
create index idx_nao_conformidades_empresa_id on public.nao_conformidades(empresa_id);
create index idx_nao_conformidades_status on public.nao_conformidades(status);
create index idx_nao_conformidades_severidade on public.nao_conformidades(severidade);
create index idx_nao_conformidades_prazo on public.nao_conformidades(prazo_resolucao);

-- Trigger para updated_at
create trigger update_nao_conformidades_updated_at
  before update on public.nao_conformidades
  for each row execute function update_updated_at_column();
