-- Adicionar políticas para permitir upload/seleção no diretório do próprio usuário
-- Sem remover políticas existentes (evita necessidade de permissão de owner)

CREATE POLICY IF NOT EXISTS "Certificados eSocial - Upload por usuário"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND name LIKE ('usuario-' || auth.uid() || '/%')
);

CREATE POLICY IF NOT EXISTS "Certificados eSocial - Download por usuário"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND name LIKE ('usuario-' || auth.uid() || '/%')
);

