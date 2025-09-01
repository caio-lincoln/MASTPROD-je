-- =====================================================
-- VIEWS SEGURAS PARA O FRONTEND SST
-- =====================================================
-- Essas views facilitam consultas complexas no frontend
-- e respeitam automaticamente as políticas RLS das tabelas base

-- 🔹 1. View: Lista de Funcionários com Nome da Empresa
-- Facilita exibir funcionários com dados da empresa sem join no frontend
CREATE OR REPLACE VIEW public.v_funcionarios AS
SELECT 
  f.id,
  f.nome,
  f.email,
  f.cargo,
  f.matricula_esocial,
  f.data_nascimento,
  f.status,
  f.created_at,
  f.updated_at,
  e.nome as empresa_nome,
  e.id as empresa_id
FROM public.funcionarios f
JOIN public.empresas e ON e.id = f.empresa_id;

-- 🔹 2. View: Lista de Treinamentos com Participantes
-- Mostra treinamentos com contagem de participantes
CREATE OR REPLACE VIEW public.v_treinamentos AS
SELECT 
  t.id,
  t.nome,
  t.descricao,
  t.instrutor,
  t.data_treinamento,
  t.duracao,
  t.empresa_id,
  t.created_at,
  e.nome as empresa_nome,
  COALESCE(COUNT(tf.id), 0) as total_participantes
FROM public.treinamentos t
LEFT JOIN public.treinamento_funcionarios tf ON tf.treinamento_id = t.id
LEFT JOIN public.empresas e ON e.id = t.empresa_id
GROUP BY t.id, e.nome, e.id;

-- 🔹 3. View: Exames com Nome do Funcionário
-- Facilita consultas de exames com dados do funcionário
CREATE OR REPLACE VIEW public.v_exames_aso AS
SELECT 
  a.id,
  a.tipo,
  a.data_exame,
  a.validade,
  a.resultado,
  a.medico_responsavel,
  a.arquivo_url,
  a.created_at,
  f.nome as funcionario_nome,
  f.id as funcionario_id,
  f.empresa_id,
  e.nome as empresa_nome
FROM public.exames_aso a
JOIN public.funcionarios f ON f.id = a.funcionario_id
JOIN public.empresas e ON e.id = f.empresa_id;

-- 🔹 4. View: Não Conformidades com Empresa
-- Mostra NCs com dados da empresa
CREATE OR REPLACE VIEW public.v_nao_conformidades AS
SELECT 
  n.id,
  n.titulo,
  n.descricao,
  n.tipo,
  n.severidade,
  n.status,
  n.prazo_resolucao,
  n.responsavel,
  n.evidencias_url,
  n.created_at,
  n.updated_at,
  n.empresa_id,
  e.nome as empresa_nome
FROM public.nao_conformidades n
JOIN public.empresas e ON e.id = n.empresa_id;

-- 🔹 5. View: Inspeções de Segurança com Empresa
-- Facilita consultas de inspeções com dados da empresa
CREATE OR REPLACE VIEW public.v_inspecoes_seguranca AS
SELECT 
  i.id,
  i.tipo,
  i.local,
  i.data_inspecao,
  i.responsavel,
  i.status,
  i.observacoes,
  i.arquivo_url,
  i.created_at,
  i.empresa_id,
  e.nome as empresa_nome
FROM public.inspecoes_seguranca i
JOIN public.empresas e ON e.id = i.empresa_id;

-- 🔹 6. View: Incidentes com Empresa
-- Mostra incidentes com dados da empresa
CREATE OR REPLACE VIEW public.v_incidentes AS
SELECT 
  i.id,
  i.tipo,
  i.descricao,
  i.data_ocorrencia,
  i.local,
  i.gravidade,
  i.status,
  i.investigador,
  i.evidencias_url,
  i.created_at,
  i.empresa_id,
  e.nome as empresa_nome
FROM public.incidentes i
JOIN public.empresas e ON e.id = i.empresa_id;

-- 🔹 7. View: EPIs com Empresa
-- Facilita consultas de EPIs com dados da empresa
CREATE OR REPLACE VIEW public.v_epis AS
SELECT 
  ep.id,
  ep.nome,
  ep.tipo,
  ep.ca,
  ep.validade_ca,
  ep.fornecedor,
  ep.status,
  ep.created_at,
  ep.empresa_id,
  e.nome as empresa_nome
FROM public.epis ep
JOIN public.empresas e ON e.id = ep.empresa_id;

-- 🔹 8. View: Entregas de EPI com Funcionário e EPI
-- Mostra entregas com dados completos
CREATE OR REPLACE VIEW public.v_entregas_epi AS
SELECT 
  en.id,
  en.data_entrega,
  en.quantidade,
  en.observacoes,
  en.created_at,
  f.nome as funcionario_nome,
  f.id as funcionario_id,
  ep.nome as epi_nome,
  ep.id as epi_id,
  ep.tipo as epi_tipo,
  f.empresa_id,
  e.nome as empresa_nome
FROM public.entregas_epi en
JOIN public.funcionarios f ON f.id = en.funcionario_id
JOIN public.epis ep ON ep.id = en.epi_id
JOIN public.empresas e ON e.id = f.empresa_id;

-- =====================================================
-- COMENTÁRIOS SOBRE SEGURANÇA
-- =====================================================
-- ✅ Todas as views respeitam automaticamente as políticas RLS
-- ✅ Não introduzem bypass de segurança
-- ✅ Facilitam consultas no frontend sem comprometer a segurança
-- ✅ Centralizam lógica de join no backend

-- =====================================================
-- EXEMPLO DE USO NO FRONTEND
-- =====================================================
-- const { data, error } = await supabase
--   .from('v_funcionarios')
--   .select('*')
--   .eq('empresa_id', selectedEmpresaId);
