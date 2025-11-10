-- Cria tabela para armazenar metadados de certificados vinculados à CONTA do usuário
-- e aplica RLS para garantir que cada usuário só acesse seu próprio registro

CREATE TABLE IF NOT EXISTS public.certificados_conta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'A1',
  nome TEXT,
  subject TEXT,
  issuer TEXT,
  arquivo_url TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  valido BOOLEAN DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Um certificado por usuário (pode ser flexibilizado futuramente)
CREATE UNIQUE INDEX IF NOT EXISTS certificados_conta_user_unique ON public.certificados_conta(user_id);

ALTER TABLE public.certificados_conta ENABLE ROW LEVEL SECURITY;

-- Políticas: o usuário só pode acessar o seu próprio registro
CREATE POLICY "Certificado da conta - Select próprio" ON public.certificados_conta
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Certificado da conta - Insert próprio" ON public.certificados_conta
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Certificado da conta - Update próprio" ON public.certificados_conta
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.certificados_conta IS 'Metadados de certificado digital vinculado à conta do usuário';
COMMENT ON COLUMN public.certificados_conta.user_id IS 'ID do usuário autenticado (auth.uid())';
COMMENT ON COLUMN public.certificados_conta.arquivo_url IS 'Caminho no bucket certificados-esocial (usuario-<uid>/certificado-a1.pfx)';

