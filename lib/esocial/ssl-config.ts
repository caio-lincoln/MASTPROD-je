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
  // Em conformidade, rejeitar certificados inválidos; pode ser flexibilizado em homologação
  rejectUnauthorized: true,
  
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
export function createEsocialHttpsAgent(options?: { pfx?: Buffer | string; passphrase?: string; rejectUnauthorized?: boolean }) {
  if (typeof window !== 'undefined') {
    // No browser, não podemos configurar agente HTTPS
    return null
  }

  const https = require('https')
  const baseReject = typeof options?.rejectUnauthorized === 'boolean' ? options.rejectUnauthorized : ESOCIAL_SSL_CONFIG.rejectUnauthorized
  
  return new https.Agent({
    ...ESOCIAL_SSL_CONFIG,
    rejectUnauthorized: baseReject,
    // mTLS: certificado cliente
    pfx: options?.pfx,
    passphrase: options?.passphrase,
    // Configurações adicionais para estabilidade
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 10,
    maxFreeSockets: 5,
  })
}

/**
 * Cria um dispatcher Undici para uso com fetch em Node (Next.js usa Undici por padrão).
 * Isso garante que o certificado cliente PFX seja efetivamente utilizado em mTLS.
 */
export function createEsocialUndiciDispatcher(options?: { pfx?: Buffer | string; passphrase?: string; rejectUnauthorized?: boolean }) {
  if (typeof window !== 'undefined') {
    return null
  }
  try {
    const { Agent } = require('undici')
    const baseReject = typeof options?.rejectUnauthorized === 'boolean' ? options.rejectUnauthorized : ESOCIAL_SSL_CONFIG.rejectUnauthorized

    const tls: any = {
      // Garantir verificação conforme ambiente
      rejectUnauthorized: baseReject,
      // Forçar TLS 1.2 conforme exigência do eSocial
      minVersion: 'TLSv1.2',
      // Ciphers compatíveis com endpoints eSocial
      ciphers: ESOCIAL_SSL_CONFIG.ciphers,
      // Evitar negociações HTTP/2 em alguns ambientes
      ALPNProtocols: ['http/1.1'],
    }
    if (options?.pfx) tls.pfx = options.pfx
    if (options?.passphrase) tls.passphrase = options.passphrase

    // Configurações de conexão; valores conservadores para estabilidade
    const dispatcher = new Agent({
      connect: {
        // Opções TLS para mTLS
        tls,
      },
      // Mantém conexões ativas para SOAP
      keepAliveTimeout: 1000,
      headersTimeout: ESOCIAL_SSL_CONFIG.timeout,
      // Desabilitar redirecionamentos para endpoints SOAP
      maxRedirections: 0,
    })
    return dispatcher
  } catch (_) {
    // Undici não disponível ou ambiente não suporta
    return null
  }
}

/**
 * Configurações de fetch personalizadas para requisições ao eSocial
 */
export function createEsocialFetchOptions(
  method: 'GET' | 'POST' = 'POST',
  body?: string,
  additionalHeaders?: Record<string, string>,
  agentOptions?: { pfx?: Buffer | string; passphrase?: string; rejectUnauthorized?: boolean }
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

  // Preferir dispatcher Undici (fetch do Node/Next usa Undici)
  const dispatcher = createEsocialUndiciDispatcher(agentOptions)
  if (dispatcher) {
    // @ts-ignore - Propriedade específica do Undici
    options.dispatcher = dispatcher
  } else {
    // Fallback: agente HTTPS do Node
    const agent = createEsocialHttpsAgent(agentOptions)
    if (agent) {
      // @ts-ignore - Propriedade específica do Node.js
      options.agent = agent
    }
  }

  return options
}
