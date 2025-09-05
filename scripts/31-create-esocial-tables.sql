-- Criando tabelas para integração eSocial
-- Tabela para configurações eSocial por empresa
CREATE TABLE IF NOT EXISTS public.esocial_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ambiente TEXT NOT NULL CHECK (ambiente IN ('producao', 'homologacao')) DEFAULT 'homologacao',
  certificado_tipo TEXT CHECK (certificado_tipo IN ('A1', 'A3')) DEFAULT 'A1',
  certificado_arquivo TEXT, -- Path no storage para certificado A1
  certificado_thumbprint TEXT, -- Para certificado A3
  certificado_senha_encrypted TEXT, -- Senha criptografada
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id)
);

-- Tabela para lotes de eventos
CREATE TABLE IF NOT EXISTS public.esocial_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  protocolo TEXT,
  status TEXT NOT NULL CHECK (status IN ('preparando', 'enviado', 'processado', 'erro')) DEFAULT 'preparando',
  data_envio TIMESTAMP,
  data_processamento TIMESTAMP,
  retorno_completo TEXT, -- XML de retorno completo
  total_eventos INTEGER DEFAULT 0,
  eventos_processados INTEGER DEFAULT 0,
  eventos_erro INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Atualizar tabela eventos_esocial existente
ALTER TABLE public.eventos_esocial 
ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES public.esocial_lotes(id),
ADD COLUMN IF NOT EXISTS funcionario_id UUID REFERENCES public.funcionarios(id),
ADD COLUMN IF NOT EXISTS xml_original TEXT,
ADD COLUMN IF NOT EXISTS xml_assinado TEXT,
ADD COLUMN IF NOT EXISTS numero_recibo TEXT,
ADD COLUMN IF NOT EXISTS data_processamento TIMESTAMP,
ADD COLUMN IF NOT EXISTS erros TEXT[]; -- Array de erros

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_esocial_lotes_empresa ON public.esocial_lotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_esocial_lotes_status ON public.esocial_lotes(status);
CREATE INDEX IF NOT EXISTS idx_eventos_esocial_lote ON public.eventos_esocial(lote_id);
CREATE INDEX IF NOT EXISTS idx_eventos_esocial_funcionario ON public.eventos_esocial(funcionario_id);

-- RLS Policies
ALTER TABLE public.esocial_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_lotes ENABLE ROW LEVEL SECURITY;

-- Políticas para esocial_config
CREATE POLICY "Users can view esocial config for their companies" ON public.esocial_config
  FOR SELECT USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage esocial config for their companies" ON public.esocial_config
  FOR ALL USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

-- Políticas para esocial_lotes
CREATE POLICY "Users can view esocial lotes for their companies" ON public.esocial_lotes
  FOR SELECT USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage esocial lotes for their companies" ON public.esocial_lotes
  FOR ALL USING (
    empresa_id IN (
      SELECT ue.empresa_id FROM public.usuario_empresas ue 
      WHERE ue.usuario_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_esocial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_esocial_config_updated_at
  BEFORE UPDATE ON public.esocial_config
  FOR EACH ROW EXECUTE FUNCTION update_esocial_updated_at();

CREATE TRIGGER update_esocial_lotes_updated_at
  BEFORE UPDATE ON public.esocial_lotes
  FOR EACH ROW EXECUTE FUNCTION update_esocial_updated_at();

-- Inserir configuração padrão para empresas existentes
INSERT INTO public.esocial_config (empresa_id, ambiente, certificado_tipo)
SELECT id, 'homologacao', 'A1' 
FROM public.empresas 
WHERE id NOT IN (SELECT empresa_id FROM public.esocial_config);
