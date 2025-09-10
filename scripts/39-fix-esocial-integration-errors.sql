-- Migração para corrigir erros do módulo eSocial Integration
-- Adiciona colunas faltantes e cria tabelas necessárias

-- 1. Adicionar colunas necessárias na tabela empresas
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS conectado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ambiente VARCHAR(20) DEFAULT 'producao',
ADD COLUMN IF NOT EXISTS ultima_verificacao TIMESTAMP WITH TIME ZONE;

-- 2. Criar tabela estatisticas_esocial se não existir
CREATE TABLE IF NOT EXISTS estatisticas_esocial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    total_eventos INTEGER DEFAULT 0,
    sucesso_eventos INTEGER DEFAULT 0,
    erro_eventos INTEGER DEFAULT 0,
    pendente_eventos INTEGER DEFAULT 0,
    tempo_medio DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela logs_esocial se não existir
CREATE TABLE IF NOT EXISTS logs_esocial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_estatisticas_esocial_empresa_id ON estatisticas_esocial(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_esocial_empresa_id ON logs_esocial(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_esocial_created_at ON logs_esocial(created_at DESC);

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE estatisticas_esocial ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_esocial ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para estatisticas_esocial
DROP POLICY IF EXISTS "Users can view statistics for their companies" ON estatisticas_esocial;
CREATE POLICY "Users can view statistics for their companies" ON estatisticas_esocial
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.empresa_id = estatisticas_esocial.empresa_id 
            AND ue.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert statistics for their companies" ON estatisticas_esocial;
CREATE POLICY "Users can insert statistics for their companies" ON estatisticas_esocial
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.empresa_id = estatisticas_esocial.empresa_id 
            AND ue.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update statistics for their companies" ON estatisticas_esocial;
CREATE POLICY "Users can update statistics for their companies" ON estatisticas_esocial
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.empresa_id = estatisticas_esocial.empresa_id 
            AND ue.usuario_id = auth.uid()
        )
    );

-- 7. Criar políticas RLS para logs_esocial
DROP POLICY IF EXISTS "Users can view logs for their companies" ON logs_esocial;
CREATE POLICY "Users can view logs for their companies" ON logs_esocial
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.empresa_id = logs_esocial.empresa_id 
            AND ue.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert logs for their companies" ON logs_esocial;
CREATE POLICY "Users can insert logs for their companies" ON logs_esocial
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.empresa_id = logs_esocial.empresa_id 
            AND ue.usuario_id = auth.uid()
        )
    );

-- 8. Inserir dados iniciais para estatisticas_esocial
INSERT INTO estatisticas_esocial (empresa_id, total_eventos, sucesso_eventos, erro_eventos, pendente_eventos, tempo_medio)
SELECT 
    e.id,
    0 as total_eventos,
    0 as sucesso_eventos,
    0 as erro_eventos,
    0 as pendente_eventos,
    0.0 as tempo_medio
FROM empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM estatisticas_esocial es WHERE es.empresa_id = e.id
);

-- 9. Inserir logs iniciais
INSERT INTO logs_esocial (empresa_id, tipo, descricao, detalhes)
SELECT 
    e.id,
    'SISTEMA' as tipo,
    'Sistema eSocial inicializado' as descricao,
    json_build_object('status', 'inicializado', 'timestamp', NOW()) as detalhes
FROM empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM logs_esocial ls WHERE ls.empresa_id = e.id AND ls.tipo = 'SISTEMA'
);

-- 10. Comentários sobre as correções
/*
Este script corrige os seguintes erros:
1. Erro: column empresas.conectado does not exist
   - Solução: Adiciona colunas conectado, ambiente e ultima_verificacao na tabela empresas

2. Erro: Could not find the table 'public.estatisticas_esocial' in the schema cache
   - Solução: Cria a tabela estatisticas_esocial com todas as colunas necessárias

3. Erro: Could not find the table 'public.logs_esocial' in the schema cache
   - Solução: Cria a tabela logs_esocial com todas as colunas necessárias

Todas as tabelas incluem:
- Políticas RLS apropriadas
- Índices para performance
- Dados iniciais para teste
*/
