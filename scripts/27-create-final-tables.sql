-- =====================================================
-- Script 27: Criar Tabelas Finais do Sistema SST
-- Tabelas: documentos, relatorios_gerados, configuracoes_sistema
-- =====================================================

-- 1. Tabela de Documentos (Biblioteca Digital)
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL, -- Ex: "Programa", "Norma Regulamentadora", "Procedimento", "Manual", "Formulário", "Certificado"
  tipo TEXT DEFAULT 'PDF', -- Ex: "PDF", "DOCX", "XLSX"
  tamanho TEXT DEFAULT '0 KB', -- Ex: "2.5 MB", "850 KB"
  versao TEXT NOT NULL, -- Ex: "v1.0", "v2.3"
  validade DATE, -- Data de vencimento (opcional)
  arquivo_url TEXT, -- URL do arquivo no Supabase Storage
  responsavel TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  visualizacoes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Vencendo', 'Vencido', 'Arquivado')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para documentos
CREATE INDEX IF NOT EXISTS idx_documentos_empresa_id ON public.documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON public.documentos(categoria);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON public.documentos(status);
CREATE INDEX IF NOT EXISTS idx_documentos_validade ON public.documentos(validade);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  
  -- Atualizar status baseado na validade
  IF NEW.validade IS NOT NULL THEN
    IF NEW.validade < CURRENT_DATE THEN
      NEW.status = 'Vencido';
    ELSIF NEW.validade <= CURRENT_DATE + INTERVAL '30 days' THEN
      NEW.status = 'Vencendo';
    ELSIF NEW.status IN ('Vencido', 'Vencendo') THEN
      NEW.status = 'Ativo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_documentos_updated_at();

-- 2. Tabela de Relatórios Gerados
CREATE TABLE IF NOT EXISTS public.relatorios_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modulo TEXT NOT NULL, -- Ex: "ASO", "Treinamentos", "NC", "Dashboard", "eSocial"
  tipo_relatorio TEXT NOT NULL, -- Ex: "PDF", "Excel", "CSV"
  titulo TEXT NOT NULL,
  parametros JSONB, -- Filtros e parâmetros usados para gerar o relatório
  arquivo_url TEXT, -- URL do arquivo gerado no Supabase Storage
  tamanho_arquivo TEXT,
  status TEXT DEFAULT 'Gerado' CHECK (status IN ('Gerando', 'Gerado', 'Erro', 'Expirado')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expira_em TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days') -- Relatórios expiram em 30 dias
);

-- Índices para relatórios gerados
CREATE INDEX IF NOT EXISTS idx_relatorios_empresa_id ON public.relatorios_gerados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_usuario_id ON public.relatorios_gerados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_modulo ON public.relatorios_gerados(modulo);
CREATE INDEX IF NOT EXISTS idx_relatorios_status ON public.relatorios_gerados(status);
CREATE INDEX IF NOT EXISTS idx_relatorios_criado_em ON public.relatorios_gerados(criado_em);

-- 3. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave TEXT NOT NULL, -- Ex: "aso_alert_days", "language", "email_notifications"
  valor TEXT NOT NULL, -- Ex: "15", "pt-BR", "true"
  descricao TEXT, -- Descrição da configuração
  tipo TEXT DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id, chave) -- Uma chave por empresa
);

