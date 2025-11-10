import { createClient } from "@supabase/supabase-js"
import * as forge from "node-forge"
import axios from "axios"
import { SignedXml } from "xml-crypto"
import { DOMParser } from "xmldom"
import { getSupabaseUrl, getSupabaseServiceRoleKey, getSupabaseAnonKey } from "@/lib/config/supabase-config"

// Supabase service client (server-side)
const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseServiceRoleKey() || getSupabaseAnonKey()
)

interface SignXMLParams {
  empresaId: string
  certPassword: string
  rawXml: string
}

interface SignXMLByUserParams {
  userId: string
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
    // Usar client com Service Role se disponível (declarado no topo)
    // Buscar certificado ativo da empresa na tabela para obter o caminho correto no storage
    const { data: certRow, error: certRowError } = await supabase
      .from("certificados_esocial")
      .select("arquivo_url, valido")
      .eq("empresa_id", empresaId)
      .eq("valido", true)
      .single()

    if (certRowError || !certRow?.arquivo_url) {
      return {
        success: false,
        error: "Certificado A1 não encontrado para esta empresa",
      }
    }

    const arquivoUrl: string = certRow.arquivo_url

    // Baixar certificado do storage usando caminho armazenado
    const { data: certificateData, error: fetchError } = await supabase.storage
      .from("certificados-esocial")
      .download(arquivoUrl)

    if (fetchError || !certificateData) {
      return {
        success: false,
        error: "Falha ao baixar certificado do storage",
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
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certPassword)
    } catch (error) {
      return {
        success: false,
        error: "Senha do certificado incorreta",
      }
    }

    // Extrair chave privada e certificado
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]

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

    // Validar XML de entrada
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

    // Assinar XML usando XMLDSig, conforme eSocial: referência no elemento <evento Id="...">
    try {
      const sig = new SignedXml()

      // Configurar algoritmos
      sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
      sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#"

      // Configurar chave privada (PEM)
      sig.privateKey = forge.pki.privateKeyToPem(privateKey)

      // KeyInfo com certificado X509
      const certPem = forge.pki.certificateToPem(certificate)
      const certBase64 = certPem
        .replace("-----BEGIN CERTIFICATE-----", "")
        .replace("-----END CERTIFICATE-----", "")
        .replace(/\n/g, "")
      sig.keyInfoProvider = {
        getKeyInfo() {
          return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`
        },
      } as any

      // Referência ao elemento <evento> com atributo Id
      sig.addReference(
        "//*[local-name(.)='evento' and @Id]",
        [
          "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
          "http://www.w3.org/2001/10/xml-exc-c14n#",
        ],
        "http://www.w3.org/2001/04/xmlenc#sha256",
      )

      // Inserir assinatura dentro do elemento <evento>
      sig.computeSignature(rawXml, {
        location: {
          reference: "//*[local-name(.)='evento' and @Id]",
          action: "append",
        },
      })

      const signedXml = sig.getSignedXml()

      return {
        success: true,
        signedXml,
      }
    } catch (signError) {
      return {
        success: false,
        error: "Erro ao assinar o XML. Verifique o elemento <evento> e o atributo Id.",
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

// Assinar XML usando certificado vinculado à CONTA do usuário (bucket path: usuario-<uid>/certificado-a1.pfx)
export async function signXMLWithUserCertificate({
  userId,
  certPassword,
  rawXml,
}: SignXMLByUserParams): Promise<SignXMLResult> {
  try {
    const arquivoUrl = `usuario-${userId}/certificado-a1.pfx`

    const { data: certificateData, error: fetchError } = await supabase.storage
      .from("certificados-esocial")
      .download(arquivoUrl)

    if (fetchError || !certificateData) {
      return {
        success: false,
        error: "Falha ao baixar certificado do storage da conta",
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
        error: "Arquivo de certificado inválido (PKCS#12)",
      }
    }

    let p12: forge.pkcs12.Pkcs12Pfx
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certPassword)
    } catch (error) {
      return {
        success: false,
        error: "Senha do certificado incorreta",
      }
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = certBags[forge.pki.oids.certBag]?.[0]
    if (!certBag || !certBag.cert) {
      return {
        success: false,
        error: "Certificado não encontrado no arquivo .pfx",
      }
    }

    const privateKeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const privateKeyBag = privateKeyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    if (!privateKeyBag || !privateKeyBag.key) {
      return {
        success: false,
        error: "Chave privada não encontrada no certificado",
      }
    }

    const privateKey = privateKeyBag.key
    const certificate = certBag.cert

    // Preparar XML para assinatura
    const doc = new DOMParser().parseFromString(rawXml)
    const signer = new SignedXml()
    signer.addReference("//*[local-name(.)='evtInfoEmpregador']", [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ])
    signer.signingKey = forge.pki.privateKeyToPem(privateKey)
    signer.keyInfoProvider = {
      getKeyInfo: () => forge.pki.certificateToPem(certificate),
    } as any
    signer.computeSignature(doc)

    const signedXml = signer.getSignedXml()
    return { success: true, signedXml }
  } catch (error) {
    console.error("Erro na assinatura com certificado da conta:", error)
    return { success: false, error: "Erro interno ao assinar XML" }
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
      success: true,
      certificate: cert,
      subject: cert.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
      issuer: cert.issuer.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
    }
  } catch (error) {
    console.error("Erro ao assinar XML:", error)
    return {
      success: false,
      error: "Erro interno ao assinar XML",
    }
  }
}

/**
 * Extrai informações do certificado armazenado no Supabase a partir de um caminho arbitrário.
 * @param path Caminho no bucket `certificados-esocial` (ex.: usuario-<uid>/certificado-a1.pfx)
 * @param certPassword Senha do certificado
 */
export async function getCertificateInfoFromPath(path: string, certPassword: string) {
  try {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("certificados-esocial")
      .createSignedUrl(path, 60)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error("Certificado não encontrado")
    }

    const certBuffer = await axios
      .get(signedUrlData.signedUrl, { responseType: "arraybuffer" })
      .then((res) => res.data)

    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(certBuffer))
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certPassword)

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = certBags[forge.pki.oids.certBag]?.[0]
    if (!certBag || !certBag.cert) {
      throw new Error("Certificado não encontrado no arquivo .pfx")
    }
    const cert = certBag.cert

    return {
      success: true,
      subject: cert.subject.attributes.map((attr) => `${attr.name}=${attr.value}`).join(", "),
      issuer: cert.issuer.attributes.map((attr) => `${attr.name}=${attr.value}`).join(", "),
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao obter informações" }
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
  const hashBytes = md.digest().getBytes()

  // Assinar hash com chave privada usando RSA
  const signature = (privateKey as any).sign(hashBytes)
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
          <DigestValue>${forge.util.encode64(hashBytes)}</DigestValue>
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
