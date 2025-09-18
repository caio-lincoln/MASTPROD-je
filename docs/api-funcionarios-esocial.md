# API de Funcionários eSocial

Esta documentação descreve os endpoints REST para consulta de funcionários integrados com o eSocial.

## Endpoints Disponíveis

### 1. Listar Todos os Funcionários

**GET** `/api/sst/empresas/{cnpj}/funcionarios`

Retorna todos os funcionários da empresa (ativos e desligados).

#### Parâmetros de Query:
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Registros por página (padrão: 50, máximo: 100)
- `search` (opcional): Busca por nome ou CPF
- `cargo` (opcional): Filtro por cargo
- `status` (opcional): Filtro por status (ativo/inativo)

#### Resposta:
```json
{
  "success": true,
  "empresa": {
    "cnpj": "12345678000195",
    "razao_social": "Empresa Exemplo LTDA"
  },
  "funcionarios": [
    {
      "id": 1,
      "nome": "João Silva",
      "cpf": "12345678901",
      "matricula_esocial": "001",
      "cargo": "Analista",
      "categoria": "101",
      "data_admissao": "2023-01-15",
      "data_desligamento": null,
      "status": "ativo",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "estatisticas": {
    "total": 150,
    "ativos": 140,
    "inativos": 10,
    "admitidos_mes_atual": 5,
    "desligados_mes_atual": 2
  }
}
```

### 2. Listar Funcionários por Status

**GET** `/api/sst/empresas/{cnpj}/funcionarios/status/{status}`

Retorna funcionários filtrados por status específico.

#### Parâmetros de Rota:
- `status`: `ativo`, `inativo` ou `todos`

#### Parâmetros de Query:
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Registros por página (padrão: 50, máximo: 100)
- `search` (opcional): Busca por nome ou CPF
- `cargo` (opcional): Filtro por cargo

#### Exemplo de Uso:
```
GET /api/sst/empresas/12345678000195/funcionarios/status/ativo?page=1&limit=20
```

### 3. Consultar Funcionário Específico

**GET** `/api/sst/empresas/{cnpj}/funcionarios/{id}`

Retorna dados detalhados de um funcionário específico.

#### Parâmetros de Rota:
- `id`: ID do funcionário

#### Resposta:
```json
{
  "success": true,
  "empresa": {
    "cnpj": "12345678000195",
    "razao_social": "Empresa Exemplo LTDA"
  },
  "funcionario": {
    "id": 1,
    "nome": "João Silva",
    "cpf": "12345678901",
    "matricula_esocial": "001",
    "cargo": "Analista",
    "categoria": "101",
    "data_admissao": "2023-01-15",
    "data_desligamento": null,
    "status": "ativo",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### 4. Sincronizar Funcionários com eSocial

**POST** `/api/sst/empresas/{cnpj}/funcionarios/sincronizar`

Executa sincronização dos dados de funcionários com o eSocial.

#### Body (JSON):
```json
{
  "data_inicio": "2024-01-01",
  "data_fim": "2024-01-31",
  "tipos_eventos": ["S-2200", "S-2206", "S-2299", "S-2300", "S-2399"],
  "forcar_sincronizacao": false
}
```

#### Resposta de Sucesso:
```json
{
  "success": true,
  "message": "Sincronização concluída com sucesso",
  "sincronizacao": {
    "funcionarios_processados": 25,
    "funcionarios_novos": 5,
    "funcionarios_atualizados": 20,
    "tempo_execucao_ms": 15000
  },
  "estatisticas_atualizadas": {
    "total": 150,
    "ativos": 140,
    "inativos": 10
  },
  "log_id": "abc123"
}
```

### 5. Consultar Status de Sincronização

**GET** `/api/sst/empresas/{cnpj}/funcionarios/sincronizar`

Retorna o status atual da sincronização e histórico.

#### Resposta:
```json
{
  "success": true,
  "empresa": {
    "cnpj": "12345678000195",
    "razao_social": "Empresa Exemplo LTDA",
    "ultima_sincronizacao": "2024-01-15T10:00:00Z"
  },
  "status_sincronizacao": {
    "em_andamento": false,
    "proxima_permitida": "2024-01-15T10:30:00Z",
    "pode_sincronizar": true
  },
  "historico_sincronizacoes": [
    {
      "id": "abc123",
      "status": "concluido",
      "iniciado_em": "2024-01-15T10:00:00Z",
      "concluido_em": "2024-01-15T10:00:15Z",
      "resultado": {
        "funcionarios_processados": 25,
        "funcionarios_novos": 5,
        "funcionarios_atualizados": 20
      }
    }
  ]
}
```

## Códigos de Status HTTP

- `200`: Sucesso
- `400`: Requisição inválida (CNPJ inválido, parâmetros incorretos)
- `401`: Não autorizado (usuário não autenticado)
- `404`: Não encontrado (empresa ou funcionário não encontrado)
- `409`: Conflito (sincronização já em andamento)
- `429`: Muitas requisições (limite de sincronização atingido)
- `500`: Erro interno do servidor

## Eventos eSocial Processados

A integração processa os seguintes eventos do eSocial:

- **S-2200**: Admissão/Cadastro inicial do vínculo
- **S-2206**: Alteração contratual
- **S-2299**: Desligamento
- **S-2300**: Trabalhador sem vínculo (TSV)
- **S-2399**: Término de TSV

## Autenticação

Todos os endpoints requerem autenticação via Supabase Auth. O usuário deve estar logado e ter acesso à empresa consultada.

## Limitações

- Sincronização limitada a uma vez a cada 30 minutos por empresa
- Máximo de 100 registros por página nas consultas
- Timeout de 5 minutos para operações de sincronização