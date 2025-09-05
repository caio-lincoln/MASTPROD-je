# Relatório do Banco de Dados - Sistema MASTPROD

## Tabelas Criadas

### 1. **relatorios_gerados**
- **Colunas**: id, empresa_id, tipo_relatorio, parametros, arquivo_url, status, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 2. **treinamentos**
- **Colunas**: id, empresa_id, nome, descricao, tipo, duracao_horas, instrutor, data_inicio, data_fim, status, observacoes, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 3. **nao_conformidades**
- **Colunas**: id, empresa_id, tipo, descricao, setor, responsavel, data_identificacao, prazo_correcao, status, acoes_corretivas, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 4. **empresas**
- **Colunas**: id, nome, cnpj, endereco, telefone, email, responsavel_sst, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 3 políticas (SELECT, INSERT, UPDATE) com controle de acesso por empresa

### 5. **fatores_risco**
- **Colunas**: id, empresa_id, nome, tipo, descricao, nivel_risco, medidas_controle, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 6 políticas incluindo acesso do sistema e controle por empresa

### 6. **esocial_config**
- **Colunas**: id, empresa_id, certificado_a1_path, certificado_a1_senha, certificado_a3_serial, ambiente, tpinsc, nrinsc, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 2 políticas (ALL, SELECT) baseadas na empresa do usuário

### 7. **incidentes**
- **Colunas**: id, empresa_id, tipo, descricao, data_ocorrencia, local_ocorrencia, funcionario_envolvido, gravidade, status, acoes_tomadas, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 8. **inspecoes_seguranca**
- **Colunas**: id, empresa_id, tipo_inspecao, data_inspecao, responsavel, area_inspecionada, itens_verificados, nao_conformidades_encontradas, acoes_requeridas, status, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 9. **funcionarios**
- **Colunas**: id, empresa_id, nome, cpf, cargo, setor, data_admissao, data_nascimento, telefone, email, endereco, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 10. **epis**
- **Colunas**: id, empresa_id, nome, tipo, ca, descricao, validade_ca, fornecedor, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 11. **entregas_epi**
- **Colunas**: id, funcionario_id, epi_id, data_entrega, quantidade, data_vencimento, observacoes, created_at, updated_at, empresa_id
- **RLS**: Ativo
- **Políticas**: 8 políticas (múltiplas para SELECT, INSERT, UPDATE, DELETE) com controle por empresa

### 12. **exames_medicos**
- **Colunas**: id, empresa_id, funcionario_id, tipo_exame, data_exame, resultado, medico_responsavel, observacoes, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 6 políticas (SELECT, INSERT, UPDATE, DELETE) com controle por empresa

### 13. **exames_aso**
- **Colunas**: id, funcionario_id, tipo_aso, data_exame, resultado, medico_responsavel, observacoes, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 1 política (ALL) baseada no funcionário autorizado

### 14. **documentos**
- **Colunas**: id, empresa_id, nome, tipo, arquivo_url, descricao, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 15. **configuracoes_sistema**
- **Colunas**: id, empresa_id, chave, valor, descricao, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 16. **backups**
- **Colunas**: id, empresa_id, nome, tipo, arquivo_url, tamanho, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

### 17. **esocial_lotes**
- **Colunas**: id, empresa_id, numero_lote, status, data_envio, data_processamento, total_eventos, eventos_processados, eventos_rejeitados, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 2 políticas (ALL, SELECT) baseadas na empresa do usuário

### 18. **eventos_esocial**
- **Colunas**: id, tipo_evento, entidade_id, funcionario_id, empresa_id, status, mensagem_retorno, xml_gerado, data_envio, created_at, updated_at, xml_url, data_evento, lote_id, xml_original, xml_assinado, numero_recibo, data_processamento, erros
- **RLS**: Ativo
- **Políticas**: 5 políticas incluindo acesso do sistema e controle por empresa

### 19. **certificados_esocial**
- **Colunas**: id, empresa_id, nome, tipo, arquivo_url, senha_certificado, data_validade, ativo, observacoes, created_at, updated_at
- **RLS**: Ativo
- **Políticas**: 4 políticas (SELECT, INSERT, UPDATE, DELETE) baseadas na empresa do usuário

## Buckets de Armazenamento

### 1. **certificados-esocial**
- **Público**: Não
- **Limite de tamanho**: 10,485,760 bytes (10MB)
- **Tipos MIME permitidos**: application/x-pkcs12, application/pkcs12, application/x-pkcs7-certificates
- **Políticas RLS**: 4 políticas para controle de acesso por empresa

### 2. **asos**
- **Público**: Não
- **Limite de tamanho**: 52,428,800 bytes (50MB)
- **Tipos MIME permitidos**: application/pdf
- **Políticas RLS**: Configuradas para controle de acesso

### 3. **backups**
- **Público**: Não
- **Limite de tamanho**: 1,073,741,824 bytes (1GB)
- **Tipos MIME permitidos**: application/zip, application/x-zip-compressed
- **Políticas RLS**: Configuradas para controle de acesso

### 4. **biblioteca**
- **Público**: Não
- **Limite de tamanho**: 104,857,600 bytes (100MB)
- **Tipos MIME permitidos**: application/pdf, image/jpeg, image/png
- **Políticas RLS**: Configuradas para controle de acesso

### 5. **documentos**
- **Público**: Não
- **Limite de tamanho**: 104,857,600 bytes (100MB)
- **Tipos MIME permitidos**: application/pdf, image/jpeg, image/png, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- **Políticas RLS**: Configuradas para controle de acesso

### 6. **relatorios**
- **Público**: Não
- **Limite de tamanho**: 52,428,800 bytes (50MB)
- **Tipos MIME permitidos**: application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- **Políticas RLS**: Configuradas para controle de acesso

## Resumo das Políticas RLS

### Padrões de Segurança:
- **Controle por Empresa**: Todas as tabelas implementam controle de acesso baseado na empresa do usuário através da tabela `usuario_empresas`
- **Operações CRUD**: Políticas separadas para SELECT, INSERT, UPDATE e DELETE
- **Acesso do Sistema**: Algumas tabelas permitem acesso total para `service_role` ou quando `auth.uid()` é NULL
- **Restrições Específicas**: Algumas operações têm restrições adicionais (ex: deletar apenas eventos pendentes)

### Total de Políticas Implementadas:
- **Tabelas**: 19 tabelas com RLS ativo
- **Buckets**: 6 buckets com políticas de acesso
- **Políticas Totais**: Mais de 80 políticas RLS implementadas

## Funcionalidades de Segurança

### 1. **Row Level Security (RLS)**
- Todas as tabelas têm RLS ativo
- Controle granular de acesso por empresa
- Políticas específicas para cada operação CRUD

### 2. **Controle de Acesso a Arquivos**
- Buckets privados por padrão
- Limites de tamanho configurados
- Tipos MIME específicos permitidos
- Políticas RLS para controle de acesso aos arquivos

### 3. **Auditoria**
- Campos `created_at` e `updated_at` em todas as tabelas
- Triggers automáticos para atualização de timestamps
- Rastreamento de alterações através do sistema de usuários

---

**Relatório gerado em**: " + new Date().toLocaleString('pt-BR') + "
**Sistema**: MASTPROD - Gestão de Segurança do Trabalho
**Banco de Dados**: Supabase PostgreSQL