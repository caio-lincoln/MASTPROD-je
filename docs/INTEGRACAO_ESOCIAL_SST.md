# Integração eSocial/SST - Documentação Técnica

## Visão Geral

Esta documentação descreve a implementação completa da integração com o eSocial/SST para consulta e sincronização de funcionários de empresas através do CNPJ e certificado digital A1/A3.

## Arquitetura da Solução

### Componentes Principais

1. **Cliente SOAP** (`lib/esocial/soap-client.tsx`)
   - Comunicação com web services do eSocial
   - Autenticação via certificado digital
   - Envio e consulta de lotes de eventos

2. **Serviço de Consulta** (`lib/esocial/consulta-funcionarios.ts`)
   - Consulta eventos específicos de funcionários
   - Processamento de respostas SOAP
   - Extração de dados dos XMLs

3. **Parser de Funcionários** (`lib/esocial/funcionarios-parser.ts`)
   - Consolidação de eventos por funcionário
   - Determinação de situação atual (Ativo/Desligado)
   - Conversão para formato padronizado da API

4. **Serviço de Persistência** (`lib/esocial/funcionarios-service.ts`)
   - Sincronização com banco de dados
   - Controle de histórico de eventos
   - Gestão de última sincronização

5. **Sistema de Agendamento** (`lib/esocial/sync-scheduler.ts`)
   - Sincronização manual e automática
   - Controle de jobs concorrentes
   - Monitoramento de status

## Estrutura do Banco de Dados

### Tabela: `esocial_funcionarios`

```sql
CREATE TABLE esocial_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_empresa TEXT NOT NULL,
  cpf TEXT NOT NULL,
  nome TEXT NOT NULL,
  matricula TEXT,
  cargo TEXT,
  categoria TEXT,
  data_admissao TEXT,
  data_desligamento TEXT,
  situacao_atual TEXT NOT NULL DEFAULT 'Ativo',
  hash_dados TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: `esocial_eventos`

```sql
CREATE TABLE esocial_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_empresa TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  cpf_funcionario TEXT,
  data_evento TEXT,
  numero_recibo TEXT,
  status_processamento TEXT DEFAULT 'processado',
  conteudo_xml TEXT,
  dados_funcionario JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Endpoints da API

### 1. Listar Funcionários

**GET** `/api/sst/empresas/{cnpj}/funcionarios`

**Parâmetros de Query:**
- `status`: `ativo` | `desligado` | `todos` (padrão: `todos`)
- `page`: número da página (padrão: 1)
- `limit`: registros por página (máximo: 100, padrão: 50)
- `search`: busca por nome ou CPF
- `cargo`: filtro por cargo
- `categoria`: filtro por categoria

**Resposta:**
```json
{
  "success": true,
  "empresa": {
    "cnpj": "12345678000195",
    "razao_social": "Empresa Exemplo LTDA"
  },
  "funcionarios": [
    {
      "cpf": "03581916533",
      "nome": "Adriana Libanio dos Santos",
      "matricula": "UG1185M8001878",
      "cargo": "Assessor Parlamentar",
      "categoria": "Servidor público ocupante de cargo exclusivo em comissão",
      "admissao": "2025-01-02",
      "desligamento": "2025-07-03",
      "situacao": "Desligado"
    }
  ],
  "paginacao": {
    "pagina_atual": 1,
    "total_paginas": 5,
    "total_registros": 250,
    "registros_por_pagina": 50
  }
}
```

### 2. Sincronizar Funcionários

**POST** `/api/sst/empresas/{cnpj}/funcionarios/sincronizar`

**Resposta:**
```json
{
  "success": true,
  "message": "Sincronização iniciada com sucesso",
  "job_id": "manual_12345678000195_1758144965123",
  "estimativa_tempo": "5-10 minutos"
}
```

### 3. Status da Sincronização

**GET** `/api/sst/empresas/{cnpj}/funcionarios/sincronizar`

**Resposta:**
```json
{
  "success": true,
  "status": "completed",
  "ultima_sincronizacao": "2025-01-18T10:30:00Z",
  "proxima_sincronizacao": "2025-01-18T16:30:00Z",
  "estatisticas": {
    "funcionarios_processados": 150,
    "eventos_processados": 300,
    "tempo_execucao_ms": 45000
  }
}
```

### 4. Estatísticas Detalhadas

**GET** `/api/sst/empresas/{cnpj}/funcionarios/estatisticas`

**Resposta:**
```json
{
  "success": true,
  "estatisticas_gerais": {
    "total_funcionarios": 150,
    "funcionarios_ativos": 120,
    "funcionarios_desligados": 30,
    "percentual_ativos": 80,
    "percentual_desligados": 20
  },
  "distribuicoes": {
    "por_cargo": [
      {
        "cargo": "Analista",
        "total": 45,
        "ativos": 40,
        "desligados": 5
      }
    ],
    "por_categoria": [
      {
        "categoria": "Empregado CLT",
        "total": 100,
        "ativos": 85,
        "desligados": 15
      }
    ]
  },
  "tendencias": {
    "admissoes": {
      "ultimos_30_dias": 5,
      "anteriores_30_dias": 3,
      "variacao": 2
    }
  }
}
```

### 5. Histórico de Eventos

**GET** `/api/sst/empresas/{cnpj}/funcionarios/historico`

