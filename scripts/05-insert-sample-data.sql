-- Inserir dados de exemplo para empresas
insert into public.empresas (nome, cnpj, endereco, telefone, email) values
('Empresa Exemplo Ltda', '12.345.678/0001-90', 'Rua das Flores, 123 - São Paulo/SP', '(11) 1234-5678', 'contato@exemplo.com'),
('Indústria ABC S.A.', '98.765.432/0001-10', 'Av. Industrial, 456 - Rio de Janeiro/RJ', '(21) 9876-5432', 'admin@industriaabc.com'),
('Comércio XYZ Ltda', '11.222.333/0001-44', 'Rua do Comércio, 789 - Belo Horizonte/MG', '(31) 1111-2222', 'info@comercioxyz.com');

-- Inserir funcionários de exemplo (usando IDs das empresas criadas)
insert into public.funcionarios (empresa_id, nome, matricula_esocial, data_nascimento, cpf, email, cargo, setor) 
select 
  e.id,
  'João Silva',
  'ESC001',
  '1985-03-15',
  '123.456.789-00',
  'joao.silva@exemplo.com',
  'Analista de Segurança',
  'Segurança do Trabalho'
from public.empresas e where e.nome = 'Empresa Exemplo Ltda'
limit 1;

insert into public.funcionarios (empresa_id, nome, matricula_esocial, data_nascimento, cpf, email, cargo, setor) 
select 
  e.id,
  'Maria Santos',
  'ESC002',
  '1990-07-22',
  '987.654.321-00',
  'maria.santos@exemplo.com',
  'Técnica em Segurança',
  'Segurança do Trabalho'
from public.empresas e where e.nome = 'Empresa Exemplo Ltda'
limit 1;
