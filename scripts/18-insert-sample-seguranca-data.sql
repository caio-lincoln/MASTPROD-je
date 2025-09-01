-- Inserir dados de exemplo para inspeções de segurança
insert into public.inspecoes_seguranca (empresa_id, setor, local_inspecao, data_inspecao, responsavel, status, observacoes, agendar_proxima) values
-- Empresa 1
((select id from public.empresas limit 1), 'Produção', 'Linha de Montagem A', '2024-01-15', 'João Silva', 'concluída', 'Equipamentos em bom estado. Recomendado limpeza dos filtros.', '2024-04-15'),
((select id from public.empresas limit 1), 'Almoxarifado', 'Estoque Principal', '2024-01-20', 'Maria Santos', 'concluída', 'Identificadas prateleiras com sobrecarga. Necessário redistribuição.', '2024-04-20'),
((select id from public.empresas limit 1), 'Manutenção', 'Oficina Mecânica', '2024-02-01', 'Carlos Oliveira', 'pendente', 'Inspeção agendada para verificação de ferramentas e EPIs.', '2024-05-01'),

-- Empresa 2 (se existir)
(coalesce((select id from public.empresas offset 1 limit 1), (select id from public.empresas limit 1)), 'Administrativo', 'Escritório Central', '2024-01-25', 'Ana Costa', 'concluída', 'Verificação de ergonomia das estações de trabalho. Tudo conforme.', '2024-04-25'),
(coalesce((select id from public.empresas offset 1 limit 1), (select id from public.empresas limit 1)), 'TI', 'Data Center', '2024-02-05', 'Pedro Lima', 'pendente', 'Inspeção de sistemas de refrigeração e segurança elétrica.', '2024-05-05');

-- Inserir dados de exemplo para incidentes
insert into public.incidentes (empresa_id, data_ocorrencia, local, descricao, tipo, gravidade, funcionario_id, status, investigacao) values
-- Empresa 1
((select id from public.empresas limit 1), '2024-01-10', 'Linha de Produção B', 'Funcionário escorregou em piso molhado', 'acidente', 'leve', (select id from public.funcionarios where empresa_id = (select id from public.empresas limit 1) limit 1), 'fechado', 'Investigação concluída. Implementada sinalização de piso molhado e treinamento adicional.'),
((select id from public.empresas limit 1), '2024-01-18', 'Almoxarifado', 'Quase queda de material de prateleira alta', 'incidente', 'moderada', (select id from public.funcionarios where empresa_id = (select id from public.empresas limit 1) offset 1 limit 1), 'investigando', 'Em investigação. Verificando procedimentos de armazenamento.'),
((select id from public.empresas limit 1), '2024-02-02', 'Estacionamento', 'Pequeno vazamento de óleo de veículo da empresa', 'incidente', 'leve', null, 'aberto', 'Reportado pela equipe de limpeza. Aguardando manutenção do veículo.'),

-- Empresa 2 (se existir)
(coalesce((select id from public.empresas offset 1 limit 1), (select id from public.empresas limit 1)), '2024-01-22', 'Escritório', 'Funcionário relatou dor nas costas por cadeira inadequada', 'incidente', 'leve', coalesce((select id from public.funcionarios where empresa_id = (select id from public.empresas offset 1 limit 1) limit 1), (select id from public.funcionarios limit 1)), 'fechado', 'Cadeira substituída por modelo ergonômico. Funcionário sem mais queixas.'),
(coalesce((select id from public.empresas offset 1 limit 1), (select id from public.empresas limit 1)), '2024-02-08', 'Recepção', 'Visitante tropeçou em tapete solto', 'acidente', 'leve', null, 'investigando', 'Verificando procedimentos de manutenção predial e sinalização.');