**Parâmetros de Query:**
- `cpf`: filtrar por CPF específico
- `tipo_evento`: S-2200, S-2206, S-2299, S-2300, S-2399
- `data_inicio`: data inicial (YYYY-MM-DD)
- `data_fim`: data final (YYYY-MM-DD)
- `page`: número da página
- `limit`: registros por página

**Resposta:**
```json
{
  "success": true,
  "eventos": [
    {
      "id": "uuid",
      "tipo_evento": "S-2200",
      "cpf_funcionario": "12345678901",
      "nome_funcionario": "João Silva",
      "data_evento": "2025-01-15",
      "numero_recibo": "1.2.202501.0000001",
      "status_processamento": "processado"
    }
  ],
  "estatisticas": {
    "total_eventos": 500,
    "eventos_por_tipo": {
      "S-2200": 150,
      "S-2299": 30,
      "S-2206": 200
    }
  }
}
```

### 6. Monitoramento de Sincronizações

**GET** `/api/sst/sync/status`

**Parâmetros de Query:**
- `job_id`: ID específico do job
- `status`: pending, running, completed, failed
- `tipo`: manual, automatica
- `limit`: máximo de jobs retornados

**POST** `/api/sst/sync/status`

**Ações disponíveis:**
```json
{
  "acao": "agendar_manual",
  "cnpj": "12345678000195"
}
```

```json
{
  "acao": "agendar_automatica"
}
```

```json
{
  "acao": "cancelar",
  "job_id": "manual_12345678000195_1758144965123"
}
```

## Eventos do eSocial Suportados

### S-2200 - Cadastro Inicial do Vínculo e Admissão/Ingresso de Trabalhador
- **Finalidade**: Registra admissão de funcionário
- **Dados extraídos**: CPF, nome, matrícula, cargo, categoria, data de admissão

### S-2206 - Alteração de Dados Contratuais
- **Finalidade**: Registra mudanças contratuais
- **Dados extraídos**: Alterações de cargo, categoria, salário

### S-2299 - Desligamento
- **Finalidade**: Registra desligamento de funcionário
- **Dados extraídos**: Data de desligamento, motivo

### S-2300 - Trabalhador Sem Vínculo de Emprego/Estatutário - Início
- **Finalidade**: Registra início de TSV
- **Dados extraídos**: Dados do trabalhador sem vínculo

### S-2399 - Trabalhador Sem Vínculo de Emprego/Estatutário - Término
- **Finalidade**: Registra término de TSV
- **Dados extraídos**: Data de término

## Configuração e Deployment

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# eSocial
ESOCIAL_URL_CONSULTA=https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc
ESOCIAL_CERTIFICADO=path_to_certificate_or_base64

# Configurações
NODE_ENV=production
```

### Dependências

```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/supabase-js": "^2.38.4",
    "xml2js": "^0.6.2",
    "soap": "^1.0.0"
  }
}
```

## Segurança e Compliance

### Autenticação
- Certificado digital A1/A3 obrigatório
- Validação de CNPJ
- Controle de acesso por usuário/empresa

### Proteção de Dados
- Criptografia de dados sensíveis
- Logs de auditoria
- Controle de acesso granular via RLS (Row Level Security)

### Rate Limiting
- Máximo 1 sincronização manual por empresa a cada 30 minutos
- Máximo 3 jobs concorrentes no scheduler
- Timeout de 10 minutos por sincronização

## Monitoramento e Logs

### Métricas Importantes
- Tempo de resposta das consultas ao eSocial
- Taxa de sucesso das sincronizações
- Número de funcionários processados por hora
- Erros de conectividade ou certificado

### Logs de Auditoria
- Todas as sincronizações são registradas
- Histórico completo de eventos processados
- Rastreabilidade de alterações nos dados

## Troubleshooting

### Problemas Comuns

1. **Erro de Certificado**
   - Verificar validade do certificado
   - Confirmar configuração correta
   - Validar permissões de acesso

2. **Timeout na Consulta**
   - Verificar conectividade com eSocial
   - Reduzir período de consulta
   - Implementar retry automático

3. **Dados Inconsistentes**
   - Verificar ordem cronológica dos eventos
   - Validar parsing dos XMLs
   - Conferir mapeamento de categorias

### Comandos de Diagnóstico

```bash
# Verificar status das sincronizações
curl -X GET "/api/sst/sync/status"

# Forçar limpeza de jobs antigos
curl -X POST "/api/sst/sync/status" -d '{"acao": "limpar_antigos"}'

# Verificar estatísticas de uma empresa
curl -X GET "/api/sst/empresas/12345678000195/funcionarios/estatisticas"
```

## Roadmap e Melhorias Futuras

### Próximas Funcionalidades
- [ ] Sincronização incremental baseada em data
- [ ] Notificações em tempo real via WebSocket
- [ ] Dashboard de monitoramento visual
- [ ] Exportação de relatórios em PDF/Excel
- [ ] API de webhooks para integração externa

### Otimizações Planejadas
- [ ] Cache Redis para consultas frequentes
- [ ] Processamento assíncrono com filas
- [ ] Compressão de dados históricos
- [ ] Índices otimizados para consultas complexas

---

**Versão**: 1.0.0  
**Data**: Janeiro 2025  
**Autor**: Sistema de Integração eSocial/SST