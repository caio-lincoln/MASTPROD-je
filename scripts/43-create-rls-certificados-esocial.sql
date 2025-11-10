-- Habilitar RLS e criar políticas para certificados_esocial
-- Garantir que apenas usuários com acesso à empresa possam ler/escrever

-- Habilitar Row Level Security na tabela
ALTER TABLE public.certificados_esocial ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT
CREATE POLICY "Usuários podem ver certificados de suas empresas"
  ON public.certificados_esocial FOR SELECT
  USING (user_has_access_to_company(empresa_id));

-- Políticas de INSERT
CREATE POLICY "Usuários podem inserir certificados em suas empresas"
  ON public.certificados_esocial FOR INSERT
  WITH CHECK (user_has_access_to_company(empresa_id));

-- Políticas de UPDATE
CREATE POLICY "Usuários podem atualizar certificados de suas empresas"
  ON public.certificados_esocial FOR UPDATE
  USING (user_has_access_to_company(empresa_id));

-- Políticas de DELETE
CREATE POLICY "Usuários podem deletar certificados de suas empresas"
  ON public.certificados_esocial FOR DELETE
  USING (user_has_access_to_company(empresa_id));

