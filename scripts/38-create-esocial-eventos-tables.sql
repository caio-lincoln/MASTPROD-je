-- Tabela para armazenar tipos de eventos eSocial
CREATE TABLE IF NOT EXISTS esocial_tipos_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE, -- S-2220, S-2240, etc.
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  versao VARCHAR(10) DEFAULT '1.0',
  layout_xml TEXT, -- Template XML para o evento
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar eventos eSocial enviados
CREATE TABLE IF NOT EXISTS eventos_esocial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_evento_id UUID NOT NULL REFERENCES esocial_tipos_eventos(id),
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  
  -- Dados do evento
  xml_original TEXT NOT NULL,
  xml_assinado TEXT,
  
  -- Status do envio
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, enviado, processado, aprovado, rejeitado, erro
  protocolo_envio VARCHAR(100),
  protocolo_consulta VARCHAR(100),
  numero_recibo VARCHAR(100),
  
  -- Timestamps
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_processamento TIMESTAMP WITH TIME ZONE,
  
  -- Respostas do eSocial
  resposta_envio JSONB,
  resposta_consulta JSONB,
  mensagem_erro TEXT,
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar lotes de eventos
CREATE TABLE IF NOT EXISTS esocial_lotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_lote VARCHAR(100) NOT NULL,
  protocolo VARCHAR(100),
  status VARCHAR(50) DEFAULT 'enviado', -- enviado, processando, processado, erro
  
  -- Dados do lote
  xml_lote TEXT NOT NULL,
  quantidade_eventos INTEGER DEFAULT 0,
  
  -- Timestamps
  data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_processamento TIMESTAMP WITH TIME ZONE,
  
  -- Resposta do eSocial
  resposta_processamento JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(empresa_id, numero_lote)
);

-- Relacionamento entre lotes e eventos
CREATE TABLE IF NOT EXISTS esocial_lote_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES esocial_lotes(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos_esocial(id) ON DELETE CASCADE,
  sequencia INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(lote_id, evento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_eventos_esocial_empresa_id ON eventos_esocial(empresa_id);
CREATE INDEX IF NOT EXISTS idx_eventos_esocial_status ON eventos_esocial(status);
CREATE INDEX IF NOT EXISTS idx_eventos_esocial_data_evento ON eventos_esocial(data_evento);
CREATE INDEX IF NOT EXISTS idx_esocial_lotes_empresa_id ON esocial_lotes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_esocial_lotes_status ON esocial_lotes(status);

-- RLS Policies
ALTER TABLE esocial_tipos_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_esocial ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_lote_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas para esocial_tipos_eventos (todos podem ler, apenas admins podem modificar)
CREATE POLICY "Todos podem visualizar tipos de eventos" ON esocial_tipos_eventos
  FOR SELECT USING (true);

CREATE POLICY "Apenas admins podem modificar tipos de eventos" ON esocial_tipos_eventos
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Políticas para eventos_esocial (filtrar por empresa)
CREATE POLICY "Usuários podem ver eventos de sua empresa" ON eventos_esocial
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar eventos para sua empresa" ON eventos_esocial
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar eventos de sua empresa" ON eventos_esocial
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para esocial_lotes (filtrar por empresa)
CREATE POLICY "Usuários podem ver lotes de sua empresa" ON esocial_lotes
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar lotes para sua empresa" ON esocial_lotes
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar lotes de sua empresa" ON esocial_lotes
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para esocial_lote_eventos
CREATE POLICY "Usuários podem ver relações lote-evento" ON esocial_lote_eventos
  FOR SELECT USING (
    lote_id IN (
      SELECT id FROM esocial_lotes 
      WHERE empresa_id IN (
        SELECT empresa_id FROM usuarios_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem criar relações lote-evento" ON esocial_lote_eventos
  FOR INSERT WITH CHECK (
    lote_id IN (
      SELECT id FROM esocial_lotes 
      WHERE empresa_id IN (
        SELECT empresa_id FROM usuarios_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_esocial_tipos_eventos_updated_at 
  BEFORE UPDATE ON esocial_tipos_eventos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_esocial_updated_at 
  BEFORE UPDATE ON eventos_esocial 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_esocial_lotes_updated_at 
  BEFORE UPDATE ON esocial_lotes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir tipos de eventos padrão
INSERT INTO esocial_tipos_eventos (codigo, nome, descricao, layout_xml) VALUES
('S-2220', 'Monitoramento da Saúde do Trabalhador', 'Evento para informar os resultados de monitoramento da saúde do trabalhador', 
'<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_s_01_02_00">
  <evtMonit Id="">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc></nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab></cpfTrab>
      <matricula></matricula>
    </ideVinculo>
    <exMedOcup>
      <tpExameOcup>0</tpExameOcup>
      <aso>
        <dtAso></dtAso>
        <resAso>1</resAso>
      </aso>
    </exMedOcup>
  </evtMonit>
</eSocial>'),

('S-2240', 'Condições Ambientais do Trabalho - Agentes Nocivos', 'Evento para informar as condições ambientais do trabalho', 
'<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_s_01_02_00">
  <evtExpRisco Id="">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc></nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab></cpfTrab>
      <matricula></matricula>
    </ideVinculo>
    <infoExpRisco>
      <dtIniCondicao></dtIniCondicao>
      <infoAmb>
        <localAmb>1</localAmb>
        <dscSetor></dscSetor>
        <tpInsc>1</tpInsc>
        <nrInsc></nrInsc>
      </infoAmb>
      <infoAtiv>
        <dscAtivDes></dscAtivDes>
      </infoAtiv>
    </infoExpRisco>
  </evtExpRisco>
</eSocial>'),

('S-2210', 'Comunicação de Acidente de Trabalho', 'Evento para comunicar acidentes de trabalho', 
'<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtCAT/v_s_01_02_00">
  <evtCAT Id="">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc></nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab></cpfTrab>
      <matricula></matricula>
    </ideVinculo>
    <cat>
      <dtAcid></dtAcid>
      <tpAcid>1</tpAcid>
      <hrAcid></hrAcid>
      <hrsTrabAntesAcid>480</hrsTrabAntesAcid>
      <tpCat>1</tpCat>
      <indCatObito>N</indCatObito>
      <dtObito></dtObito>
      <indComunPolicia>N</indComunPolicia>
      <codSitGeradora>200000007</codSitGeradora>
      <iniciatCAT>1</iniciatCAT>
      <obsCAT></obsCAT>
    </cat>
  </evtCAT>
</eSocial>');
