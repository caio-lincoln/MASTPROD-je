/**
 * Utilitários para criptografia e hashing
 */

/**
 * Gera hash SHA-256 de uma string
 * @param data String para gerar hash
 * @returns Promise com hash em hexadecimal
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Gera hash SHA-1 de uma string
 * @param data String para gerar hash
 * @returns Promise com hash em hexadecimal
 */
export async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Gera hash MD5 de uma string (usando Web Crypto API não é possível, então simulamos)
 * @param data String para gerar hash
 * @returns Hash MD5 simulado (não usar em produção para segurança)
 */
export function md5Simple(data: string): string {
  // Esta é uma implementação simplificada para compatibilidade
  // Em produção, use uma biblioteca dedicada como crypto-js
  let hash = 0
  if (data.length === 0) return hash.toString()
  
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16)
}

/**
 * Gera uma string aleatória
 * @param length Comprimento da string
 * @param charset Conjunto de caracteres (padrão: alfanumérico)
 * @returns String aleatória
 */
export function generateRandomString(
  length: number, 
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = ''
  const charactersLength = charset.length
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charactersLength))
  }
  
  return result
}

/**
 * Gera um UUID v4
 * @returns UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback para ambientes que não suportam crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Codifica string em Base64
 * @param data String para codificar
 * @returns String em Base64
 */
export function encodeBase64(data: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(data)
  }
  
  // Fallback para Node.js
  return Buffer.from(data, 'utf-8').toString('base64')
}

/**
 * Decodifica string Base64
 * @param base64 String Base64 para decodificar
 * @returns String decodificada
 */
export function decodeBase64(base64: string): string {
  if (typeof atob !== 'undefined') {
    return atob(base64)
  }
  
  // Fallback para Node.js
  return Buffer.from(base64, 'base64').toString('utf-8')
}

/**
 * Gera chave de criptografia simétrica
 * @param length Comprimento da chave em bytes (padrão: 32 para AES-256)
 * @returns Promise com a chave gerada
 */
export async function generateSymmetricKey(length: number = 32): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: length * 8 // Convert bytes to bits
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Criptografa dados usando AES-GCM
 * @param data Dados para criptografar
 * @param key Chave de criptografia
 * @returns Promise com dados criptografados e IV
 */
export async function encryptAES(
  data: string, 
  key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  )
  
  return { encrypted, iv }
}

/**
 * Descriptografa dados usando AES-GCM
 * @param encryptedData Dados criptografados
 * @param key Chave de descriptografia
 * @param iv Vetor de inicialização
 * @returns Promise com dados descriptografados
 */
export async function decryptAES(
  encryptedData: ArrayBuffer, 
  key: CryptoKey, 
  iv: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.slice()
    },
    key,
    encryptedData
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Valida se uma string é um hash válido
 * @param hash String para validar
 * @param type Tipo de hash ('sha256', 'sha1', 'md5')
 * @returns true se é um hash válido do tipo especificado
 */
export function isValidHash(hash: string, type: 'sha256' | 'sha1' | 'md5'): boolean {
  const patterns = {
    sha256: /^[a-f0-9]{64}$/i,
    sha1: /^[a-f0-9]{40}$/i,
    md5: /^[a-f0-9]{32}$/i
  }
  
  return patterns[type].test(hash)
}

/**
 * Gera salt aleatório para hashing de senhas
 * @param length Comprimento do salt em bytes
 * @returns Salt em hexadecimal
 */
export function generateSalt(length: number = 16): string {
  const saltArray = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Compara dois hashes de forma segura (timing-safe)
 * @param hash1 Primeiro hash
 * @param hash2 Segundo hash
 * @returns true se os hashes são iguais
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i)
  }
  
  return result === 0
}