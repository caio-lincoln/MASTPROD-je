-- Criar bucket para certificados eSocial
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificados-esocial',
  'certificados-esocial',
  false, -- Bucket privado por segurança
  10485760, -- 10MB limite
  ARRAY['application/x-pkcs12', 'application/octet-stream']
);

-- Política RLS para certificados - apenas usuários autenticados podem acessar
CREATE POLICY "Certificados eSocial - Acesso restrito" ON storage.objects
FOR ALL USING (
  bucket_id = 'certificados-esocial' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM usuario_empresas ue
    WHERE ue.usuario_id = auth.uid()
    AND ue.role IN ('admin', 'owner')
  )
);

-- Política para upload de certificados - apenas admins
CREATE POLICY "Certificados eSocial - Upload restrito" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM usuario_empresas ue
    WHERE ue.usuario_id = auth.uid()
    AND ue.role IN ('admin', 'owner')
  )
);

-- Política para download de certificados - apenas admins
CREATE POLICY "Certificados eSocial - Download restrito" ON storage.objects
FOR SELECT USING (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM usuario_empresas ue
    WHERE ue.usuario_id = auth.uid()
    AND ue.role IN ('admin', 'owner')
  )
);

-- Comentários para documentação
COMMENT ON POLICY "Certificados eSocial - Acesso restrito" ON storage.objects IS 
'Permite acesso aos certificados apenas para usuários autenticados com role admin/owner';

COMMENT ON POLICY "Certificados eSocial - Upload restrito" ON storage.objects IS 
'Permite upload de certificados apenas para admins e owners';

COMMENT ON POLICY "Certificados eSocial - Download restrito" ON storage.objects IS 
'Permite download de certificados apenas para admins e owners';