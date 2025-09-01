-- Políticas RLS para tabela empresas
create policy "Usuários podem ver apenas suas empresas"
  on public.empresas for select
  using (id in (select get_user_companies()));

create policy "Usuários podem atualizar apenas suas empresas"
  on public.empresas for update
  using (id in (select get_user_companies()));

create policy "Admins podem inserir empresas"
  on public.empresas for insert
  with check (auth.uid() is not null);

-- Políticas RLS para tabela funcionarios
create policy "Usuários podem ver funcionários de suas empresas"
  on public.funcionarios for select
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem inserir funcionários em suas empresas"
  on public.funcionarios for insert
  with check (user_has_access_to_company(empresa_id));

create policy "Usuários podem atualizar funcionários de suas empresas"
  on public.funcionarios for update
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem deletar funcionários de suas empresas"
  on public.funcionarios for delete
  using (user_has_access_to_company(empresa_id));

-- Políticas RLS para tabela usuario_empresas
create policy "Usuários podem ver seus próprios relacionamentos"
  on public.usuario_empresas for select
  using (user_id = auth.uid());

create policy "Admins podem gerenciar relacionamentos"
  on public.usuario_empresas for all
  using (auth.uid() is not null);

-- Políticas RLS para tabela exames_medicos
create policy "Usuários podem ver exames de suas empresas"
  on public.exames_medicos for select
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem inserir exames em suas empresas"
  on public.exames_medicos for insert
  with check (user_has_access_to_company(empresa_id));

create policy "Usuários podem atualizar exames de suas empresas"
  on public.exames_medicos for update
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem deletar exames de suas empresas"
  on public.exames_medicos for delete
  using (user_has_access_to_company(empresa_id));

-- Políticas RLS para tabela treinamentos
create policy "Usuários podem ver treinamentos de suas empresas"
  on public.treinamentos for select
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem inserir treinamentos em suas empresas"
  on public.treinamentos for insert
  with check (user_has_access_to_company(empresa_id));

create policy "Usuários podem atualizar treinamentos de suas empresas"
  on public.treinamentos for update
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem deletar treinamentos de suas empresas"
  on public.treinamentos for delete
  using (user_has_access_to_company(empresa_id));

-- Políticas RLS para tabela nao_conformidades
create policy "Usuários podem ver NCs de suas empresas"
  on public.nao_conformidades for select
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem inserir NCs em suas empresas"
  on public.nao_conformidades for insert
  with check (user_has_access_to_company(empresa_id));

create policy "Usuários podem atualizar NCs de suas empresas"
  on public.nao_conformidades for update
  using (user_has_access_to_company(empresa_id));

create policy "Usuários podem deletar NCs de suas empresas"
  on public.nao_conformidades for delete
  using (user_has_access_to_company(empresa_id));
