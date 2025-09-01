-- Função para obter dados do dashboard por empresa
create or replace function get_dashboard_stats(company_id uuid)
returns json as $$
declare
  result json;
begin
  -- Verificar se usuário tem acesso à empresa
  if not user_has_access_to_company(company_id) then
    raise exception 'Acesso negado à empresa';
  end if;

  select json_build_object(
    'total_funcionarios', (
      select count(*) from public.funcionarios 
      where empresa_id = company_id and status = true
    ),
    'exames_pendentes', (
      select count(*) from public.exames_medicos 
      where empresa_id = company_id and status = 'agendado'
    ),
    'treinamentos_ativos', (
      select count(*) from public.treinamentos 
      where empresa_id = company_id and status = 'em_andamento'
    ),
    'ncs_abertas', (
      select count(*) from public.nao_conformidades 
      where empresa_id = company_id and status in ('aberta', 'em_analise')
    )
  ) into result;

  return result;
end;
$$ language plpgsql security definer;

-- Função para criar relacionamento usuário-empresa
create or replace function add_user_to_company(user_email text, company_id uuid, user_role text default 'user')
returns boolean as $$
declare
  target_user_id uuid;
begin
  -- Buscar ID do usuário pelo email
  select id into target_user_id
  from auth.users
  where email = user_email;

  if target_user_id is null then
    raise exception 'Usuário não encontrado';
  end if;

  -- Inserir relacionamento
  insert into public.usuario_empresas (user_id, empresa_id, role)
  values (target_user_id, company_id, user_role)
  on conflict (user_id, empresa_id) do update set role = user_role;

  return true;
exception
  when others then
    return false;
end;
$$ language plpgsql security definer;