-- Índices para configurações
CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_id ON public.configuracoes_sistema(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_chave ON public.configuracoes_sistema(chave);

-- Trigger para atualizar timestamp das configurações
CREATE OR REPLACE FUNCTION update_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracoes_updated_at();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas para DOCUMENTOS
CREATE POLICY "Usuários podem ver documentos de suas empresas" ON public.documentos
  FOR SELECT USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir documentos em suas empresas" ON public.documentos
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar documentos de suas empresas" ON public.documentos
  FOR UPDATE USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar documentos de suas empresas" ON public.documentos
  FOR DELETE USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

-- Políticas para RELATÓRIOS GERADOS
CREATE POLICY "Usuários podem ver relatórios de suas empresas" ON public.relatorios_gerados
  FOR SELECT USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir relatórios em suas empresas" ON public.relatorios_gerados
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar relatórios de suas empresas" ON public.relatorios_gerados
  FOR UPDATE USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar relatórios de suas empresas" ON public.relatorios_gerados
  FOR DELETE USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

-- Políticas para CONFIGURAÇÕES DO SISTEMA
CREATE POLICY "Usuários podem ver configurações de suas empresas" ON public.configuracoes_sistema
  FOR SELECT USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir configurações em suas empresas" ON public.configuracoes_sistema
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar configurações de suas empresas" ON public.configuracoes_sistema
  FOR UPDATE USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar configurações de suas empresas" ON public.configuracoes_sistema
  FOR DELETE USING (
    empresa_id IN (
      SELECT ue.empresa_id 
      FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

-- =====================================================
-- INSERIR CONFIGURAÇÕES PADRÃO
-- =====================================================

-- Função para inserir configurações padrão para uma empresa
CREATE OR REPLACE FUNCTION inserir_configuracoes_padrao(empresa_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Configurações de alertas
  INSERT INTO public.configuracoes_sistema (empresa_id, chave, valor, descricao, tipo)
  VALUES 
    (empresa_uuid, 'aso_alert_days', '30', 'Dias de antecedência para alertar sobre vencimento de ASO', 'number'),
    (empresa_uuid, 'training_alert_days', '15', 'Dias de antecedência para alertar sobre vencimento de treinamentos', 'number'),
    (empresa_uuid, 'document_alert_days', '30', 'Dias de antecedência para alertar sobre vencimento de documentos', 'number'),
    
    -- Configurações de interface
    (empresa_uuid, 'language', 'pt-BR', 'Idioma do sistema', 'string'),
    (empresa_uuid, 'timezone', 'America/Sao_Paulo', 'Fuso horário', 'string'),
    (empresa_uuid, 'date_format', 'dd/MM/yyyy', 'Formato de data', 'string'),
    
    -- Configurações de notificações
    (empresa_uuid, 'email_notifications', 'true', 'Habilitar notificações por email', 'boolean'),
    (empresa_uuid, 'system_notifications', 'true', 'Habilitar notificações do sistema', 'boolean'),
    (empresa_uuid, 'notification_frequency', 'daily', 'Frequência das notificações (daily, weekly, monthly)', 'string'),
    
    -- Configurações de módulos
    (empresa_uuid, 'enable_esocial', 'true', 'Habilitar integração eSocial', 'boolean'),
    (empresa_uuid, 'enable_audit_logs', 'true', 'Habilitar logs de auditoria', 'boolean'),
    (empresa_uuid, 'auto_backup', 'true', 'Habilitar backup automático', 'boolean'),
    
    -- Configurações de relatórios
    (empresa_uuid, 'report_retention_days', '90', 'Dias para manter relatórios gerados', 'number'),
    (empresa_uuid, 'max_report_size_mb', '50', 'Tamanho máximo de relatório em MB', 'number')
  ON CONFLICT (empresa_id, chave) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger para inserir configurações padrão ao criar uma empresa
CREATE OR REPLACE FUNCTION trigger_inserir_configuracoes_padrao()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM inserir_configuracoes_padrao(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela empresas (se não existir)
DROP TRIGGER IF EXISTS trigger_empresa_configuracoes_padrao ON public.empresas;
CREATE TRIGGER trigger_empresa_configuracoes_padrao
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_inserir_configuracoes_padrao();

-- Inserir configurações padrão para empresas existentes
DO $$
DECLARE
  empresa_record RECORD;
BEGIN
  FOR empresa_record IN SELECT id FROM public.empresas LOOP
    PERFORM inserir_configuracoes_padrao(empresa_record.id);
  END LOOP;
END $$;

-- =====================================================
-- FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Função para obter configuração de uma empresa
CREATE OR REPLACE FUNCTION get_empresa_config(empresa_uuid UUID, config_key TEXT)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT valor INTO config_value
  FROM public.configuracoes_sistema
  WHERE empresa_id = empresa_uuid AND chave = config_key;
  
  RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para definir configuração de uma empresa
CREATE OR REPLACE FUNCTION set_empresa_config(empresa_uuid UUID, config_key TEXT, config_value TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.configuracoes_sistema (empresa_id, chave, valor)
  VALUES (empresa_uuid, config_key, config_value)
  ON CONFLICT (empresa_id, chave) 
  DO UPDATE SET valor = config_value, atualizado_em = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar relatórios expirados
CREATE OR REPLACE FUNCTION limpar_relatorios_expirados()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.relatorios_gerados 
  SET status = 'Expirado'
  WHERE expira_em < NOW() AND status = 'Gerado';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.documentos IS 'Armazena documentos da biblioteca digital de cada empresa';
COMMENT ON TABLE public.relatorios_gerados IS 'Histórico de relatórios gerados pelos usuários';
COMMENT ON TABLE public.configuracoes_sistema IS 'Configurações personalizáveis por empresa';

COMMENT ON COLUMN public.documentos.status IS 'Status calculado automaticamente baseado na data de validade';
COMMENT ON COLUMN public.relatorios_gerados.parametros IS 'JSON com filtros e parâmetros usados na geração';
COMMENT ON COLUMN public.configuracoes_sistema.tipo IS 'Tipo de dado para validação no frontend';

-- =====================================================
-- GRANTS E PERMISSÕES
-- =====================================================

-- Conceder permissões para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_gerados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_sistema TO authenticated;

-- Conceder permissões para funções utilitárias
GRANT EXECUTE ON FUNCTION get_empresa_config(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_empresa_config(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION limpar_relatorios_expirados() TO authenticated;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Inserir alguns documentos de exemplo para teste
INSERT INTO public.documentos (empresa_id, titulo, categoria, tipo, tamanho, versao, validade, responsavel, downloads, visualizacoes, status)
SELECT 
  e.id,
  'PGR - Programa de Gerenciamento de Riscos 2024',
  'Programa',
  'PDF',
  '2.5 MB',
  '3.1',
  CURRENT_DATE + INTERVAL '1 year',
  'João Santos',
  45,
  128,
  'Ativo'
FROM public.empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM public.documentos d 
  WHERE d.empresa_id = e.id AND d.titulo LIKE 'PGR%'
);

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE 'Script 27 executado com sucesso: Tabelas finais criadas (documentos, relatorios_gerados, configuracoes_sistema)';
END $$;
