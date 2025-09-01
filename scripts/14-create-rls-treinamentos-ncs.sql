-- Ativar RLS para treinamentos
alter table public.treinamentos enable row level security;
alter table public.treinamento_funcionarios enable row level security;

-- Políticas RLS para treinamentos
create policy "Acesso por empresa (Treinamentos)"
on public.treinamentos
for select using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = treinamentos.empresa_id
  )
);

create policy "Insert por empresa (Treinamentos)"
on public.treinamentos
for insert with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = treinamentos.empresa_id
  )
);

create policy "Update por empresa (Treinamentos)"
on public.treinamentos
for update using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = treinamentos.empresa_id
  )
);

create policy "Delete por empresa (Treinamentos)"
on public.treinamentos
for delete using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = treinamentos.empresa_id
  )
);

-- Políticas RLS para treinamento_funcionarios
create policy "Acesso por empresa (Treinamento Funcionários)"
on public.treinamento_funcionarios
for select using (
  exists (
    select 1 from public.treinamentos t
    join public.usuario_empresas ue on ue.empresa_id = t.empresa_id
    where ue.user_id = auth.uid()
    and t.id = treinamento_funcionarios.treinamento_id
  )
);

create policy "Insert por empresa (Treinamento Funcionários)"
on public.treinamento_funcionarios
for insert with check (
  exists (
    select 1 from public.treinamentos t
    join public.usuario_empresas ue on ue.empresa_id = t.empresa_id
    where ue.user_id = auth.uid()
    and t.id = treinamento_funcionarios.treinamento_id
  )
);

-- Ativar RLS para não conformidades
alter table public.nao_conformidades enable row level security;

-- Políticas RLS para não conformidades
create policy "Acesso por empresa (NCs)"
on public.nao_conformidades
for select using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = nao_conformidades.empresa_id
  )
);

create policy "Insert por empresa (NCs)"
on public.nao_conformidades
for insert with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = nao_conformidades.empresa_id
  )
);

create policy "Update por empresa (NCs)"
on public.nao_conformidades
for update using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = nao_conformidades.empresa_id
  )
);

create policy "Delete por empresa (NCs)"
on public.nao_conformidades
for delete using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = nao_conformidades.empresa_id
  )
);
