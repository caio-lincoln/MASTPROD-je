-- Script para corrigir colunas e tabelas faltantes identificadas nos logs

-- Verificar se a tabela gestao_riscos existe, se não, criar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gestao_riscos') THEN
        CREATE TABLE gestao_riscos (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            tipo_risco VARCHAR(100) NOT NULL,
            descricao TEXT NOT NULL,
            probabilidade INTEGER CHECK (probabilidade BETWEEN 1 AND 5),
            severidade INTEGER CHECK (severidade BETWEEN 1 AND 5),
            nivel_risco INTEGER GENERATED ALWAYS AS (probabilidade * severidade) STORED,
            medidas_controle TEXT[],
            responsavel VARCHAR(255),
            prazo_implementacao DATE,
            status VARCHAR(50) DEFAULT 'pendente',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_gestao_riscos_empresa ON gestao_riscos(empresa_id);
        CREATE INDEX idx_gestao_riscos_nivel ON gestao_riscos(nivel_risco);
    END IF;
END $$;

-- Adicionar coluna empresa_id à tabela exames_aso se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'exames_aso' AND column_name = 'empresa_id') THEN
        ALTER TABLE exames_aso ADD COLUMN empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
        CREATE INDEX idx_exames_aso_empresa ON exames_aso(empresa_id);
        
        -- Atualizar registros existentes com empresa_id baseado no funcionário
        UPDATE exames_aso 
        SET empresa_id = f.empresa_id 
        FROM funcionarios f 
        WHERE exames_aso.funcionario_id = f.id;
    END IF;
END $$;

-- Adicionar coluna ativo à tabela funcionarios se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'funcionarios' AND column_name = 'ativo') THEN
        ALTER TABLE funcionarios ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Verificar se a coluna nome existe na tabela treinamentos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'treinamentos' AND column_name = 'nome') THEN
        -- Se a tabela existe mas não tem a coluna nome, adicionar
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'treinamentos') THEN
            ALTER TABLE treinamentos ADD COLUMN nome VARCHAR(255) NOT NULL DEFAULT 'Treinamento';
        ELSE
            -- Se a tabela não existe, criar completamente
            CREATE TABLE treinamentos (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                instrutor VARCHAR(255),
                carga_horaria INTEGER,
                data_inicio DATE,
                data_fim DATE,
                status VARCHAR(50) DEFAULT 'planejado',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_treinamentos_empresa ON treinamentos(empresa_id);
        END IF;
    END IF;
END $$;

-- Habilitar RLS nas tabelas se não estiver habilitado
ALTER TABLE gestao_riscos ENABLE ROW LEVEL SECURITY;
ALTER TABLE exames_aso ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS se não existirem
DO $$ 
BEGIN
    -- Política para gestao_riscos
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'gestao_riscos' AND policyname = 'Users can manage risks for their companies') THEN
        CREATE POLICY "Users can manage risks for their companies" ON gestao_riscos
            FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuario_empresas WHERE user_id = auth.uid()));
    END IF;
    
    -- Política para exames_aso
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'exames_aso' AND policyname = 'Users can manage exams for their companies') THEN
        CREATE POLICY "Users can manage exams for their companies" ON exames_aso
            FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuario_empresas WHERE user_id = auth.uid()));
    END IF;
    
    -- Política para funcionarios
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'funcionarios' AND policyname = 'Users can manage employees for their companies') THEN
        CREATE POLICY "Users can manage employees for their companies" ON funcionarios
            FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuario_empresas WHERE user_id = auth.uid()));
    END IF;
    
    -- Política para treinamentos
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'treinamentos' AND policyname = 'Users can manage trainings for their companies') THEN
        CREATE POLICY "Users can manage trainings for their companies" ON treinamentos
            FOR ALL USING (empresa_id IN (SELECT empresa_id FROM usuario_empresas WHERE user_id = auth.uid()));
    END IF;
END $$;
