import forge from "node-forge"
import axios from "axios"
import { SignedXml } from "xml-crypto"
import { DOMParser } from "xmldom"
import { createClient } from "@supabase/supabase-js"

// Supabase service client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // fallback to anon key
)

interface SignXMLParams {
  empresaId: string
  certPassword: string
  rawXml: string
}

interface SignXMLResult {
  success: boolean
  signedXml?: string
  error?: string
}

/**
 * Assina um XML usando o certificado A1 armazenado no Supabase Storage
 * @param empresaId ID da empresa
 * @param certPassword Senha do certificado
 * @param rawXml XML bruto para assinar
 * @returns XML assinado ou erro
 */
export async function signXMLWithSupabaseCertificate({
  empresaId,
  certPassword,
  rawXml,
}: SignXMLParams): Promise<SignXMLResult> {
  try {
    // 1. Buscar certificado do Supabase Storage
    const filePath = `empresa-${empresaId}/certificado-a1.pfx`
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("certificados-esocial")
      .createSignedUrl(filePath, 60)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return {
        success: false,
        error: "Certificado não encontrado no Supabase Storage. Verifique se o certificado foi enviado corretamente.",
      }
    }

    // 2. Baixar o certificado
    let certBuffer: ArrayBuffer
    try {
      const response = await axios.get(signedUrlData.signedUrl, {
        responseType: "arraybuffer",
        timeout: 30000, // 30 segundos timeout
      })
      certBuffer = response.data
    } catch (downloadError) {
      return {
        success: false,
        error: "Erro ao baixar o certificado do storage. Tente novamente.",
      }
    }

    // 3. Ler e extrair chave do .pfx
    let p12: forge.pkcs12.Pkcs12Pfx
    let privateKey: string
    let certificate: string

    try {
      const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(certBuffer))
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certPassword)

      // Extrair chave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.length === 0) {
        return {
          success: false,
          error: "Chave privada não encontrada no certificado.",
        }
      }

      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
      if (!keyBag || !keyBag.key) {
        return {
          success: false,
          error: "Chave privada não encontrada no certificado.",
        }
      }
      privateKey = forge.pki.privateKeyToPem(keyBag.key)

      // Extrair certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
      if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag]?.length === 0) {
        return {
          success: false,
          error: "Certificado não encontrado no arquivo .pfx.",
        }
      }

      const certBag = certBags[forge.pki.oids.certBag]?.[0]
      if (!certBag || !certBag.cert) {
        return {
          success: false,
          error: "Certificado não encontrado no arquivo .pfx.",
        }
      }
      certificate = forge.pki.certificateToPem(certBag.cert)

      // Verificar validade do certificado
      const cert = certBag.cert
      const now = new Date()
      if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
        return {
          success: false,
          error: `Certificado expirado. Válido de ${cert.validity.notBefore.toLocaleDateString()} até ${cert.validity.notAfter.toLocaleDateString()}.`,
        }
      }
    } catch (certError) {
      return {
        success: false,
        error: "Erro ao processar o certificado. Verifique se a senha está correta.",
      }
    }

    // 4. Validar XML de entrada
    let xmlDoc: Document
    try {
      xmlDoc = new DOMParser().parseFromString(rawXml, "text/xml")
      const parseError = xmlDoc.getElementsByTagName("parsererror")
      if (parseError.length > 0) {
        return {
          success: false,
          error: "XML inválido fornecido para assinatura.",
        }
      }
    } catch (xmlError) {
      return {
        success: false,
        error: "Erro ao processar o XML fornecido.",
      }
    }

    // 5. Assinar XML usando XMLDSig
    try {
      const sig = new SignedXml()

      // Configurar referência para o elemento eSocial
      sig.addReference({ xpath: "//*[local-name(.)='eSocial']" })

      // Configurar chave de assinatura
      sig.privateKey = privateKey

      // Computar assinatura
      sig.computeSignature(rawXml)

      const signedXml = sig.getSignedXml()

      return {
        success: true,
        signedXml,
      }
    } catch (signError) {
      return {
        success: false,
        error: "Erro ao assinar o XML. Verifique se o XML está no formato correto para eSocial.",
      }
    }
  } catch (error) {
    console.error("Erro geral na assinatura XML:", error)
    return {
      success: false,
      error: "Erro interno ao processar a assinatura. Tente novamente.",
    }
  }
}

/**
 * Valida se um XML está assinado corretamente
 * @param signedXml XML assinado para validar
 * @returns true se a assinatura é válida
 */
export function validateXMLSignature(signedXml: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(signedXml, "text/xml")
    const signature = doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature")[0]

    if (!signature) {
      return false
    }

    const sig = new SignedXml()
    sig.loadSignature(signature)

    return sig.checkSignature(signedXml)
  } catch (error) {
    console.error("Erro ao validar assinatura XML:", error)
    return false
  }
}

/**
 * Extrai informações do certificado armazenado no Supabase
 * @param empresaId ID da empresa
 * @param certPassword Senha do certificado
 * @returns Informações do certificado
 */
export async function getCertificateInfo(empresaId: string, certPassword: string) {
  try {
    const filePath = `empresa-${empresaId}/certificado-a1.pfx`
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("certificados-esocial")
      .createSignedUrl(filePath, 60)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error("Certificado não encontrado")
    }

    const certBuffer = await axios.get(signedUrlData.signedUrl, { responseType: "arraybuffer" }).then((res) => res.data)

    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(certBuffer))
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certPassword)

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = certBags[forge.pki.oids.certBag]?.[0]
    if (!certBag || !certBag.cert) {
      throw new Error("Certificado não encontrado no arquivo .pfx")
    }
    const cert = certBag.cert

    return {
      subject: cert.subject.getField("CN")?.value || "N/A",
      issuer: cert.issuer.getField("CN")?.value || "N/A",
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber,
      isValid: new Date() >= cert.validity.notBefore && new Date() <= cert.validity.notAfter,
    }
  } catch (error) {
    throw new Error("Erro ao obter informações do certificado")
  }
}
