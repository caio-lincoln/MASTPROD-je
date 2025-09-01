-- Atualizar políticas RLS para incluir exames_aso e outras tabelas

-- 1. Ativar RLS para exames_aso
ALTER TABLE public.exames_aso ENABLE ROW LEVEL SECURITY;

-- 2. Política RLS para exames_aso (acesso através do funcionário)
CREATE POLICY "Acesso por funcionário autorizado"
ON public.exames_aso
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.funcionarios f
    JOIN public.usuario_empresas ue ON ue.empresa_id = f.empresa_id
    WHERE f.id = exames_aso.funcionario_id
    AND ue.user_id = auth.uid()
  )
);

-- 3. Ativar RLS para outras tabelas importantes
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exames_medicos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para treinamentos
CREATE POLICY "Acesso treinamentos por empresa"
ON public.treinamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = treinamentos.empresa_id
  )
);

-- 5. Políticas RLS para não conformidades
CREATE POLICY "Acesso NC por empresa"
ON public.nao_conformidades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = nao_conformidades.empresa_id
  )
);

-- 6. Políticas RLS para exames médicos
CREATE POLICY "Acesso exames médicos por empresa"
ON public.exames_medicos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = exames_medicos.empresa_id
  )
);

-- 7. Política mais específica para funcionários (CRUD completo)
DROP POLICY IF EXISTS "Acesso por empresa" ON public.funcionarios;

CREATE POLICY "Funcionários - SELECT por empresa"
ON public.funcionarios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = funcionarios.empresa_id
  )
);

CREATE POLICY "Funcionários - INSERT por empresa"
ON public.funcionarios
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = funcionarios.empresa_id
  )
);

CREATE POLICY "Funcionários - UPDATE por empresa"
ON public.funcionarios
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = funcionarios.empresa_id
  )
);

CREATE POLICY "Funcionários - DELETE por empresa"
ON public.funcionarios
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = funcionarios.empresa_id
  )
);
