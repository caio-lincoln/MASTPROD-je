-- Ajuste nas políticas do bucket de certificados eSocial
-- 1) Corrigir coluna de relacionamento para usuario_empresas (user_id)
-- 2) Permitir que usuários autenticados façam upload/leitura no próprio diretório (usuario-<uid>/...)

-- Remover políticas antigas conflitando (se existirem). Use DROP IF EXISTS para segurança.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Certificados eSocial - Acesso restrito'
  ) THEN
    DROP POLICY "Certificados eSocial - Acesso restrito" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Certificados eSocial - Upload restrito'
  ) THEN
    DROP POLICY "Certificados eSocial - Upload restrito" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Certificados eSocial - Download restrito'
  ) THEN
    DROP POLICY "Certificados eSocial - Download restrito" ON storage.objects;
  END IF;
END $$;

-- Política geral de acesso para admins/owners com coluna correta (user_id)
CREATE POLICY "Certificados eSocial - Acesso restrito"
ON storage.objects FOR ALL
USING (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.role IN ('admin', 'owner')
  )
);

-- Política de upload para admins/owners
CREATE POLICY "Certificados eSocial - Upload restrito"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.role IN ('admin', 'owner')
  )
);

-- Política de download para admins/owners
CREATE POLICY "Certificados eSocial - Download restrito"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.usuario_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.role IN ('admin', 'owner')
  )
);

-- Políticas adicionais: permitir que usuários autenticados gerenciem seus próprios arquivos
-- Caminho: usuario-<uid>/certificado-a1.pfx
CREATE POLICY "Certificados eSocial - Upload por usuário"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND name LIKE ('usuario-' || auth.uid() || '/%')
);

CREATE POLICY "Certificados eSocial - Download por usuário"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificados-esocial'
  AND auth.role() = 'authenticated'
  AND name LIKE ('usuario-' || auth.uid() || '/%')
);

COMMENT ON POLICY "Certificados eSocial - Upload por usuário" ON storage.objects IS 
'Permite upload no diretório próprio do usuário (usuario-<uid>/...)';

COMMENT ON POLICY "Certificados eSocial - Download por usuário" ON storage.objects IS 
'Permite download no diretório próprio do usuário (usuario-<uid>/...)';

