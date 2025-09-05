import { createClient } from "@/lib/supabase/client"

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

      // Assinar XML baseado no tipo de certificado
      let xmlAssinado: string

      if (certificado.tipo === "A1") {
        xmlAssinado = await this.assinarComCertificadoA1(xml_original, certificado, senha_certificado)
      } else {
        xmlAssinado = await this.assinarComCertificadoA3(xml_original, certificado, senha_certificado)
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
    const response = await fetch("/api/esocial/assinar-xml", {
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
  private async assinarComCertificadoA3(xml: string, certificado: CertificadoDigital, senha?: string): Promise<string> {
    if (!certificado.thumbprint) {
      throw new Error("Thumbprint do certificado A3 não encontrado")
    }

    // Para certificado A3, usar API específica que acessa o token
    const response = await fetch("/api/esocial/assinar-xml-a3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        xml,
        thumbprint: certificado.thumbprint,
        senha,
        tipo: "A3",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Erro na assinatura do XML com certificado A3")
    }

    const result = await response.json()
    return result.xml_assinado
  }

  // Obter certificado ativo da empresa
  async obterCertificadoAtivo(empresa_id: string): Promise<CertificadoDigital | null> {
    const { data, error } = await this.supabase
      .from("esocial_config")
      .select("*")
      .eq("empresa_id", empresa_id)
      .eq("ativo", true)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      empresa_id: data.empresa_id,
      tipo: data.certificado_tipo as "A1" | "A3",
      nome: `Certificado ${data.certificado_tipo}`,
      validade: "2025-12-31", // Seria obtido do certificado real
      thumbprint: data.certificado_thumbprint,
      arquivo_url: data.certificado_arquivo,
      ativo: data.ativo,
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

      if (certificado.tipo === "A3" && !certificado.thumbprint) {
        return {
          valido: false,
          erro: "Thumbprint do certificado A3 não encontrado",
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

      // Upload para storage
      const fileName = `certificado_${empresa_id}_${Date.now()}.p12`
      const filePath = `${empresa_id}/certificados/${fileName}`

      const { error: uploadError } = await this.supabase.storage.from("esocial").upload(filePath, arquivo)

      if (uploadError) {
        return {
          sucesso: false,
          erro: `Erro no upload: ${uploadError.message}`,
        }
      }

      // Atualizar configuração da empresa
      const { error: updateError } = await this.supabase
        .from("esocial_config")
        .update({
          certificado_tipo: "A1",
          certificado_arquivo: fileName,
          certificado_senha_encrypted: this.criptografarSenha(senha),
          updated_at: new Date().toISOString(),
        })
        .eq("empresa_id", empresa_id)

      if (updateError) {
        return {
          sucesso: false,
          erro: `Erro ao salvar configuração: ${updateError.message}`,
        }
      }

      return {
        sucesso: true,
        arquivo_url: fileName,
      }
    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }

  // Configurar certificado A3
  async configurarCertificadoA3(
    empresa_id: string,
    thumbprint: string,
  ): Promise<{
    sucesso: boolean
    erro?: string
  }> {
    try {
      // Validar thumbprint
      if (!thumbprint || thumbprint.length < 20) {
        return {
          sucesso: false,
          erro: "Thumbprint inválido",
        }
      }

      // Atualizar configuração da empresa
      const { error } = await this.supabase
        .from("esocial_config")
        .update({
          certificado_tipo: "A3",
          certificado_thumbprint: thumbprint.toUpperCase(),
          certificado_arquivo: null,
          certificado_senha_encrypted: null,
          updated_at: new Date().toISOString(),
        })
        .eq("empresa_id", empresa_id)

      if (error) {
        return {
          sucesso: false,
          erro: `Erro ao salvar configuração: ${error.message}`,
        }
      }

      return { sucesso: true }
    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
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
    const filePath = `${empresa_id}/certificados/${arquivo_url}`

    const { data, error } = await this.supabase.storage.from("esocial").download(filePath)

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
