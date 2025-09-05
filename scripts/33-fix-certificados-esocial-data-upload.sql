-- Migration: Adicionar coluna data_upload à tabela certificados_esocial
-- Data: 2024
-- Descrição: Corrige erro de coluna ausente 'data_upload' na tabela certificados_esocial

-- Adicionar coluna data_upload à tabela certificados_esocial
ALTER TABLE certificados_esocial 
ADD COLUMN data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualizar registros existentes com a data de criação
UPDATE certificados_esocial 
SET data_upload = created_at 
WHERE data_upload IS NULL;

-- Comentário da coluna
COMMENT ON COLUMN certificados_esocial.data_upload IS 'Data e hora do upload do certificado';

-- Verificar a estrutura da tabela após a alteração
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'certificados_esocial' 
AND table_schema = 'public' 
ORDER BY ordinal_position;
