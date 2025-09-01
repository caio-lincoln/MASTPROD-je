-- Dados de exemplo para EPIs
-- Inserir dados de teste para as tabelas de EPIs

-- Inserir EPIs de exemplo
insert into public.epis (empresa_id, nome, descricao, categoria, numero_ca, data_validade_ca, status) values
-- Para empresa 1
((select id from public.empresas limit 1), 'Capacete de Segurança Branco', 'Capacete de proteção classe A', 'Proteção da Cabeça', '12345', '2025-12-31', 'ativo'),
((select id from public.empresas limit 1), 'Óculos de Proteção', 'Óculos contra impactos', 'Proteção dos Olhos', '23456', '2025-06-30', 'ativo'),
((select id from public.empresas limit 1), 'Luvas de Segurança', 'Luvas de couro para proteção das mãos', 'Proteção das Mãos', '34567', '2024-12-31', 'ativo'),
((select id from public.empresas limit 1), 'Botina de Segurança', 'Botina com biqueira de aço', 'Proteção dos Pés', '45678', '2026-03-31', 'ativo'),
((select id from public.empresas limit 1), 'Protetor Auricular', 'Protetor tipo concha', 'Proteção Auditiva', '56789', '2025-09-30', 'ativo');

-- Inserir entregas de EPIs
insert into public.entregas_epi (epi_id, funcionario_id, data_entrega, quantidade, responsavel, observacoes) values
-- Entregas para funcionários da empresa 1
((select id from public.epis where nome = 'Capacete de Segurança Branco' limit 1), 
 (select id from public.funcionarios limit 1), 
 '2024-01-15', 1, 'João Silva - Técnico de Segurança', 'Entrega conforme NR-6'),
((select id from public.epis where nome = 'Óculos de Proteção' limit 1), 
 (select id from public.funcionarios limit 1), 
 '2024-01-15', 1, 'João Silva - Técnico de Segurança', 'Funcionário treinado no uso'),
((select id from public.epis where nome = 'Luvas de Segurança' limit 1), 
 (select id from public.funcionarios offset 1 limit 1), 
 '2024-01-20', 2, 'João Silva - Técnico de Segurança', 'Par reserva fornecido');

-- Inserir inspeções de EPIs
insert into public.inspecoes_epi (epi_id, data_inspecao, resultado, responsavel, observacoes) values
((select id from public.epis where nome = 'Capacete de Segurança Branco' limit 1), 
 '2024-02-01', 'aprovado', 'Maria Santos - SESMT', 'Equipamento em boas condições'),
((select id from public.epis where nome = 'Óculos de Proteção' limit 1), 
 '2024-02-01', 'aprovado', 'Maria Santos - SESMT', 'Lentes sem riscos'),
((select id from public.epis where nome = 'Botina de Segurança' limit 1), 
 '2024-02-15', 'reprovado', 'Maria Santos - SESMT', 'Solado apresentando desgaste excessivo');

-- Inserir manutenções de EPIs
insert into public.manutencoes_epi (epi_id, tipo, data_manutencao, responsavel, descricao, status) values
((select id from public.epis where nome = 'Botina de Segurança' limit 1), 
 'corretiva', '2024-02-20', 'Oficina ABC Calçados', 'Substituição do solado', 'realizada'),
((select id from public.epis where nome = 'Capacete de Segurança Branco' limit 1), 
 'preventiva', '2024-03-01', 'Equipe Interna', 'Limpeza e verificação geral', 'realizada');
