/**
 * Configurações SSL personalizadas para contornar problemas de certificado do eSocial
 * O ambiente de produção restrita do eSocial possui certificados que podem não ser
 * reconhecidos por alguns clientes HTTP padrão.
 */

export interface SSLConfig {
  rejectUnauthorized: boolean
  secureProtocol: string
  ciphers: string
  timeout: number
}

/**
 * Configuração SSL para ambiente de produção restrita do eSocial
 */
export const ESOCIAL_SSL_CONFIG: SSLConfig = {
  // Aceitar certificados auto-assinados ou com problemas de validação
  rejectUnauthorized: false,
  
  // Forçar uso do TLS 1.2 (requerido pelo eSocial)
  secureProtocol: 'TLSv1_2_method',
  
  // Ciphers seguros compatíveis com o eSocial
  ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS',
  
  // Timeout de 30 segundos para conexões
  timeout: 30000,
}

/**
 * Headers HTTP padrão para requisições ao eSocial
 */
export const ESOCIAL_HEADERS = {
  'Content-Type': 'text/xml; charset=utf-8',
  'User-Agent': 'SST-System/1.0',
  'Accept': 'text/xml, application/soap+xml',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

/**
 * Cria um agente HTTPS personalizado para Node.js com configurações SSL do eSocial
 */
export function createEsocialHttpsAgent() {
  if (typeof window !== 'undefined') {
    // No browser, não podemos configurar agente HTTPS
    return null
  }

  const https = require('https')
  
  return new https.Agent({
    ...ESOCIAL_SSL_CONFIG,
    // Configurações adicionais para estabilidade
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 10,
    maxFreeSockets: 5,
  })
}

/**
 * Configurações de fetch personalizadas para requisições ao eSocial
 */
export function createEsocialFetchOptions(
  method: 'GET' | 'POST' = 'POST',
  body?: string,
  additionalHeaders?: Record<string, string>
): RequestInit {
  const options: RequestInit = {
    method,
    headers: {
      ...ESOCIAL_HEADERS,
      ...additionalHeaders,
    },
    timeout: ESOCIAL_SSL_CONFIG.timeout,
  }

  if (body) {
    options.body = body
  }

  // Adicionar agente HTTPS personalizado para Node.js
  const agent = createEsocialHttpsAgent()
  if (agent) {
    // @ts-ignore - Propriedade específica do Node.js
    options.agent = agent
  }

  return options
}