import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export type FileType =
  | "aso"
  | "certificados"
  | "evidencias"
  | "epis"
  | "logos"
  | "usuarios"
  | "pgr"
  | "biblioteca"
  | "relatorios"
  | "esocial"
  | "backups"

export interface UploadResult {
  path: string
  publicUrl: string
  error?: string
}

const BUCKET_MAPPING: Record<FileType, string> = {
  aso: "asos",
  certificados: "certificados",
  evidencias: "documentos",
  epis: "documentos",
  logos: "documentos",
  usuarios: "documentos",
  pgr: "pgr",
  biblioteca: "biblioteca",
  relatorios: "relatorios",
  esocial: "esocial",
  backups: "backups",
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 */
export async function uploadArquivo(
  file: File,
  type: FileType,
  fileName?: string,
  empresaId?: string,
): Promise<UploadResult | null> {
  try {
    // Gerar nome único se não fornecido
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const finalFileName = fileName || `${timestamp}.${extension}`

    const bucket = BUCKET_MAPPING[type]
    const path = empresaId ? `${empresaId}/${finalFileName}` : `${type}/${finalFileName}`

    // Fazer upload
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      return { path: "", publicUrl: "", error: error.message }
    }

    const isPublicBucket = bucket === "documentos"
    if (isPublicBucket) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      return {
        path: data.path,
        publicUrl: urlData.publicUrl,
      }
    } else {
      // Para buckets privados, gerar URL assinada
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(data.path, 3600)

      if (signedError) {
        return { path: data.path, publicUrl: "", error: signedError.message }
      }

      return {
        path: data.path,
        publicUrl: signedData.signedUrl,
      }
    }
  } catch (error) {
    return null
  }
}

/**
 * Gera URL assinada para arquivos privados
 */
export async function getSignedUrl(path: string, type: FileType, expiresIn = 3600) {
  try {
    const bucket = BUCKET_MAPPING[type]
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

    if (error) {
      return null
    }

    return data.signedUrl
  } catch (error) {
    return null
  }
}

/**
 * Remove um arquivo do storage
 */
export async function removeArquivo(path: string, type: FileType) {
  try {
    const bucket = BUCKET_MAPPING[type]
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Lista arquivos de uma pasta
 */
export async function listarArquivos(type: FileType, empresaId?: string) {
  try {
    const bucket = BUCKET_MAPPING[type]
    const folder = empresaId || type
    const { data, error } = await supabase.storage.from(bucket).list(folder)

    if (error) {
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

/**
 * Valida tipo de arquivo
 */
export function validarTipoArquivo(file: File, type: FileType): boolean {
  const allowedTypes: Record<FileType, string[]> = {
    aso: ["application/pdf", "image/jpeg", "image/png"],
    certificados: ["application/pdf", "image/jpeg", "image/png"],
    evidencias: ["image/jpeg", "image/png", "video/mp4", "application/pdf"],
    epis: ["image/jpeg", "image/png", "application/pdf"],
    logos: ["image/jpeg", "image/png", "image/svg+xml"],
    usuarios: ["image/jpeg", "image/png"],
    pgr: ["application/pdf"],
    biblioteca: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    relatorios: [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    esocial: ["application/xml", "text/xml"],
    backups: ["application/zip", "application/json", "text/csv"],
  }

  return allowedTypes[type].includes(file.type)
}

/**
 * Valida tamanho do arquivo (em MB)
 */
export function validarTamanhoArquivo(file: File, type: FileType): boolean {
  const maxSizes: Record<FileType, number> = {
    aso: 10,
    certificados: 10,
    evidencias: 25,
    epis: 10,
    logos: 5,
    usuarios: 5,
    pgr: 50,
    biblioteca: 100,
    relatorios: 50,
    esocial: 5,
    backups: 1024, // 1GB
  }

  const maxSizeBytes = maxSizes[type] * 1024 * 1024
  return file.size <= maxSizeBytes
}

export async function uploadPGR(file: File, empresaId: string, fileName?: string) {
  return uploadArquivo(file, "pgr", fileName, empresaId)
}

export async function uploadCertificado(file: File, empresaId: string, fileName?: string) {
  return uploadArquivo(file, "certificados", fileName, empresaId)
}

export async function uploadDocumentoBiblioteca(file: File, empresaId: string, fileName?: string) {
  return uploadArquivo(file, "biblioteca", fileName, empresaId)
}

export async function uploadRelatorio(file: File, empresaId: string, fileName?: string) {
  return uploadArquivo(file, "relatorios", fileName, empresaId)
}

export async function uploadESocial(file: File, empresaId: string, fileName?: string) {
  return uploadArquivo(file, "esocial", fileName, empresaId)
}

export async function uploadBackup(file: File, fileName?: string) {
  return uploadArquivo(file, "backups", fileName)
}

export { uploadArquivo as uploadFile }
