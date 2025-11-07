export const ESOCIAL_URLS = {
  producao: {
    recepcaoLote:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/recepcaoevento/RecepcaoEvento.svc",
    consultaLote:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/ConsultarLoteEventos.svc",
    downloadEvento:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/download/DownloadEvento.svc",
    consultaEventos:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/ConsultarLoteEventos.svc",
  },
  homologacao: {
    recepcaoLote:
      "https://webservices.homologacao.esocial.gov.br/servicos/empregador/recepcaoevento/RecepcaoEvento.svc",
    consultaLote:
      "https://webservices.homologacao.esocial.gov.br/servicos/empregador/consultarloteeventos/ConsultarLoteEventos.svc",
    downloadEvento: "https://webservices.homologacao.esocial.gov.br/servicos/empregador/download/DownloadEvento.svc",
    consultaEventos:
      "https://webservices.homologacao.esocial.gov.br/servicos/empregador/consultarloteeventos/ConsultarLoteEventos.svc",
  },
}

export const ESOCIAL_SCHEMAS = {
  "S-2220": "http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00",
  "S-2240": "http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00",
  "S-2210": "http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00",
  "S-2230": "http://www.esocial.gov.br/schema/evt/evtAfastTemp/v_S_01_02_00",
}

export const TIPOS_EVENTO = {
  "S-2220": "Monitoramento da Saúde do Trabalhador",
  "S-2240": "Condições Ambientais do Trabalho - Fatores de Risco",
  "S-2210": "Comunicação de Acidente de Trabalho",
  "S-2230": "Afastamento Temporário",
}

import { EsocialConfig } from './types'

function sanitizeCNPJ(cnpj: string) {
  return (cnpj || '').replace(/\D/g, '')
}

function isValidCNPJ(cnpj: string) {
  const cleaned = sanitizeCNPJ(cnpj)
  return cleaned.length === 14
}

export function validateEsocialConfig(config: EsocialConfig) {
  const errors: string[] = []

  if (!config.cnpj || !isValidCNPJ(config.cnpj)) {
    errors.push('CNPJ inválido: deve conter 14 dígitos')
  }

  if (!['producao', 'homologacao'].includes(config.ambiente)) {
    errors.push('Ambiente inválido: use "producao" ou "homologacao"')
  }

  if (config.certificado?.tipo !== 'A1') {
    errors.push('Tipo de certificado não suportado: apenas A1 é aceito')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function getEsocialConfig(
  empresa_cnpj: string,
  ambiente: "producao" | "homologacao" = "producao",
): EsocialConfig {
  // Configuração baseada em variáveis de ambiente com fallback seguro
  const envAmbiente =
    (process.env.NEXT_PUBLIC_ESOCIAL_AMBIENTE || process.env.ESOCIAL_AMBIENTE) as
      | "producao"
      | "homologacao"
      | undefined

  // Em produção força "producao"; em dev usa env ou parâmetro
  const ambienteReal =
    process.env.NODE_ENV === "production"
      ? "producao"
      : envAmbiente || ambiente

  const envCertTipo =
    (process.env.NEXT_PUBLIC_ESOCIAL_CERT_TIPO || process.env.ESOCIAL_CERT_TIPO) as
      | "A1"
      | "A3"
      | undefined

  // Apenas A1 é suportado. Se A3 vier por env, normaliza para A1.
  const certificadoTipo: "A1" = "A1"
  const certificadoArquivo = process.env.ESOCIAL_CERT_ARQUIVO || undefined
  const certificadoSenha = process.env.ESOCIAL_CERT_SENHA || undefined
  const certificadoThumb = process.env.ESOCIAL_CERT_THUMBPRINT || undefined
  const empresaCNPJ = sanitizeCNPJ(empresa_cnpj)
  
  return {
    ambiente: ambienteReal,
    cnpj: empresaCNPJ,
    certificado: {
      tipo: certificadoTipo,
      arquivo: certificadoArquivo,
      senha: certificadoSenha,
      thumbprint: certificadoThumb,
    },
    urls: ESOCIAL_URLS[ambienteReal],
  }
}
