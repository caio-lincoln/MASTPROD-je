/**
 * Utilitários para formatação segura de datas
 * Previne erros "Invalid time value" e "RangeError"
 */

/**
 * Verifica se uma data é válida
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  if (!date) return false

  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj instanceof Date && !isNaN(dateObj.getTime())
}

/**
 * Formata uma data de forma segura para o formato brasileiro
 */
export function formatDateSafe(dateInput: Date | string | null | undefined, fallback = "Data inválida"): string {
  if (!isValidDate(dateInput)) {
    return fallback
  }

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput!
    return date.toLocaleDateString("pt-BR")
  } catch (error) {
    return fallback
  }
}

/**
 * Formata uma data de forma segura para formato ISO
 */
export function formatDateISO(dateInput: Date | string | null | undefined, fallback = ""): string {
  if (!isValidDate(dateInput)) {
    return fallback
  }

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput!
    return date.toISOString()
  } catch (error) {
    return fallback
  }
}

/**
 * Formata uma data de forma segura com formato customizado
 */
export function formatDateCustom(
  dateInput: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
  locale = "pt-BR",
  fallback = "Data inválida",
): string {
  if (!isValidDate(dateInput)) {
    return fallback
  }

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput!
    return date.toLocaleDateString(locale, options)
  } catch (error) {
    return fallback
  }
}

/**
 * Calcula diferença de tempo de forma segura
 */
export function getTimeDifference(
  dateInput: Date | string | null | undefined,
  fallback = "Tempo indeterminado",
): string {
  if (!isValidDate(dateInput)) {
    return fallback
  }

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput!
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Agora há pouco"
    if (diffInHours < 24) return `${diffInHours}h atrás`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d atrás`

    return formatDateSafe(date)
  } catch (error) {
    return fallback
  }
}

/**
 * Verifica se uma data está vencida
 */
export function isDateExpired(dateInput: Date | string | null | undefined, bufferDays = 0): boolean {
  if (!isValidDate(dateInput)) {
    return false
  }

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput!
    const now = new Date()
    const buffer = new Date()
    buffer.setDate(now.getDate() + bufferDays)

    return date < buffer
  } catch (error) {
    return false
  }
}
