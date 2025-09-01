-- Criação da estrutura para integração eSocial
-- Eventos S-2220 (Monitoramento da Saúde) e S-2240 (Condições Ambientais)

-- Tabela de eventos eSocial
CREATE TABLE public.eventos_esocial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento text NOT NULL CHECK (tipo_evento IN ('S-2220', 'S-2240')),
  entidade_id uuid NOT NULL, -- id do exame ou risco
  funcionario_id uuid REFERENCES public.funcionarios(id),
  empresa_id uuid REFERENCES public.empresas(id),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro', 'processado')),
  mensagem_retorno text,
  xml_gerado text, -- conteúdo do XML
  data_envio timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de fatores de risco para S-2240
CREATE TABLE public.fatores_risco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  funcionario_id uuid REFERENCES public.funcionarios(id),
  ambiente text NOT NULL,
  agente text NOT NULL, -- agente nocivo
  intensidade text,
  frequencia text,
  epi_utilizado boolean DEFAULT false,
  epc_utilizado boolean DEFAULT false,
  descricao_atividade text,
  metodologia_avaliacao text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_eventos_esocial_empresa ON public.eventos_esocial(empresa_id);
CREATE INDEX idx_eventos_esocial_funcionario ON public.eventos_esocial(funcionario_id);
CREATE INDEX idx_eventos_esocial_status ON public.eventos_esocial(status);
CREATE INDEX idx_eventos_esocial_tipo ON public.eventos_esocial(tipo_evento);
CREATE INDEX idx_fatores_risco_empresa ON public.fatores_risco(empresa_id);
CREATE INDEX idx_fatores_risco_funcionario ON public.fatores_risco(funcionario_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_eventos_esocial_updated_at BEFORE UPDATE ON public.eventos_esocial FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_fatores_risco_updated_at BEFORE UPDATE ON public.fatores_risco FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.eventos_esocial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatores_risco ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para eventos_esocial
CREATE POLICY "Usuários podem ver eventos de suas empresas" ON public.eventos_esocial
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir eventos em suas empresas" ON public.eventos_esocial
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar eventos de suas empresas" ON public.eventos_esocial
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

-- Políticas RLS para fatores_risco
CREATE POLICY "Usuários podem ver fatores de risco de suas empresas" ON public.fatores_risco
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir fatores de risco em suas empresas" ON public.fatores_risco
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar fatores de risco de suas empresas" ON public.fatores_risco
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar fatores de risco de suas empresas" ON public.fatores_risco
  FOR DELETE USING (
    empresa_id IN (
      SELECT empresa_id FROM public.usuario_empresas 
      WHERE usuario_id = auth.uid()
    )
  );

-- Função para gerar evento S-2220 baseado em ASO
CREATE OR REPLACE FUNCTION gerar_evento_s2220(aso_id uuid)
RETURNS uuid AS $$
DECLARE
  evento_id uuid;
  aso_data record;
  xml_content text;
BEGIN
  -- Buscar dados do ASO
  SELECT 
    e.id,
    e.funcionario_id,
    e.empresa_id,
    e.tipo,
    e.data_exame,
    e.medico_responsavel,
    e.resultado,
    f.nome as funcionario_nome,
    f.cpf,
    f.matricula_esocial,
    emp.razao_social,
    emp.cnpj
  INTO aso_data
  FROM exames_aso e
  JOIN funcionarios f ON f.id = e.funcionario_id
  JOIN empresas emp ON emp.id = e.empresa_id
  WHERE e.id = aso_id;

  -- Gerar XML simplificado (template básico)
  xml_content := format('
    <eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">
      <evtMonit Id="ID1%s">
        <ideEvento>
          <tpAmb>2</tpAmb>
          <procEmi>1</procEmi>
          <verProc>1.0</verProc>
        </ideEvento>
        <ideEmpregador>
          <tpInsc>1</tpInsc>
          <nrInsc>%s</nrInsc>
        </ideEmpregador>
        <ideVinculo>
          <cpfTrab>%s</cpfTrab>
          <matricula>%s</matricula>
        </ideVinculo>
        <exMedOcup>
          <tpExameOcup>%s</tpExameOcup>
          <aso>
            <dtAso>%s</dtAso>
            <resAso>%s</resAso>
            <medico>
              <nmMed>%s</nmMed>
            </medico>
          </aso>
        </exMedOcup>
      </evtMonit>
    </eSocial>',
    aso_data.id,
    aso_data.cnpj,
    aso_data.cpf,
    COALESCE(aso_data.matricula_esocial, ''),
    CASE aso_data.tipo 
      WHEN 'Admissional' THEN '1'
      WHEN 'Periódico' THEN '2'
      WHEN 'Demissional' THEN '3'
      ELSE '2'
    END,
    to_char(aso_data.data_exame, 'YYYY-MM-DD'),
    CASE aso_data.resultado
      WHEN 'Apto' THEN '1'
      WHEN 'Inapto' THEN '2'
      ELSE '1'
    END,
    aso_data.medico_responsavel
  );

  -- Inserir evento
  INSERT INTO eventos_esocial (
    tipo_evento,
    entidade_id,
    funcionario_id,
    empresa_id,
    xml_gerado,
    status
  ) VALUES (
    'S-2220',
    aso_id,
    aso_data.funcionario_id,
    aso_data.empresa_id,
    xml_content,
    'pendente'
  ) RETURNING id INTO evento_id;

  RETURN evento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar evento S-2240 baseado em fator de risco
CREATE OR REPLACE FUNCTION gerar_evento_s2240(fator_risco_id uuid)
RETURNS uuid AS $$
DECLARE
  evento_id uuid;
  risco_data record;
  xml_content text;
BEGIN
  -- Buscar dados do fator de risco
  SELECT 
    fr.id,
    fr.funcionario_id,
    fr.empresa_id,
    fr.ambiente,
    fr.agente,
    fr.intensidade,
    fr.frequencia,
    fr.epi_utilizado,
    fr.epc_utilizado,
    f.nome as funcionario_nome,
    f.cpf,
    f.matricula_esocial,
    emp.razao_social,
    emp.cnpj
  INTO risco_data
  FROM fatores_risco fr
  JOIN funcionarios f ON f.id = fr.funcionario_id
  JOIN empresas emp ON emp.id = fr.empresa_id
  WHERE fr.id = fator_risco_id;

  -- Gerar XML simplificado (template básico)
  xml_content := format('
    <eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00">
      <evtCAT Id="ID1%s">
        <ideEvento>
          <tpAmb>2</tpAmb>
          <procEmi>1</procEmi>
          <verProc>1.0</verProc>
        </ideEvento>
        <ideEmpregador>
          <tpInsc>1</tpInsc>
          <nrInsc>%s</nrInsc>
        </ideEmpregador>
        <ideVinculo>
          <cpfTrab>%s</cpfTrab>
          <matricula>%s</matricula>
        </ideVinculo>
        <condAmbTrab>
          <localAmb>%s</localAmb>
          <fatRisco>
            <codFatRis>%s</codFatRis>
            <intConc>%s</intConc>
            <tecMedicao>%s</tecMedicao>
            <epcEpi>
              <utilizEPC>%s</utilizEPC>
              <utilizEPI>%s</utilizEPI>
            </epcEpi>
          </fatRisco>
        </condAmbTrab>
      </evtCAT>
    </eSocial>',
    risco_data.id,
    risco_data.cnpj,
    risco_data.cpf,
    COALESCE(risco_data.matricula_esocial, ''),
    risco_data.ambiente,
    risco_data.agente,
    COALESCE(risco_data.intensidade, 'N/A'),
    COALESCE(risco_data.frequencia, 'N/A'),
    CASE WHEN risco_data.epc_utilizado THEN 'S' ELSE 'N' END,
    CASE WHEN risco_data.epi_utilizado THEN 'S' ELSE 'N' END
  );

  -- Inserir evento
  INSERT INTO eventos_esocial (
    tipo_evento,
    entidade_id,
    funcionario_id,
    empresa_id,
    xml_gerado,
    status
  ) VALUES (
    'S-2240',
    fator_risco_id,
    risco_data.funcionario_id,
    risco_data.empresa_id,
    xml_content,
    'pendente'
  ) RETURNING id INTO evento_id;

  RETURN evento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para facilitar consultas de eventos
CREATE VIEW public.view_eventos_esocial AS
SELECT 
  e.id,
  e.tipo_evento,
  e.status,
  e.data_envio,
  e.mensagem_retorno,
  e.created_at,
  f.nome as funcionario_nome,
  f.cpf,
  emp.razao_social as empresa_nome,
  CASE e.tipo_evento
    WHEN 'S-2220' THEN 'Monitoramento da Saúde'
    WHEN 'S-2240' THEN 'Condições Ambientais'
    ELSE e.tipo_evento
  END as tipo_descricao
FROM eventos_esocial e
JOIN funcionarios f ON f.id = e.funcionario_id
JOIN empresas emp ON emp.id = e.empresa_id;

-- Inserir alguns dados de exemplo
INSERT INTO fatores_risco (empresa_id, funcionario_id, ambiente, agente, intensidade, frequencia, epi_utilizado, epc_utilizado) 
SELECT 
  e.id as empresa_id,
  f.id as funcionario_id,
  'Escritório',
  'Ruído',
  'Baixa',
  'Contínua',
  true,
  false
FROM empresas e
CROSS JOIN funcionarios f
WHERE e.razao_social = 'Empresa Exemplo Ltda'
LIMIT 3;
