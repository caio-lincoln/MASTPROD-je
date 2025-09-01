-- Sistema de Notificações e Alertas Inteligentes
-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text,
  tipo text NOT NULL CHECK (tipo IN ('alerta', 'aviso', 'sistema', 'lembrete')),
  lida boolean DEFAULT false,
  origem text, -- aso, treinamento, nc, inspecao, etc.
  origem_id uuid,
  data_criacao timestamp with time zone DEFAULT now(),
  data_leitura timestamp with time zone,
  prioridade text DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'critica')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_empresa_id ON public.notificacoes(empresa_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX idx_notificacoes_tipo ON public.notificacoes(tipo);
CREATE INDEX idx_notificacoes_origem ON public.notificacoes(origem, origem_id);
CREATE INDEX idx_notificacoes_data_criacao ON public.notificacoes(data_criacao DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notificacoes_updated_at 
    BEFORE UPDATE ON public.notificacoes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar notificação
CREATE OR REPLACE FUNCTION public.criar_notificacao(
  user_id_input uuid,
  empresa_id_input uuid,
  titulo_input text,
  mensagem_input text,
  tipo_input text,
  origem_input text DEFAULT NULL,
  origem_id_input uuid DEFAULT NULL,
  prioridade_input text DEFAULT 'normal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notificacao_id uuid;
BEGIN
  INSERT INTO public.notificacoes (
    user_id, empresa_id, titulo, mensagem, tipo, origem, origem_id, prioridade
  )
  VALUES (
    user_id_input, empresa_id_input, titulo_input, mensagem_input, 
    tipo_input, origem_input, origem_id_input, prioridade_input
  )
  RETURNING id INTO notificacao_id;
  
  RETURN notificacao_id;
END;
$$;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION public.marcar_notificacao_lida(
  notificacao_id_input uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notificacoes 
  SET lida = true, data_leitura = now()
  WHERE id = notificacao_id_input
    AND user_id = auth.uid();
END;
$$;

-- Função para marcar todas as notificações como lidas
CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_lidas(
  empresa_id_input uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notificacoes 
  SET lida = true, data_leitura = now()
  WHERE user_id = auth.uid()
    AND lida = false
    AND (empresa_id_input IS NULL OR empresa_id = empresa_id_input);
END;
$$;

-- View para notificações ativas
CREATE OR REPLACE VIEW public.v_notificacoes_ativas AS
SELECT 
  n.*,
  e.nome as empresa_nome,
  u.email as user_email
FROM public.notificacoes n
JOIN public.empresas e ON e.id = n.empresa_id
JOIN auth.users u ON u.id = n.user_id
WHERE NOT n.lida
ORDER BY n.data_criacao DESC;

-- View para estatísticas de notificações
CREATE OR REPLACE VIEW public.v_notificacoes_stats AS
SELECT 
  user_id,
  empresa_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE NOT lida) as nao_lidas,
  COUNT(*) FILTER (WHERE tipo = 'alerta') as alertas,
  COUNT(*) FILTER (WHERE tipo = 'aviso') as avisos,
  COUNT(*) FILTER (WHERE prioridade = 'critica') as criticas
FROM public.notificacoes
GROUP BY user_id, empresa_id;

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON public.notificacoes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias notificações"
  ON public.notificacoes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Sistema pode inserir notificações"
  ON public.notificacoes FOR INSERT
  WITH CHECK (true);

-- Função para gerar notificações automáticas de exames vencendo
CREATE OR REPLACE FUNCTION public.gerar_notificacoes_exames_vencendo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exame_record RECORD;
  dias_restantes INTEGER;
  tipo_notificacao TEXT;
  prioridade_notificacao TEXT;
BEGIN
  -- Buscar exames que vencem em 30, 15, 7 ou 1 dias
  FOR exame_record IN
    SELECT 
      e.*,
      f.nome as funcionario_nome,
      emp.nome as empresa_nome,
      (e.validade - CURRENT_DATE) as dias_para_vencer
    FROM public.exames_aso e
    JOIN public.funcionarios f ON f.id = e.funcionario_id
    JOIN public.empresas emp ON emp.id = f.empresa_id
    WHERE e.validade IS NOT NULL
      AND e.validade > CURRENT_DATE
      AND (e.validade - CURRENT_DATE) IN (30, 15, 7, 1)
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.origem = 'exames_aso'
          AND n.origem_id = e.id
          AND n.data_criacao::date = CURRENT_DATE
      )
  LOOP
    dias_restantes := exame_record.dias_para_vencer;
    
    -- Definir tipo e prioridade baseado nos dias restantes
    IF dias_restantes <= 1 THEN
      tipo_notificacao := 'alerta';
      prioridade_notificacao := 'critica';
    ELSIF dias_restantes <= 7 THEN
      tipo_notificacao := 'alerta';
      prioridade_notificacao := 'alta';
    ELSIF dias_restantes <= 15 THEN
      tipo_notificacao := 'aviso';
      prioridade_notificacao := 'normal';
    ELSE
      tipo_notificacao := 'lembrete';
      prioridade_notificacao := 'normal';
    END IF;
    
    -- Criar notificação para usuários da empresa
    INSERT INTO public.notificacoes (
      user_id, empresa_id, titulo, mensagem, tipo, origem, origem_id, prioridade
    )
    SELECT 
      ue.user_id,
      exame_record.empresa_id,
      'Exame ASO vencendo',
      format('O exame de %s vence em %s dia(s) (%s)', 
        exame_record.funcionario_nome, 
        dias_restantes,
        to_char(exame_record.validade, 'DD/MM/YYYY')
      ),
      tipo_notificacao,
      'exames_aso',
      exame_record.id,
      prioridade_notificacao
    FROM public.usuario_empresas ue
    WHERE ue.empresa_id = exame_record.empresa_id;
  END LOOP;
END;
$$;

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE ON public.notificacoes TO authenticated;
GRANT SELECT ON public.v_notificacoes_ativas TO authenticated;
GRANT SELECT ON public.v_notificacoes_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_notificacao TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_notificacao_lida TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_todas_notificacoes_lidas TO authenticated;
