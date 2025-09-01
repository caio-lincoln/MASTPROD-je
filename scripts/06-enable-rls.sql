-- Habilitar Row Level Security (RLS) em todas as tabelas
alter table public.empresas enable row level security;
alter table public.funcionarios enable row level security;
alter table public.usuario_empresas enable row level security;
alter table public.exames_medicos enable row level security;
alter table public.treinamentos enable row level security;
alter table public.nao_conformidades enable row level security;

-- Criar função helper para verificar se usuário tem acesso à empresa
create or replace function user_has_access_to_company(company_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = company_id
  );
end;
$$ language plpgsql security definer;

-- Criar função helper para obter empresas do usuário
create or replace function get_user_companies()
returns setof uuid as $$
begin
  return query
  select ue.empresa_id
  from public.usuario_empresas ue
  where ue.user_id = auth.uid();
end;
$$ language plpgsql security definer;
