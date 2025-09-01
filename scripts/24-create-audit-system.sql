-- =====================================================
-- ETAPA 17: SISTEMA DE AUDITORIA E LOGGING
-- =====================================================

-- 1. Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES public.empresas(id),
  acao TEXT NOT NULL, -- 'criar', 'editar', 'excluir', 'visualizar'
  entidade TEXT NOT NULL, -- 'funcionario', 'aso', 'nc', 'treinamento', etc.
  entidade_id UUID, -- ID do item afetado
  descricao TEXT, -- Descrição detalhada da ação
  dados_anteriores JSONB, -- Estado anterior (para edições)
  dados_novos JSONB, -- Estado novo (para criações/edições)
  ip_address INET, -- IP do usuário
  user_agent TEXT, -- Browser/dispositivo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_user_id ON public.logs_auditoria(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_empresa_id ON public.logs_auditoria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_entidade ON public.logs_auditoria(entidade);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_acao ON public.logs_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_created_at ON public.logs_auditoria(created_at DESC);

-- 2. Função para registrar ações de auditoria
CREATE OR REPLACE FUNCTION public.log_acao(
  acao_input TEXT,
  entidade_input TEXT,
  entidade_id_input UUID DEFAULT NULL,
  descricao_input TEXT DEFAULT NULL,
  dados_anteriores_input JSONB DEFAULT NULL,
  dados_novos_input JSONB DEFAULT NULL,
  ip_address_input INET DEFAULT NULL,
  user_agent_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
  current_empresa_id UUID;
BEGIN
  -- Obter empresa atual do usuário (se aplicável)
  SELECT empresa_id INTO current_empresa_id
  FROM public.usuario_empresas 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  -- Inserir log de auditoria
  INSERT INTO public.logs_auditoria (
    user_id,
    empresa_id,
    acao,
    entidade,
    entidade_id,
    descricao,
    dados_anteriores,
    dados_novos,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    current_empresa_id,
    acao_input,
    entidade_input,
    entidade_id_input,
    descricao_input,
    dados_anteriores_input,
    dados_novos_input,
    ip_address_input,
    user_agent_input
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- 3. Triggers automáticas para tabelas críticas

-- Trigger para funcionários
CREATE OR REPLACE FUNCTION log_funcionarios_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_acao(
      'criar',
      'funcionario',
      NEW.id,
      'Funcionário criado: ' || NEW.nome,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_acao(
      'editar',
      'funcionario',
      NEW.id,
      'Funcionário editado: ' || NEW.nome,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_acao(
      'excluir',
      'funcionario',
      OLD.id,
      'Funcionário excluído: ' || OLD.nome,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_funcionarios_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION log_funcionarios_changes();

-- Trigger para não conformidades
CREATE OR REPLACE FUNCTION log_nao_conformidades_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_acao(
      'criar',
      'nao_conformidade',
      NEW.id,
      'NC criada: ' || NEW.titulo,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_acao(
      'editar',
      'nao_conformidade',
      NEW.id,
      'NC editada: ' || NEW.titulo,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_acao(
      'excluir',
      'nao_conformidade',
      OLD.id,
      'NC excluída: ' || OLD.titulo,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_nao_conformidades_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.nao_conformidades
  FOR EACH ROW EXECUTE FUNCTION log_nao_conformidades_changes();

-- Trigger para exames/ASO
CREATE OR REPLACE FUNCTION log_exames_aso_changes()
RETURNS TRIGGER AS $$
DECLARE
  funcionario_nome TEXT;
BEGIN
  -- Buscar nome do funcionário
  SELECT nome INTO funcionario_nome 
  FROM public.funcionarios 
  WHERE id = COALESCE(NEW.funcionario_id, OLD.funcionario_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_acao(
      'criar',
      'exame_aso',
      NEW.id,
      'Exame/ASO criado para: ' || COALESCE(funcionario_nome, 'N/A'),
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_acao(
      'editar',
      'exame_aso',
      NEW.id,
      'Exame/ASO editado para: ' || COALESCE(funcionario_nome, 'N/A'),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_acao(
      'excluir',
      'exame_aso',
      OLD.id,
      'Exame/ASO excluído para: ' || COALESCE(funcionario_nome, 'N/A'),
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_exames_aso_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.exames_aso
  FOR EACH ROW EXECUTE FUNCTION log_exames_aso_changes();

-- 4. View para facilitar consultas de auditoria
CREATE OR REPLACE VIEW public.view_logs_auditoria AS
SELECT 
  la.id,
  la.acao,
  la.entidade,
  la.entidade_id,
  la.descricao,
  la.created_at,
  la.ip_address,
  la.user_agent,
  -- Dados do usuário
  au.email as usuario_email,
  au.raw_user_meta_data->>'full_name' as usuario_nome,
  -- Dados da empresa
  e.nome as empresa_nome,
  e.cnpj as empresa_cnpj,
  -- Formatação amigável
  CASE la.acao
    WHEN 'criar' THEN '✅ Criação'
    WHEN 'editar' THEN '✏️ Edição'
    WHEN 'excluir' THEN '🗑️ Exclusão'
    WHEN 'visualizar' THEN '👁️ Visualização'
    ELSE la.acao
  END as acao_formatada,
  CASE la.entidade
    WHEN 'funcionario' THEN '👤 Funcionário'
    WHEN 'nao_conformidade' THEN '⚠️ Não Conformidade'
    WHEN 'exame_aso' THEN '🏥 Exame/ASO'
    WHEN 'treinamento' THEN '📚 Treinamento'
    WHEN 'inspecao' THEN '🔍 Inspeção'
    WHEN 'incidente' THEN '🚨 Incidente'
    WHEN 'epi' THEN '🦺 EPI'
    ELSE la.entidade
  END as entidade_formatada
FROM public.logs_auditoria la
LEFT JOIN auth.users au ON la.user_id = au.id
LEFT JOIN public.empresas e ON la.empresa_id = e.id
ORDER BY la.created_at DESC;

-- 5. Políticas RLS para logs de auditoria
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas logs das suas empresas
CREATE POLICY "Usuários podem ver logs das suas empresas" ON public.logs_auditoria
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Apenas o sistema pode inserir logs (via função)
CREATE POLICY "Sistema pode inserir logs" ON public.logs_auditoria
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- View também precisa de política
CREATE POLICY "Usuários podem ver view de logs das suas empresas" ON public.logs_auditoria
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- 6. Função para buscar logs com filtros
CREATE OR REPLACE FUNCTION public.get_logs_auditoria(
  empresa_filter UUID DEFAULT NULL,
  entidade_filter TEXT DEFAULT NULL,
  acao_filter TEXT DEFAULT NULL,
  data_inicio DATE DEFAULT NULL,
  data_fim DATE DEFAULT NULL,
  limite INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  acao TEXT,
  entidade TEXT,
  entidade_id UUID,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  usuario_email TEXT,
  usuario_nome TEXT,
  empresa_nome TEXT,
  acao_formatada TEXT,
  entidade_formatada TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vla.id,
    vla.acao,
    vla.entidade,
    vla.entidade_id,
    vla.descricao,
    vla.created_at,
    vla.usuario_email,
    vla.usuario_nome,
    vla.empresa_nome,
    vla.acao_formatada,
    vla.entidade_formatada
  FROM public.view_logs_auditoria vla
  WHERE 
    (empresa_filter IS NULL OR vla.empresa_nome ILIKE '%' || empresa_filter || '%')
    AND (entidade_filter IS NULL OR vla.entidade = entidade_filter)
    AND (acao_filter IS NULL OR vla.acao = acao_filter)
    AND (data_inicio IS NULL OR DATE(vla.created_at) >= data_inicio)
    AND (data_fim IS NULL OR DATE(vla.created_at) <= data_fim)
  ORDER BY vla.created_at DESC
  LIMIT limite;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.logs_auditoria IS 'Tabela para auditoria de ações do usuário no sistema SST';
COMMENT ON FUNCTION public.log_acao IS 'Função para registrar ações de auditoria no sistema';
COMMENT ON VIEW public.view_logs_auditoria IS 'View formatada para consulta de logs de auditoria';
