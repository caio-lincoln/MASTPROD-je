-- Migration: Adicionar coluna responsavel à tabela certificados_esocial
-- Data: 2024
-- Descrição: Corrige erro "Could not find the 'responsavel' column" no upload de certificados

-- Adicionar coluna responsavel à tabela certificados_esocial
ALTER TABLE certificados_esocial 
ADD COLUMN responsavel VARCHAR(255);

-- Adicionar comentário à coluna
COMMENT ON COLUMN certificados_esocial.responsavel IS 'Responsável pelo certificado digital';

-- Verificar a estrutura da tabela após a alteração
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'certificados_esocial' 
AND table_schema = 'public' 
ORDER BY ordinal_position;

-- Estrutura final da tabela certificados_esocial:
-- id (uuid, NOT NULL, gen_random_uuid())
-- empresa_id (uuid, NOT NULL)
-- nome (varchar, NOT NULL)
-- tipo (varchar, NOT NULL)
-- arquivo_url (text, NULL)
-- senha_certificado (text, NULL)
-- data_validade (date, NOT NULL)
-- ativo (boolean, NULL, default: true)
-- observacoes (text, NULL)
-- created_at (timestamp with time zone, NULL, default: now())
-- updated_at (timestamp with time zone, NULL, default: now())
-- data_upload (timestamp with time zone, NULL, default: now())
-- responsavel (varchar(255), NULL) -- NOVA COLUNA ADICIONADA