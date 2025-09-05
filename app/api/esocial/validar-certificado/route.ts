import { type NextRequest, NextResponse } from "next/server"
import forge from "node-forge"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("arquivo") as File
    const senha = formData.get("senha") as string
    const cnpjEmpresa = formData.get("cnpjEmpresa") as string

    if (!file || !senha) {
      return NextResponse.json(
        {
          status: "error",
          message: "Arquivo e senha são obrigatórios",
        },
        { status: 400 },
      )
    }

    // Valida tipo de arquivo
    if (!file.name.toLowerCase().endsWith(".pfx") && !file.name.toLowerCase().endsWith(".p12")) {
      return NextResponse.json(
        {
          status: "error",
          message: "Apenas arquivos .pfx ou .p12 são aceitos",
        },
        { status: 400 },
      )
    }

    // Valida tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          status: "error",
          message: "Arquivo muito grande. Máximo 10MB permitido",
        },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const resultado = await validarCertificadoA1(buffer, senha, cnpjEmpresa)

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error("Erro na validação do certificado:", error)

    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Erro interno do servidor",
        checks: [
          {
            name: "erro_validacao",
            ok: false,
            message: "Falha na validação do certificado",
          },
        ],
      },
      { status: 500 },
    )
  }
}

async function validarCertificadoA1(buffer: Buffer, password: string, cnpjEmpresa?: string) {
  const result = {
    status: "invalid" as "valid" | "invalid" | "warning" | "error",
    checks: [] as Array<{
      name: string
      ok: boolean
      message: string
      [key: string]: any
    }>,
    meta: {} as Record<string, any>,
    summary: "",
  }

  try {
    // 1. Verifica integridade do arquivo e senha
    let p12Asn1: any
    let p12: any
    let privateKey: any
    let certificate: any

    try {
      const p12Der = forge.util.encode64(buffer.toString("binary"))
      p12Asn1 = forge.asn1.fromDer(forge.util.decode64(p12Der))
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

      // Extrai chave privada e certificado
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
      const certBag = certBags[forge.pki.oids.certBag]?.[0]

      if (keyBag) privateKey = keyBag.key
      if (certBag) certificate = certBag.cert

      result.checks.push({
        name: "senha_pkcs12",
        ok: true,
        message: "Arquivo aberto com sucesso",
      })
    } catch (e) {
      result.checks.push({
        name: "senha_pkcs12",
        ok: false,
        message: "Senha incorreta ou arquivo inválido",
      })
      result.summary = "Não foi possível abrir o arquivo. Verifique a senha do .pfx."
      return result
    }

    // 2. Verifica presença de chave privada e certificado
    if (!privateKey || !certificate) {
      result.checks.push({
        name: "par_chave_certificado",
        ok: false,
        message: "Chave privada ou certificado ausente",
      })
      return result
    }

    result.checks.push({
      name: "par_chave_certificado",
      ok: true,
      message: "Chave privada e certificado presentes",
    })

    // 3. Verifica validade temporal
    const now = new Date()
    const notBefore = certificate.validity.notBefore
    const notAfter = certificate.validity.notAfter

    const isValidPeriod = notBefore <= now && now <= notAfter
    result.checks.push({
      name: "validade_temporal",
      ok: isValidPeriod,
      message: `Válido de ${notBefore.toLocaleDateString("pt-BR")} até ${notAfter.toLocaleDateString("pt-BR")}`,
      not_before: notBefore.toISOString(),
      not_after: notAfter.toISOString(),
    })

    // Aviso se expira em menos de 30 dias
    const daysToExpire = Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToExpire <= 30 && daysToExpire > 0) {
      result.checks.push({
        name: "aviso_expiracao",
        ok: false,
        message: `Certificado expira em ${daysToExpire} dia(s)`,
        days_remaining: daysToExpire,
      })
    }

    // 4. Verifica força da chave (RSA >= 2048 bits)
    const keySize = privateKey.n ? privateKey.n.bitLength() : 0
    const isStrongKey = keySize >= 2048
    result.checks.push({
      name: "forca_chave",
      ok: isStrongKey,
      message: `Chave ${keySize} bits (${isStrongKey ? "adequada" : "fraca - mínimo 2048 bits"})`,
      key_size: keySize,
    })

    // 5. Verifica algoritmo de assinatura
    const sigAlgorithm = certificate.siginfo?.algorithmOid || "desconhecido"

    // Mapeia OIDs conhecidos para nomes legíveis
    const algorithmMap: Record<string, { name: string; secure: boolean }> = {
      "1.2.840.113549.1.1.5": { name: "SHA-1 with RSA", secure: false },
      "1.2.840.113549.1.1.11": { name: "SHA-256 with RSA", secure: true },
      "1.2.840.113549.1.1.12": { name: "SHA-384 with RSA", secure: true },
      "1.2.840.113549.1.1.13": { name: "SHA-512 with RSA", secure: true },
      "1.2.840.10045.4.3.2": { name: "SHA-256 with ECDSA", secure: true },
      "1.2.840.10045.4.3.3": { name: "SHA-384 with ECDSA", secure: true },
      "1.2.840.10045.4.3.4": { name: "SHA-512 with ECDSA", secure: true },
    }

    const algorithmInfo = algorithmMap[sigAlgorithm] || { name: `Desconhecido (${sigAlgorithm})`, secure: false }

    // SHA-1 é tratado como aviso, não como erro crítico
    const isSecureAlgorithm = algorithmInfo.secure
    const isSha1 = sigAlgorithm === "1.2.840.113549.1.1.5"

    if (isSha1) {
      result.checks.push({
        name: "algoritmo_assinatura",
        ok: false, // Marca como aviso
        message: `${algorithmInfo.name} (algoritmo legado - recomenda-se SHA-256 ou superior)`,
        algorithm: sigAlgorithm,
        algorithm_name: algorithmInfo.name,
        is_legacy: true,
      })
    } else {
      result.checks.push({
        name: "algoritmo_assinatura",
        ok: isSecureAlgorithm,
        message: `${algorithmInfo.name} (${isSecureAlgorithm ? "seguro" : "inseguro"})`,
        algorithm: sigAlgorithm,
        algorithm_name: algorithmInfo.name,
      })
    }

    // 6. Extrai CNPJ/CPF do certificado (simplificado)
    let cnpjCert = null
    let cpfCert = null

    // Busca nos atributos do subject
    const subject = certificate.subject.attributes
    for (const attr of subject) {
      if (attr.shortName === "serialNumber" || attr.name === "serialNumber") {
        const value = attr.value
        if (value.length === 14) cnpjCert = value // CNPJ tem 14 dígitos
        if (value.length === 11) cpfCert = value // CPF tem 11 dígitos
      }
    }

    result.meta.cnpj = cnpjCert
    result.meta.cpf = cpfCert

    // 7. Verifica titularidade (se CNPJ da empresa foi fornecido)
    if (cnpjEmpresa && cnpjCert) {
      const cnpjEmpresaClean = cnpjEmpresa.replace(/\D/g, "")
      const cnpjCertClean = cnpjCert.replace(/\D/g, "")
      const isOwner = cnpjEmpresaClean === cnpjCertClean

      result.checks.push({
        name: "titularidade",
        ok: isOwner,
        message: `CNPJ do certificado ${isOwner ? "confere" : "não confere"} com a empresa`,
        cnpj_certificado: cnpjCert,
        cnpj_empresa: cnpjEmpresa,
      })
    }

    // 8. Verifica se não é auto-assinado
    const issuer = certificate.issuer.getField("CN")?.value || ""
    const subject_cn = certificate.subject.getField("CN")?.value || ""
    const isSelfSigned = issuer === subject_cn

    result.checks.push({
      name: "cadeia_certificacao",
      ok: !isSelfSigned,
      message: `Certificado ${isSelfSigned ? "auto-assinado (inválido)" : "emitido por AC"}`,
      issuer: issuer,
      subject: subject_cn,
    })

    // Determina status final
    const criticalChecks = result.checks.filter(
      (check) => !check.ok && check.name !== "aviso_expiracao" && check.name !== "algoritmo_assinatura",
    )
    const algorithmCheck = result.checks.find((check) => check.name === "algoritmo_assinatura")
    const warningChecks = result.checks.filter(
      (check) =>
        !check.ok && (check.name === "aviso_expiracao" || (check.name === "algoritmo_assinatura" && check.is_legacy)),
    )

    if (criticalChecks.length === 0) {
      if (warningChecks.length === 0) {
        result.status = "valid"
        result.summary = "Certificado válido e seguro! Pronto para uso no eSocial."
      } else {
        result.status = "warning"
        const warnings = warningChecks.map((w) => w.message).join(", ")
        result.summary = `Certificado válido com avisos: ${warnings}`
      }
    } else {
      result.status = "invalid"
      result.summary = `Certificado inválido: ${criticalChecks[0]?.message || "Múltiplos erros encontrados"}`
    }

    return result
  } catch (error: any) {
    result.checks.push({
      name: "erro_geral",
      ok: false,
      message: `Erro durante validação: ${error.message}`,
    })
    result.summary = `Erro durante validação: ${error.message}`
    return result
  }
}
