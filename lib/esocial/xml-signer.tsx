import { createClient } from "@supabase/supabase-js"
<<<<<<< HEAD

// Supabase service client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // fallback to anon key
)
=======
import * as forge from "node-forge"
>>>>>>> 3029c084f5ef10e4cff57f1b69e5a24dac08c3fc

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

export async function signXMLWithSupabaseCertificate({
  empresaId,
  certPassword,
  rawXml,
}: SignXMLParams): Promise<SignXMLResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: "Configuração do Supabase não encontrada",
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar certificado A1 da empresa
    const { data: certificateData, error: fetchError } = await supabase.storage
      .from("certificados-esocial")
      .download(`empresa-${empresaId}/certificado-a1.pfx`)

    if (fetchError || !certificateData) {
      return {
        success: false,
        error: "Certificado A1 não encontrado para esta empresa",
      }
    }

    // Converter blob para buffer
    const certificateBuffer = await certificateData.arrayBuffer()
    const certificateBytes = new Uint8Array(certificateBuffer)

    // Carregar certificado PKCS#12
    let p12Asn1: forge.asn1.Asn1
    try {
      p12Asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(certificateBytes))
    } catch (error) {
      return {
        success: false,
        error: "Formato de certificado inválido",
      }
    }

    let p12: forge.pkcs12.Pkcs12Pfx
    try {
<<<<<<< HEAD
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
=======
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword)
    } catch (error) {
>>>>>>> 3029c084f5ef10e4cff57f1b69e5a24dac08c3fc
      return {
        success: false,
        error: "Senha do certificado incorreta",
      }
    }

<<<<<<< HEAD
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
=======
    // Extrair chave privada e certificado
    const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = certBags[forge.pki.oids.certBag]?.[0]

    if (!keyBag?.key || !certBag?.cert) {
      return {
        success: false,
        error: "Não foi possível extrair chave privada ou certificado",
      }
    }

    const privateKey = keyBag.key as forge.pki.PrivateKey
    const certificate = certBag.cert as forge.pki.Certificate

    // Verificar validade do certificado
    const now = new Date()
    if (now < certificate.validity.notBefore || now > certificate.validity.notAfter) {
      return {
        success: false,
        error: "Certificado expirado ou ainda não válido",
      }
    }

    // Assinar XML usando XMLDSig
    const signedXml = await signXMLWithCertificate(rawXml, privateKey, certificate)
>>>>>>> 3029c084f5ef10e4cff57f1b69e5a24dac08c3fc

    return {
      success: true,
      signedXml,
    }
  } catch (error) {
    console.error("Erro ao assinar XML:", error)
    return {
      success: false,
      error: "Erro interno ao assinar XML",
    }
  }
}

async function signXMLWithCertificate(
  xmlContent: string,
  privateKey: forge.pki.PrivateKey,
  certificate: forge.pki.Certificate,
): Promise<string> {
  // Implementação básica de assinatura XML
  // Em produção, usar biblioteca especializada como xml-crypto

  const canonicalXml = xmlContent.trim()

  // Calcular hash SHA-256 do XML
  const md = forge.md.sha256.create()
  md.update(canonicalXml, "utf8")
  const hash = md.digest()

  // Assinar hash com chave privada
  const signature = privateKey.sign(hash)
  const signatureBase64 = forge.util.encode64(signature)

  // Converter certificado para Base64
  const certPem = forge.pki.certificateToPem(certificate)
  const certBase64 = certPem
    .replace("-----BEGIN CERTIFICATE-----", "")
    .replace("-----END CERTIFICATE-----", "")
    .replace(/\n/g, "")

  // Inserir assinatura no XML (implementação simplificada)
  const signatureXml = `
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <Reference URI="">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <DigestValue>${forge.util.encode64(hash.getBytes())}</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>${signatureBase64}</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>${certBase64}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>`

  // Inserir assinatura antes da tag de fechamento do elemento raiz
  const lastTagIndex = xmlContent.lastIndexOf("</")
  if (lastTagIndex === -1) {
    throw new Error("XML inválido: tag de fechamento não encontrada")
  }

  const signedXml = xmlContent.slice(0, lastTagIndex) + signatureXml + xmlContent.slice(lastTagIndex)

  return signedXml
}
