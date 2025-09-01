-- RLS para tabelas de EPIs
-- Garantir que usuários vejam apenas EPIs das empresas autorizadas

-- 1. RLS para tabela epis
alter table public.epis enable row level security;

create policy "Acesso por empresa (EPIs)"
on public.epis
for select using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = epis.empresa_id
  )
);

create policy "Inserir EPIs por empresa"
on public.epis
for insert with check (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = epis.empresa_id
  )
);

create policy "Atualizar EPIs por empresa"
on public.epis
for update using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = epis.empresa_id
  )
);

create policy "Deletar EPIs por empresa"
on public.epis
for delete using (
  exists (
    select 1 from public.usuario_empresas ue
    where ue.user_id = auth.uid()
    and ue.empresa_id = epis.empresa_id
  )
);

-- 2. RLS para tabela entregas_epi
alter table public.entregas_epi enable row level security;

create policy "Acesso entregas EPI por empresa"
on public.entregas_epi
for select using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = entregas_epi.epi_id
  )
);

create policy "Inserir entregas EPI por empresa"
on public.entregas_epi
for insert with check (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = entregas_epi.epi_id
  )
);

create policy "Atualizar entregas EPI por empresa"
on public.entregas_epi
for update using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = entregas_epi.epi_id
  )
);

create policy "Deletar entregas EPI por empresa"
on public.entregas_epi
for delete using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = entregas_epi.epi_id
  )
);

-- 3. RLS para tabela inspecoes_epi
alter table public.inspecoes_epi enable row level security;

create policy "Acesso inspeções EPI por empresa"
on public.inspecoes_epi
for select using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = inspecoes_epi.epi_id
  )
);

create policy "Inserir inspeções EPI por empresa"
on public.inspecoes_epi
for insert with check (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = inspecoes_epi.epi_id
  )
);

create policy "Atualizar inspeções EPI por empresa"
on public.inspecoes_epi
for update using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = inspecoes_epi.epi_id
  )
);

create policy "Deletar inspeções EPI por empresa"
on public.inspecoes_epi
for delete using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = inspecoes_epi.epi_id
  )
);

-- 4. RLS para tabela manutencoes_epi
alter table public.manutencoes_epi enable row level security;

create policy "Acesso manutenções EPI por empresa"
on public.manutencoes_epi
for select using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = manutencoes_epi.epi_id
  )
);

create policy "Inserir manutenções EPI por empresa"
on public.manutencoes_epi
for insert with check (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = manutencoes_epi.epi_id
  )
);

create policy "Atualizar manutenções EPI por empresa"
on public.manutencoes_epi
for update using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = manutencoes_epi.epi_id
  )
);

create policy "Deletar manutenções EPI por empresa"
on public.manutencoes_epi
for delete using (
  exists (
    select 1 from public.epis e
    join public.usuario_empresas ue on ue.empresa_id = e.empresa_id
    where ue.user_id = auth.uid()
    and e.id = manutencoes_epi.epi_id
  )
);
