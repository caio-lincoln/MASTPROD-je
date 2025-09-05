-- Migração: Adicionar constraint única na coluna empresa_id da tabela certificados_esocial
-- Data: $(date)
-- Descrição: Corrige o erro "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--            que ocorria no upload de certificados devido à ausência de constraint única na coluna empresa_id

-- Adiciona constraint única na coluna empresa_id
ALTER TABLE certificados_esocial 
ADD CONSTRAINT certificados_esocial_empresa_id_unique 
UNIQUE (empresa_id);

-- Adiciona comentário explicativo
COMMENT ON CONSTRAINT certificados_esocial_empresa_id_unique ON certificados_esocial 
IS 'Constraint única para permitir upsert por empresa_id no upload de certificados';

-- Verifica a estrutura final das constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
WHERE tc.table_name = 'certificados_esocial'
ORDER BY tc.constraint_type, tc.constraint_name;
