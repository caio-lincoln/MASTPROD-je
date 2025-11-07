import { createClient } from "@/lib/supabase/client"
import { apiFetch } from "@/lib/security/client-csrf"

export interface CertificadoDigital {
  id: string
  empresa_id: string
  tipo: "A1" | "A3"
  nome: string
  validade: string
  thumbprint?: string
  arquivo_url?: string
  ativo: boolean
}

export interface AssinaturaResult {
  sucesso: boolean
  xml_assinado?: string
  erro?: string
  certificado_usado?: string
}

export class DigitalSignatureService {
  private supabase = createClient()

  // Assinar XML usando certificado da empresa
  async assinarXML(xml_original: string, empresa_id: string, senha_certificado?: string): Promise<AssinaturaResult> {
    try {
      // Buscar certificado ativo da empresa
      const certificado = await this.obterCertificadoAtivo(empresa_id)
      if (!certificado) {
        return {
          sucesso: false,
          erro: "Nenhum certificado digital ativo encontrado para a empresa",
        }
      }

      // Validar certificado antes de usar
      const validacao = await this.validarCertificado(certificado)
      if (!validacao.valido) {
        return {
          sucesso: false,
          erro: `Certificado inválido: ${validacao.erro}`,
        }
      }

      // Assinar XML apenas com A1. A3 não é suportado.
      let xmlAssinado: string

      if (certificado.tipo === "A1") {
        xmlAssinado = await this.assinarComCertificadoA1(xml_original, certificado, senha_certificado)
      } else {
        throw new Error("Assinatura com certificado A3 não suportada neste ambiente")
      }

      return {
        sucesso: true,
        xml_assinado: xmlAssinado,
        certificado_usado: certificado.nome,
      }
    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido na assinatura",
      }
    }
  }

  // Assinar com certificado A1 (arquivo .p12/.pfx)
  private async assinarComCertificadoA1(xml: string, certificado: CertificadoDigital, senha?: string): Promise<string> {
    if (!certificado.arquivo_url) {
      throw new Error("Arquivo do certificado A1 não encontrado")
    }

    // Download do certificado do storage
    const certificadoBuffer = await this.downloadCertificadoFromStorage(certificado.arquivo_url, certificado.empresa_id)

    // Chamar API de assinatura no servidor
    const response = await apiFetch("/api/esocial/assinar-xml", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        xml,
        certificado: certificadoBuffer.toString("base64"),
        senha,
        tipo: "A1",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Erro na assinatura do XML")
    }

    const result = await response.json()
    return result.xml_assinado
  }

  // Assinar com certificado A3 (token/smartcard)
  private async assinarComCertificadoA3(): Promise<string> {
    throw new Error("Assinatura A3 não suportada")
  }

  // Obter certificado ativo da empresa
  async obterCertificadoAtivo(empresa_id: string): Promise<CertificadoDigital | null> {
    const { data, error } = await this.supabase
      .from("certificados_esocial")
      .select("*")
      .eq("empresa_id", empresa_id)
      .eq("valido", true)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      empresa_id: data.empresa_id,
      tipo: "A1",
      nome: `Certificado A1`,
      validade: "2025-12-31", // Seria obtido do certificado real
      arquivo_url: data.arquivo_url,
      ativo: data.valido,
    }
  }

  // Validar certificado digital
  async validarCertificado(certificado: CertificadoDigital): Promise<{
    valido: boolean
    erro?: string
  }> {
    try {
      // Verificar validade
      const dataValidade = new Date(certificado.validade)
      const agora = new Date()

      if (dataValidade < agora) {
        return {
          valido: false,
          erro: "Certificado expirado",
        }
      }

      // Verificar se tem os dados necessários
      if (certificado.tipo === "A1" && !certificado.arquivo_url) {
        return {
          valido: false,
          erro: "Arquivo do certificado A1 não encontrado",
        }
      }

      if (certificado.tipo === "A3") {
        return {
          valido: false,
          erro: "Certificado A3 não suportado",
        }
      }

      return { valido: true }
    } catch (error) {
      return {
        valido: false,
        erro: error instanceof Error ? error.message : "Erro na validação",
      }
    }
  }

  // Upload de certificado A1 para storage
  async uploadCertificadoA1(
    arquivo: File,
    empresa_id: string,
    senha: string,
  ): Promise<{
    sucesso: boolean
    arquivo_url?: string
    erro?: string
  }> {
    try {
      // Validar arquivo
      if (!arquivo.name.match(/\.(p12|pfx)$/i)) {
        return {
          sucesso: false,
          erro: "Arquivo deve ser .p12 ou .pfx",
        }
      }

      // Validar certificado antes do upload
      const validacao = await this.validarArquivoCertificado(arquivo, senha)
      if (!validacao.valido) {
        return {
          sucesso: false,
          erro: validacao.erro,
        }
      }

      const filePath = `empresa-${empresa_id}/certificado-a1.pfx`

      const { error: uploadError } = await this.supabase.storage
        .from("certificados-esocial")
        .upload(filePath, arquivo, {
          upsert: true,
          contentType: arquivo.type,
        })

      if (uploadError) {
        return {
          sucesso: false,
          erro: `Erro no upload: ${uploadError.message}`,
        }
      }

      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      const responsavel = user?.user_metadata?.nome || user?.email || "Usuário desconhecido"

      // Data de validade padrão (1 ano a partir de hoje) - deve ser substituída por validação real do certificado
      const dataValidade = new Date()
      dataValidade.setFullYear(dataValidade.getFullYear() + 1)

      const { error: updateError } = await this.supabase.from("certificados_esocial").upsert(
        {
          empresa_id: empresa_id,
          nome: arquivo.name,
          tipo: "A1",
          arquivo_url: filePath,
          data_validade: dataValidade.toISOString().split('T')[0], // Formato YYYY-MM-DD
          data_upload: new Date().toISOString(),
          responsavel: responsavel,
          valido: true,
        },
        {
          onConflict: "empresa_id",
        },
      )

      if (updateError) {
        return {
          sucesso: false,
          erro: `Erro ao salvar certificado: ${updateError.message}`,
        }
      }

      return {
        sucesso: true,
        arquivo_url: filePath,
      }
    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }

  // Configurar certificado A3 não suportado
  async configurarCertificadoA3(): Promise<{ sucesso: boolean; erro?: string }> {
    return { sucesso: false, erro: "Certificado A3 não suportado" }
  }

  // Verificar se XML está assinado
  verificarAssinaturaXML(xml: string): {
    assinado: boolean
    detalhes?: {
      certificado: string
      data_assinatura: string
      valido: boolean
    }
  } {
    // Verificar se contém elementos de assinatura digital
    const temAssinatura = xml.includes("<ds:Signature") || xml.includes("<Signature")

    if (!temAssinatura) {
      return { assinado: false }
    }

    // Extrair informações básicas da assinatura (implementação simplificada)
    return {
      assinado: true,
      detalhes: {
        certificado: "Certificado Digital",
        data_assinatura: new Date().toISOString(),
        valido: true,
      },
    }
  }

  // Funções utilitárias privadas
  private async downloadCertificadoFromStorage(arquivo_url: string, empresa_id: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from("certificados-esocial").download(arquivo_url)

    if (error) throw error

    return Buffer.from(await data.arrayBuffer())
  }

  private async validarArquivoCertificado(arquivo: File, senha: string): Promise<{ valido: boolean; erro?: string }> {
    // Implementação simplificada - em produção usar biblioteca de validação de certificados
    try {
      const buffer = await arquivo.arrayBuffer()

      // Verificar se é um arquivo PKCS#12 válido (implementação básica)
      const bytes = new Uint8Array(buffer)
      const isPKCS12 = bytes[0] === 0x30 // ASN.1 SEQUENCE

      if (!isPKCS12) {
        return {
          valido: false,
          erro: "Arquivo não é um certificado PKCS#12 válido",
        }
      }

      return { valido: true }
    } catch (error) {
      return {
        valido: false,
        erro: "Erro ao validar certificado",
      }
    }
  }

  private criptografarSenha(senha: string): string {
    // Implementação simplificada - em produção usar criptografia robusta
    return Buffer.from(senha).toString("base64")
  }

  private descriptografarSenha(senhaEncriptada: string): string {
    // Implementação simplificada - em produção usar descriptografia robusta
    return Buffer.from(senhaEncriptada, "base64").toString()
  }
}
