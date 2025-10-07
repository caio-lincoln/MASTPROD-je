# Scripts de Banco de Dados (Migrações)

Este diretório contém migrações SQL versionadas que definem e evoluem o esquema e funcionalidades do banco de dados da plataforma. Elas são fundamentais para reproduzir o ambiente em diferentes estágios (desenvolvimento, homologação e produção).

## Recomendações

- Mantenha todos os arquivos `.sql` sob controle de versão. Eles documentam a evolução do banco e permitem recriar o estado da plataforma de forma confiável.
- Não apague migrações históricas sem uma razão forte. Se o objetivo for reduzir o número de arquivos, considere fazer um "squash" controlado (criar uma migração base consolidada) e registrar claramente a versão a partir da qual o squash passa a valer.
- Artefatos de desenvolvimento/teste não-SQL devem permanecer fora deste diretório (ou ignorados via `.gitignore`).

## Como aplicar as migrações

As migrações são ordenadas pelo número no prefixo do arquivo (01, 02, 03, ...). Execute-as em ordem crescente.

- Usando `psql`:
  - `psql <DATABASE_URL> -f scripts/01-create-empresas-table.sql`
  - Repita em ordem para cada arquivo subsequente.

- Usando um cliente SQL (Supabase, DBeaver, pgAdmin):
  - Abra cada arquivo e execute seu conteúdo em ordem.

- Em pipelines/CI: automatize a execução sequencial em ordem numérica garantindo que o ambiente esteja limpo ou compatível com a evolução prevista.

## Índice das migrações

- `01-create-empresas-table.sql` – Criação da tabela de empresas.
- `02-create-funcionarios-table.sql` – Criação da tabela de funcionários.
- `03-create-usuario-empresas-table.sql` – Relaciona usuários às empresas.
- `04-create-additional-tables.sql` – Tabelas adicionais de apoio.
- `05-insert-sample-data.sql` – Dados de exemplo para validação inicial.
- `06-enable-rls.sql` – Habilitação de RLS (Row Level Security).
- `07-create-rls-policies.sql` – Políticas de RLS.
- `08-create-database-functions.sql` – Funções SQL/PLpgSQL auxiliares.
- `09-create-exames-aso-table.sql` – Tabela de exames/ASO.
- `10-update-rls-policies.sql` – Atualizações em políticas RLS.
- `11-grant-permissions.sql` – Grants e permissões.
- `12-create-treinamentos-table.sql` – Tabela de treinamentos.
- `13-create-nao-conformidades-table.sql` – Tabela de não conformidades.
- `14-create-rls-treinamentos-ncs.sql` – RLS para treinamentos e não conformidades.
- `15-insert-sample-treinamentos-ncs.sql` – Seeds de treinamentos e NCs.
- `17-create-incidentes-table.sql` – Tabela de incidentes.
- `18-insert-sample-seguranca-data.sql` – Seeds para dados de segurança.
- `19-create-epis-tables.sql` – Tabelas de EPIs.
- `20-create-rls-epis.sql` – RLS para EPIs.
- `21-insert-sample-epis-data.sql` – Seeds para EPIs.
- `22-add-arquivo-urls.sql` – Campos/ajustes de URLs de arquivo.
- `23-create-secure-views.sql` – Views seguras.
- `24-create-audit-system.sql` – Sistema de auditoria.
- `25-create-notifications-system.sql` – Sistema de notificações.
- `26-create-esocial-integration.sql` – Estrutura inicial da integração eSocial.
- `27-create-final-tables.sql` – Tabelas finais do domínio.
- `28-create-missing-tables.sql` – Complemento de tabelas faltantes.
- `29-configure-storage-buckets.sql` – Configuração de buckets de storage.
- `30-fix-missing-columns.sql` – Correções de colunas ausentes.
- `31-create-esocial-tables.sql` – Tabelas específicas do eSocial.
- `35-fix-certificados-esocial-valido.sql` – Ajustes de certificados válidos (eSocial).
- `38-create-esocial-eventos-tables.sql` – Tabelas de eventos do eSocial.
- `39-fix-esocial-integration-errors.sql` – Correções de erros de integração eSocial.
- `40-create-evidencias-bucket.sql` – Bucket de evidências.
- `41-create-profile-storage-bucket.sql` – Bucket de perfil.
- `42-create-certificados-bucket.sql` – Bucket de certificados.

## Convenções de nomeação

- Use o padrão: `NN-descricao-curta.sql`, onde `NN` é o número sequencial de dois dígitos.
- A descrição deve deixar claro o objetivo principal da migração.

## Dicas de manutenção

- Revisão periódica: verifique se todas as migrações ainda são coerentes com o estado atual e se dependências entre elas estão claras.
- Squash controlado: se decidir consolidar, crie uma migração base (ex.: `00-base.sql`) refletindo o estado pós-`NN` e documente a partir de qual versão o squash vale.
- Documentação: mantenha este README atualizado conforme novas migrações são adicionadas.

## Observações

- Artefatos de desenvolvimento/teste não-SQL foram removidos e estão protegidos por regras no `.gitignore`.
- Este README serve como guia e índice; os arquivos `.sql` são a fonte de verdade para a estrutura do banco.