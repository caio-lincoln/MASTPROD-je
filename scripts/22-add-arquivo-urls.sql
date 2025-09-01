-- Adicionar campos de URL de arquivo nas tabelas existentes

-- Tabela de exames/ASO
ALTER TABLE public.exames_aso 
ADD COLUMN arquivo_url TEXT,
ADD COLUMN arquivo_path TEXT;

-- Tabela de treinamentos
ALTER TABLE public.treinamentos 
ADD COLUMN certificado_url TEXT,
ADD COLUMN certificado_path TEXT,
ADD COLUMN material_url TEXT,
ADD COLUMN material_path TEXT;

-- Tabela de não conformidades (evidências)
ALTER TABLE public.nao_conformidades 
ADD COLUMN evidencia_url TEXT,
ADD COLUMN evidencia_path TEXT;

-- Tabela de inspeções de segurança
ALTER TABLE public.inspecoes_seguranca 
ADD COLUMN relatorio_url TEXT,
ADD COLUMN relatorio_path TEXT,
ADD COLUMN fotos_urls TEXT[], -- Array para múltiplas fotos
ADD COLUMN fotos_paths TEXT[];

-- Tabela de incidentes
ALTER TABLE public.incidentes 
ADD COLUMN evidencias_urls TEXT[], -- Array para múltiplas evidências
ADD COLUMN evidencias_paths TEXT[],
ADD COLUMN relatorio_url TEXT,
ADD COLUMN relatorio_path TEXT;

-- Tabela de EPIs (fotos do equipamento)
ALTER TABLE public.epis 
ADD COLUMN foto_url TEXT,
ADD COLUMN foto_path TEXT;

-- Tabela de inspeções de EPI
ALTER TABLE public.inspecoes_epi 
ADD COLUMN fotos_urls TEXT[],
ADD COLUMN fotos_paths TEXT[];

-- Tabela de empresas (logo)
ALTER TABLE public.empresas 
ADD COLUMN logo_url TEXT,
ADD COLUMN logo_path TEXT;

-- Tabela de funcionários (foto/avatar)
ALTER TABLE public.funcionarios 
ADD COLUMN avatar_url TEXT,
ADD COLUMN avatar_path TEXT;

-- Criar índices para melhor performance nas consultas por arquivo
CREATE INDEX IF NOT EXISTS idx_exames_aso_arquivo ON public.exames_aso(arquivo_url) WHERE arquivo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treinamentos_certificado ON public.treinamentos(certificado_url) WHERE certificado_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_evidencia ON public.nao_conformidades(evidencia_url) WHERE evidencia_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_logo ON public.empresas(logo_url) WHERE logo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_avatar ON public.funcionarios(avatar_url) WHERE avatar_url IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.exames_aso.arquivo_url IS 'URL pública do arquivo ASO (PDF ou imagem)';
COMMENT ON COLUMN public.exames_aso.arquivo_path IS 'Caminho do arquivo no Supabase Storage';

COMMENT ON COLUMN public.treinamentos.certificado_url IS 'URL do certificado de conclusão do treinamento';
COMMENT ON COLUMN public.treinamentos.material_url IS 'URL do material didático do treinamento';

COMMENT ON COLUMN public.nao_conformidades.evidencia_url IS 'URL da evidência da não conformidade';

COMMENT ON COLUMN public.inspecoes_seguranca.relatorio_url IS 'URL do relatório de inspeção';
COMMENT ON COLUMN public.inspecoes_seguranca.fotos_urls IS 'Array de URLs das fotos da inspeção';

COMMENT ON COLUMN public.incidentes.evidencias_urls IS 'Array de URLs das evidências do incidente';
COMMENT ON COLUMN public.incidentes.relatorio_url IS 'URL do relatório de investigação';

COMMENT ON COLUMN public.epis.foto_url IS 'URL da foto do equipamento EPI';

COMMENT ON COLUMN public.empresas.logo_url IS 'URL do logotipo da empresa';

COMMENT ON COLUMN public.funcionarios.avatar_url IS 'URL da foto/avatar do funcionário';
