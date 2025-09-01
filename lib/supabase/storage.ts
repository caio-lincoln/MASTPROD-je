import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export type FileType = "aso" | "certificados" | "evidencias" | "epis" | "logos" | "usuarios"

export interface UploadResult {
  path: string
  publicUrl: string
  error?: string
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 */
export async function uploadArquivo(file: File, type: FileType, fileName?: string): Promise<UploadResult | null> {
  try {
    // Gerar nome único se não fornecido
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const finalFileName = fileName || `${timestamp}.${extension}`

    // Definir caminho baseado no tipo
    const path = `${type}/${finalFileName}`

    // Fazer upload
    const { data, error } = await supabase.storage.from("documentos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Erro no upload:", error)
      return { path: "", publicUrl: "", error: error.message }
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(data.path)

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
    }
  } catch (error) {
    console.error("Erro no upload:", error)
    return null
  }
}

/**
 * Gera URL assinada para arquivos privados
 */
export async function getSignedUrl(path: string, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, expiresIn)

    if (error) {
      console.error("Erro ao gerar URL assinada:", error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error("Erro ao gerar URL assinada:", error)
    return null
  }
}

/**
 * Remove um arquivo do storage
 */
export async function removeArquivo(path: string) {
  try {
    const { error } = await supabase.storage.from("documentos").remove([path])

    if (error) {
      console.error("Erro ao remover arquivo:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Erro ao remover arquivo:", error)
    return false
  }
}

/**
 * Lista arquivos de uma pasta
 */
export async function listarArquivos(folder: FileType) {
  try {
    const { data, error } = await supabase.storage.from("documentos").list(folder)

    if (error) {
      console.error("Erro ao listar arquivos:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Erro ao listar arquivos:", error)
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
  }

  return allowedTypes[type].includes(file.type)
}

/**
 * Valida tamanho do arquivo (em MB)
 */
export function validarTamanhoArquivo(file: File, maxSizeMB = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}
