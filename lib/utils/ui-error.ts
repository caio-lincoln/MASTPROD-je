// Utilitário para formatar mensagens de erro amigáveis para UI
// Uso: getFriendlyErrorMessage(error)

const COMMON_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /network|fetch|timeout/i, message: "Falha de conexão. Verifique sua internet e tente novamente." },
  { pattern: /certificat|assinatura|pfx|senha/i, message: "Problema com certificado digital. Verifique configuração e senha." },
  { pattern: /xml|parser|schema|layout/i, message: "Erro ao gerar/validar XML. Revise os dados do evento." },
  { pattern: /soap|servi[cç]o|endpoint/i, message: "Falha ao comunicar com o serviço eSocial. Tente novamente em instantes." },
  { pattern: /permission|rls|unauthorized|forbidden/i, message: "Permissão insuficiente. Faça login novamente ou contate o administrador." },
]

export function getFriendlyErrorMessage(err: unknown, fallback = "Ocorreu um erro. Tente novamente mais tarde."): string {
  try {
    const msg = extractErrorMessage(err)
    if (!msg) return fallback

    for (const { pattern, message } of COMMON_PATTERNS) {
      if (pattern.test(msg)) return message
    }

    // Mensagem original se curta e legível
    if (msg.length <= 140) return msg
    return fallback
  } catch {
    return fallback
  }
}

function extractErrorMessage(err: unknown): string | undefined {
  if (!err) return undefined
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err) {
    const record = err as Record<string, unknown>
    const message = record.message
    if (typeof message === "string") return message

    const errorMsg = record.error
    if (typeof errorMsg === "string") return errorMsg

    const toStringFn = (record as { toString?: () => string }).toString
    if (typeof toStringFn === "function") {
      const str = toStringFn.call(record)
      if (typeof str === "string" && str !== "[object Object]") return str
    }
  }
  return undefined
}
