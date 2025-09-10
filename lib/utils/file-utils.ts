/**
 * Utilitários para manipulação de arquivos
 */

/**
 * Converte um arquivo para base64
 * @param file Arquivo a ser convertido
 * @returns Promise com string base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove o prefixo data:type/subtype;base64,
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

/**
 * Converte base64 para Blob
 * @param base64 String base64
 * @param mimeType Tipo MIME do arquivo
 * @returns Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Faz download de um arquivo
 * @param blob Blob do arquivo
 * @param filename Nome do arquivo
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Valida o tipo de arquivo
 * @param file Arquivo a ser validado
 * @param allowedTypes Tipos permitidos
 * @returns true se o tipo é válido
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

/**
 * Valida o tamanho do arquivo
 * @param file Arquivo a ser validado
 * @param maxSizeInMB Tamanho máximo em MB
 * @returns true se o tamanho é válido
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

/**
 * Formata o tamanho do arquivo para exibição
 * @param bytes Tamanho em bytes
 * @returns String formatada
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Lê o conteúdo de um arquivo como texto
 * @param file Arquivo a ser lido
 * @returns Promise com o conteúdo do arquivo
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

/**
 * Lê o conteúdo de um arquivo como ArrayBuffer
 * @param file Arquivo a ser lido
 * @returns Promise com o ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = error => reject(error)
  })
}
