-- Criar tabela de exames ocupacionais e ASO
CREATE TABLE public.exames_aso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- Ex: admissional, periódico, demissional, retorno ao trabalho
  data_exame date NOT NULL,
  validade date,
  resultado text,
  medico_responsavel text,
  observacoes text,
  arquivo_url text, -- Link para o ASO em PDF (Supabase Storage)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar índices para otimizar consultas
CREATE INDEX idx_exames_aso_funcionario_id ON public.exames_aso(funcionario_id);
CREATE INDEX idx_exames_aso_tipo ON public.exames_aso(tipo);
CREATE INDEX idx_exames_aso_data_exame ON public.exames_aso(data_exame);
CREATE INDEX idx_exames_aso_validade ON public.exames_aso(validade);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exames_aso_updated_at 
    BEFORE UPDATE ON public.exames_aso 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.exames_aso IS 'Tabela para armazenar exames ocupacionais e ASO dos funcionários';
COMMENT ON COLUMN public.exames_aso.tipo IS 'Tipo do exame: admissional, periódico, demissional, retorno ao trabalho';
COMMENT ON COLUMN public.exames_aso.arquivo_url IS 'URL do arquivo PDF do ASO armazenado no Supabase Storage';
