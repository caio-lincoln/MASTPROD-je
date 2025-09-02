-- Criar tabelas faltantes para completar o sistema SST
-- Executar após todos os scripts anteriores

-- Tabela para gestão de riscos (PGR)
CREATE TABLE IF NOT EXISTS gestao_riscos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    setor VARCHAR(100) NOT NULL,
    atividade TEXT NOT NULL,
    agente_risco VARCHAR(100) NOT NULL,
    tipo_risco VARCHAR(50) NOT NULL CHECK (tipo_risco IN ('físico', 'químico', 'biológico', 'ergonômico', 'acidente')),
    probabilidade INTEGER NOT NULL CHECK (probabilidade BETWEEN 1 AND 5),
    severidade INTEGER NOT NULL CHECK (severidade BETWEEN 1 AND 5),
    nivel_risco INTEGER GENERATED ALWAYS AS (probabilidade * severidade) STORED,
    medidas_controle TEXT[],
    responsavel VARCHAR(100),
    prazo_implementacao DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    observacoes TEXT,
    pgr_url VARCHAR(500), -- URL do documento PGR no storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para gestao_riscos
CREATE INDEX idx_gestao_riscos_empresa ON gestao_riscos(empresa_id);
CREATE INDEX idx_gestao_riscos_tipo ON gestao_riscos(tipo_risco);
CREATE INDEX idx_gestao_riscos_nivel ON gestao_riscos(nivel_risco);
CREATE INDEX idx_gestao_riscos_status ON gestao_riscos(status);

-- Trigger para updated_at
CREATE TRIGGER update_gestao_riscos_updated_at
    BEFORE UPDATE ON gestao_riscos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabela para logs gerais do sistema
CREATE TABLE IF NOT EXISTS logs_gerais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    modulo VARCHAR(50) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT,
    arquivo_url VARCHAR(500), -- URL do arquivo no storage (relatórios)
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs_gerais
CREATE INDEX idx_logs_gerais_empresa ON logs_gerais(empresa_id);
CREATE INDEX idx_logs_gerais_usuario ON logs_gerais(usuario_id);
CREATE INDEX idx_logs_gerais_modulo ON logs_gerais(modulo);
CREATE INDEX idx_logs_gerais_created ON logs_gerais(created_at);

-- Tabela para backups do sistema (opcional - admin)
CREATE TABLE IF NOT EXISTS backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_backup VARCHAR(50) NOT NULL CHECK (tipo_backup IN ('completo', 'incremental', 'modulo')),
    modulos TEXT[], -- quais módulos foram incluídos
    tamanho_bytes BIGINT,
    arquivo_url VARCHAR(500) NOT NULL, -- URL do arquivo no storage
    status VARCHAR(20) DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
    erro_mensagem TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- Índices para backups
CREATE INDEX idx_backups_empresa ON backups(empresa_id);
CREATE INDEX idx_backups_created_by ON backups(created_by);
CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_expires ON backups(expires_at);

-- Atualizar tabela biblioteca_documentos para incluir campos faltantes
ALTER TABLE biblioteca_documentos 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS versao VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS data_validade DATE,
ADD COLUMN IF NOT EXISTS status_documento VARCHAR(20) DEFAULT 'ativo' CHECK (status_documento IN ('ativo', 'vencido', 'arquivado'));

-- Atualizar tabela treinamento_funcionarios para incluir certificado_url
ALTER TABLE treinamento_funcionarios 
ADD COLUMN IF NOT EXISTS certificado_url VARCHAR(500);

-- Atualizar tabela eventos_esocial para incluir xml_url
ALTER TABLE eventos_esocial 
ADD COLUMN IF NOT EXISTS xml_url VARCHAR(500);

-- Inserir dados de exemplo para gestao_riscos
INSERT INTO gestao_riscos (empresa_id, setor, atividade, agente_risco, tipo_risco, probabilidade, severidade, medidas_controle, responsavel, prazo_implementacao, status, observacoes) 
SELECT 
    e.id,
    'Produção',
    'Operação de máquinas',
    'Ruído',
    'físico',
    3,
    4,
    ARRAY['Protetor auricular', 'Manutenção preventiva', 'Treinamento'],
    'João Silva',
    CURRENT_DATE + INTERVAL '30 days',
    'em_andamento',
    'Monitoramento mensal dos níveis de ruído'
FROM empresas e
WHERE e.ativo = true
LIMIT 3;

INSERT INTO gestao_riscos (empresa_id, setor, atividade, agente_risco, tipo_risco, probabilidade, severidade, medidas_controle, responsavel, prazo_implementacao, status) 
SELECT 
    e.id,
    'Escritório',
    'Trabalho em computador',
    'Postura inadequada',
    'ergonômico',
    2,
    3,
    ARRAY['Cadeira ergonômica', 'Pausas regulares', 'Ginástica laboral'],
    'Maria Santos',
    CURRENT_DATE + INTERVAL '15 days',
    'pendente'
FROM empresas e
WHERE e.ativo = true
LIMIT 3;

-- Inserir logs de exemplo
INSERT INTO logs_gerais (empresa_id, modulo, acao, descricao)
SELECT 
    e.id,
    'dashboard',
    'visualizacao',
    'Usuário acessou o dashboard'
FROM empresas e
WHERE e.ativo = true
LIMIT 5;

COMMIT;
