-- Migração: Correção dos campos obrigatórios na tabela certificados_esocial
-- Data: $(date)
-- Descrição: Corrige o erro "null value in column 'nome' of relation 'certificados_esocial' violates not-null constraint"
--            adicionando os campos obrigatórios 'nome', 'tipo' e 'data_validade' no upload de certificados

-- Verifica os campos obrigatórios (NOT NULL) da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'certificados_esocial' 
AND is_nullable = 'NO'
ORDER BY column_name;

-- Adiciona comentário sobre a necessidade de validação real do certificado
COMMENT ON COLUMN certificados_esocial.data_validade 
IS 'Data de validade do certificado. Atualmente usa valor padrão de 1 ano, mas deve ser extraída do certificado real';

COMMENT ON COLUMN certificados_esocial.nome 
IS 'Nome do arquivo do certificado enviado pelo usuário';

COMMENT ON COLUMN certificados_esocial.tipo 
IS 'Tipo do certificado: A1 (arquivo) ou A3 (token/smartcard)';

-- Verifica a estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'certificados_esocial'
ORDER BY ordinal_position;