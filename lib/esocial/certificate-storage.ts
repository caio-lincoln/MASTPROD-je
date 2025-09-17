import { createClient } from '@/lib/supabase/server'

export interface CertificateConfig {
  storage: 'supabase' | 'filesystem'
  bucket?: string
  filename?: string
  path?: string
  password: string
}

export class CertificateStorageManager {
  private supabase = createClient()

  /**
   * Recupera o certificado A1 do Supabase Storage
   */
  async getCertificateFromSupabase(bucket: string, filename: string): Promise<Buffer> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(filename)

      if (error) {
        throw new Error(`Erro ao baixar certificado: ${error.message}`)
      }

      if (!data) {
        throw new Error('Certificado não encontrado')
      }

      // Converter Blob para Buffer
      const arrayBuffer = await data.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Erro ao recuperar certificado do Supabase:', error)
      throw error
    }
  }

  /**
   * Faz upload do certificado para o Supabase Storage
   */
  async uploadCertificate(
    bucket: string, 
    filename: string, 
    certificateBuffer: Buffer
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(filename, certificateBuffer, {
          contentType: 'application/x-pkcs12',
          upsert: true // Substitui se já existir
        })

      if (error) {
        throw new Error(`Erro ao fazer upload do certificado: ${error.message}`)
      }

      return data.path
    } catch (error) {
      console.error('Erro ao fazer upload do certificado:', error)
      throw error
    }
  }

  /**
   * Verifica se o certificado existe no storage
   */
  async certificateExists(bucket: string, filename: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list('', {
          search: filename
        })

      if (error) {
        console.error('Erro ao verificar certificado:', error)
        return false
      }

      return data.some(file => file.name === filename)
    } catch (error) {
      console.error('Erro ao verificar existência do certificado:', error)
      return false
    }
  }

  /**
   * Remove o certificado do storage
   */
  async removeCertificate(bucket: string, filename: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([filename])

      if (error) {
        throw new Error(`Erro ao remover certificado: ${error.message}`)
      }
    } catch (error) {
      console.error('Erro ao remover certificado:', error)
      throw error
    }
  }

  /**
   * Obtém a URL pública temporária do certificado (para download)
   */
  async getCertificateUrl(bucket: string, filename: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(filename, expiresIn)

      if (error) {
        throw new Error(`Erro ao gerar URL do certificado: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error('Erro ao gerar URL do certificado:', error)
      throw error
    }
  }
}

/**
 * Função utilitária para obter configurações do certificado
 */
export function getCertificateConfig(): CertificateConfig {
  const storage = process.env.ESOCIAL_CERTIFICATE_STORAGE as 'supabase' | 'filesystem' || 'filesystem'
  
  if (storage === 'supabase') {
    return {
      storage: 'supabase',
      bucket: process.env.ESOCIAL_CERTIFICATE_BUCKET || 'certificados-esocial',
      filename: process.env.ESOCIAL_CERTIFICATE_FILENAME || 'certificado-a1.p12',
      password: process.env.ESOCIAL_CERTIFICATE_PASSWORD || ''
    }
  }

  return {
    storage: 'filesystem',
    path: process.env.ESOCIAL_CERTIFICATE_PATH || '/path/to/certificate.p12',
    password: process.env.ESOCIAL_CERTIFICATE_PASSWORD || ''
  }
}

/**
 * Instância singleton do gerenciador de certificados
 */
export const certificateManager = new CertificateStorageManager()