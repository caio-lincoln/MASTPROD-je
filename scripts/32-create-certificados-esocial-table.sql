-- Criar tabela para rastrear certificados eSocial por empresa
CREATE TABLE IF NOT EXISTS certificados_esocial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  data_upload TIMESTAMPTZ DEFAULT NOW(),
  responsavel TEXT NOT NULL,
  valido BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir apenas um certificado por empresa
  UNIQUE(empresa_id)
);

-- Criar bucket para certificados eSocial se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('esocial_certificados', 'esocial_certificados', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para certificados_esocial
ALTER TABLE certificados_esocial ENABLE ROW LEVEL SECURITY;

-- Política para visualizar certificados da própria empresa
CREATE POLICY "Usuários podem ver certificados da própria empresa" ON certificados_esocial
  FOR SELECT USING (
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuario_empresas ue
      WHERE ue.user_id = auth.uid()
    )
  );

-- Política para inserir/atualizar certificados da própria empresa
CREATE POLICY "Usuários podem gerenciar certificados da própria empresa" ON certificados_esocial
  FOR ALL USING (
    empresa_id IN (
      SELECT ue.empresa_id
      FROM usuario_empresas ue
      WHERE ue.user_id = auth.uid()
    )
  );

-- Políticas para storage bucket esocial_certificados
CREATE POLICY "Usuários podem fazer upload de certificados da própria empresa" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'esocial_certificados' AND
    (storage.foldername(name))[1] = 'empresa-' || (
      SELECT ue.empresa_id::text
      FROM usuario_empresas ue
      WHERE ue.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Usuários podem ver certificados da própria empresa no storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'esocial_certificados' AND
    (storage.foldername(name))[1] = 'empresa-' || (
      SELECT ue.empresa_id::text
      FROM usuario_empresas ue
      WHERE ue.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Usuários podem atualizar certificados da própria empresa no storage" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'esocial_certificados' AND
    (storage.foldername(name))[1] = 'empresa-' || (
      SELECT ue.empresa_id::text
      FROM usuario_empresas ue
      WHERE ue.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_certificados_esocial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificados_esocial_updated_at
  BEFORE UPDATE ON certificados_esocial
  FOR EACH ROW
  EXECUTE FUNCTION update_certificados_esocial_updated_at();}}}