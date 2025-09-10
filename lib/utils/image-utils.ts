/**
 * Utilitários para manipulação de imagens
 */

/**
 * Redimensiona uma imagem
 * @param file Arquivo de imagem
 * @param maxWidth Largura máxima
 * @param maxHeight Altura máxima
 * @param quality Qualidade da imagem (0-1)
 * @returns Promise com o arquivo redimensionado
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Desenhar imagem redimensionada
      ctx?.drawImage(img, 0, 0, width, height)

      // Converter para blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Erro ao redimensionar imagem'))
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => reject(new Error('Erro ao carregar imagem'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Converte imagem para base64
 * @param file Arquivo de imagem
 * @param maxWidth Largura máxima (opcional)
 * @param maxHeight Altura máxima (opcional)
 * @returns Promise com string base64
 */
export function imageToBase64(
  file: File,
  maxWidth?: number,
  maxHeight?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      let { width, height } = img

      // Redimensionar se necessário
      if (maxWidth && maxHeight) {
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)

      const base64 = canvas.toDataURL(file.type)
      resolve(base64.split(',')[1]) // Remove prefixo data:image/...
    }

    img.onerror = () => reject(new Error('Erro ao processar imagem'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Valida se o arquivo é uma imagem válida
 * @param file Arquivo a ser validado
 * @returns true se é uma imagem válida
 */
export function isValidImage(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  return validTypes.includes(file.type)
}

/**
 * Obtém dimensões de uma imagem
 * @param file Arquivo de imagem
 * @returns Promise com as dimensões
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Erro ao carregar imagem'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Cria thumbnail de uma imagem
 * @param file Arquivo de imagem
 * @param size Tamanho do thumbnail (quadrado)
 * @returns Promise com o blob do thumbnail
 */
export function createThumbnail(file: File, size: number = 150): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = size
      canvas.height = size

      // Calcular crop para manter proporção quadrada
      const { width, height } = img
      const minDimension = Math.min(width, height)
      const x = (width - minDimension) / 2
      const y = (height - minDimension) / 2

      ctx?.drawImage(
        img,
        x, y, minDimension, minDimension, // source
        0, 0, size, size // destination
      )

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Erro ao criar thumbnail'))
          }
        },
        'image/jpeg',
        0.8
      )
    }

    img.onerror = () => reject(new Error('Erro ao carregar imagem'))
    img.src = URL.createObjectURL(file)
  })
}
