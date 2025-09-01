-- Dados de exemplo para treinamentos (usando empresa_id da empresa de exemplo)
insert into public.treinamentos (empresa_id, nome, descricao, instrutor, data_treinamento, duracao) values
(
  (select id from public.empresas limit 1),
  'NR-35 - Trabalho em Altura',
  'Treinamento obrigatório para trabalhos realizados acima de 2 metros de altura',
  'João Silva - CIPA',
  '2024-01-15',
  '8 horas'
),
(
  (select id from public.empresas limit 1),
  'Primeiros Socorros',
  'Capacitação em técnicas básicas de primeiros socorros no ambiente de trabalho',
  'Maria Santos - Enfermeira',
  '2024-02-20',
  '4 horas'
),
(
  (select id from public.empresas limit 1),
  'Uso de EPIs',
  'Treinamento sobre uso correto de Equipamentos de Proteção Individual',
  'Carlos Oliveira - Técnico em Segurança',
  '2024-03-10',
  '2 horas'
);

-- Dados de exemplo para não conformidades
insert into public.nao_conformidades (empresa_id, titulo, descricao, tipo, severidade, responsavel, prazo_resolucao, status) values
(
  (select id from public.empresas limit 1),
  'Falta de sinalização em área de risco',
  'Área de trabalho com máquinas sem sinalização adequada de segurança',
  'segurança',
  'crítica',
  'João Silva',
  '2024-12-31',
  'pendente'
),
(
  (select id from public.empresas limit 1),
  'Procedimento não seguido',
  'Funcionário não utilizou EPI durante operação de soldagem',
  'processo',
  'moderada',
  'Maria Santos',
  '2024-12-15',
  'em_andamento'
),
(
  (select id from public.empresas limit 1),
  'Equipamento com defeito',
  'Extintor de incêndio com prazo de validade vencido',
  'qualidade',
  'leve',
  'Carlos Oliveira',
  '2024-11-30',
  'resolvida'
);
