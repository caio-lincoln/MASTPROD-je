-- Criar tabela de empresas
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  endereco text,
  telefone text,
  email text,
  logo_url text,
  status boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Criar índices para melhor performance
create index idx_empresas_cnpj on public.empresas(cnpj);
create index idx_empresas_status on public.empresas(status);

-- Trigger para atualizar updated_at automaticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_empresas_updated_at
  before update on public.empresas
  for each row execute function update_updated_at_column();
