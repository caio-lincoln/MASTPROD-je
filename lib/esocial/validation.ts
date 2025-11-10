/*
 * Validação de eventos eSocial (S-1000)
 * - Regra de retificação: quando indRetif = 2, exigir nrRecibo
 * - Validação de assinatura: algoritmos (exclusive c14n, enveloped, sha256)
 * - Gancho para validação XSD (v_S_01_03_00.xsd) se disponível
 */

export type ValidationIssue = {
  rule: string
  level: "error" | "warning"
  message: string
}

export type ValidateInput = {
  tipoEvento: string // e.g. "S-1000"
  xml: string
}

type ValidatorRule = (input: ValidateInput) => ValidationIssue[]

export class ESocialValidator {
  private rules: Map<string, { fn: ValidatorRule; enabled: boolean }> = new Map()

  constructor() {
    this.registerDefaultRules()
  }

  addRule(id: string, fn: ValidatorRule) {
    this.rules.set(id, { fn, enabled: true })
  }

  removeRule(id: string) {
    this.rules.delete(id)
  }

  enableRule(id: string, enabled: boolean) {
    const r = this.rules.get(id)
    if (r) this.rules.set(id, { ...r, enabled })
  }

  validate(input: ValidateInput): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    for (const [id, rule] of this.rules.entries()) {
      if (!rule.enabled) continue
      try {
        const res = rule.fn(input)
        if (res && res.length) issues.push(...res)
      } catch (e: any) {
        issues.push({ rule: id, level: "warning", message: `Falha ao executar regra: ${e?.message || e}` })
      }
    }
    return issues
  }

  // Compatibilidade: alias para validação de evento
  validateEvent(event: { tipoEvento?: string; tipo?: string; evento?: string; xml?: string; content?: string }): ValidationIssue[] {
    const tipo = event.tipoEvento || event.tipo || event.evento || ""
    const xml = event.xml || event.content || ""
    return this.validate({ tipoEvento: tipo, xml })
  }

  // Compatibilidade: validação de lote de eventos
  validateBatch(events: Array<{ tipoEvento?: string; tipo?: string; evento?: string; xml?: string; content?: string }>): {
    issues: ValidationIssue[]
    hasErrors: boolean
  } {
    const all: ValidationIssue[] = []
    for (const ev of events) {
      all.push(...this.validateEvent(ev))
    }
    const hasErrors = all.some((i) => i.level === "error")
    return { issues: all, hasErrors }
  }

  // Utilitário simples
  isValid(input: ValidateInput): boolean {
    return !this.validate(input).some((i) => i.level === "error")
  }

  private registerDefaultRules() {
    // Regra: Retificação exige nrRecibo
    this.addRule("s1000_retificacao", (input) => {
      if (input.tipoEvento !== "S-1000") return []
      const hasRetif2 = /<indRetif>\s*2\s*<\/indRetif>/i.test(input.xml)
      if (!hasRetif2) return []
      const hasNrRecibo = /<nrRecibo>\s*[^<]+\s*<\/nrRecibo>/i.test(input.xml)
      if (!hasNrRecibo) {
        return [
          {
            rule: "s1000_retificacao",
            level: "error",
            message: "Para indRetif=2 (Retificação), o campo nrRecibo é obrigatório no S-1000",
          },
        ]
      }
      return []
    })

    // Regra: Algoritmos de assinatura e canonicalização
    this.addRule("s1000_signature_algorithms", (input) => {
      if (input.tipoEvento !== "S-1000") return []
      const issues: ValidationIssue[] = []
      const hasSignature = /<Signature[\s>]/.test(input.xml)
      if (!hasSignature) {
        issues.push({ rule: "s1000_signature_algorithms", level: "error", message: "Assinatura XML ausente (<Signature/>)" })
        return issues
      }
      const canonOk = /<CanonicalizationMethod[^>]+Algorithm="[^"]*xml-exc-c14n#"/.test(input.xml)
      if (!canonOk) {
        issues.push({ rule: "s1000_signature_algorithms", level: "error", message: "CanonicalizationMethod deve usar Exclusive XML Canonicalization" })
      }
      const hasEnveloped = /<Transform[^>]*>\s*<XPath[^>]*>\s*|<Transforms>.*enveloped-signature.*<\/Transforms>/is.test(input.xml) || /Algorithm="[^"]*enveloped-signature"/.test(input.xml)
      if (!hasEnveloped) {
        issues.push({ rule: "s1000_signature_algorithms", level: "error", message: "Transform deve incluir 'enveloped-signature'" })
      }
      const hasExcC14NTransform = /Algorithm="[^"]*xml-exc-c14n#"/.test(input.xml)
      if (!hasExcC14NTransform) {
        issues.push({ rule: "s1000_signature_algorithms", level: "warning", message: "Transform deve incluir Exclusive C14N além do CanonicalizationMethod" })
      }
      const digestSha256 = /<DigestMethod[^>]+Algorithm="[^"]*sha256"/.test(input.xml)
      if (!digestSha256) {
        issues.push({ rule: "s1000_signature_algorithms", level: "error", message: "DigestMethod deve usar SHA-256" })
      }
      const sigRsaSha256 = /<SignatureMethod[^>]+Algorithm="[^"]*rsa-?sha256"/.test(input.xml)
      if (!sigRsaSha256) {
        issues.push({ rule: "s1000_signature_algorithms", level: "error", message: "SignatureMethod deve usar RSA-SHA256" })
      }
      const hasX509Data = /<X509Data>/.test(input.xml)
      if (!hasX509Data) {
        issues.push({ rule: "s1000_signature_algorithms", level: "warning", message: "KeyInfo deve incluir X509Data (cadeia do certificado)" })
      }
      return issues
    })

    // Gancho: validação XSD (será warning se XSD/biblioteca ausente)
    this.addRule("s1000_xsd", (input) => {
      if (input.tipoEvento !== "S-1000") return []
      const issues: ValidationIssue[] = []
      let validator: any = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        validator = require("xsd-schema-validator")
      } catch (e) {
        return [
          {
            rule: "s1000_xsd",
            level: "warning",
            message:
              "Biblioteca xsd-schema-validator não instalada. Instale-a e adicione o XSD oficial para validação (v_S_01_03_00.xsd).",
          },
        ]
      }

      const path = require("path")
      const fs = require("fs")
      const xsdPath = path.join(process.cwd(), "schemas", "esocial", "s1000", "v_S_01_03_00.xsd")
      if (!fs.existsSync(xsdPath)) {
        issues.push({
          rule: "s1000_xsd",
          level: "warning",
          message: `Arquivo XSD não encontrado em '${xsdPath}'. Coloque o XSD oficial para habilitar a validação.`,
        })
        return issues
      }

      try {
        const res = validator.validateXML(input.xml, xsdPath)
        if (res && res.valid) return []
        const msg = res?.messages?.join("; ") || "XML inválido contra XSD"
        issues.push({ rule: "s1000_xsd", level: "error", message: msg })
        return issues
      } catch (e: any) {
        issues.push({ rule: "s1000_xsd", level: "warning", message: `Erro ao validar XSD: ${e?.message || e}` })
        return issues
      }
    })
  }
}

export const esocialValidator = new ESocialValidator()

