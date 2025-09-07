export const ESOCIAL_URLS = {
  producao: {
    recepcaoLote:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/recepcaoevento/RecepcaoEvento.svc",
    consultaLote:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/ConsultarLoteEventos.svc",
    downloadEvento:
      "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/download/DownloadEvento.svc",
  },
  homologacao: {
    recepcaoLote:
      "https://webservices.homologacao.esocial.gov.br/servicos/empregador/recepcaoevento/RecepcaoEvento.svc",
    consultaLote:
      "https://webservices.homologacao.esocial.gov.br/servicos/empregador/consultarloteeventos/ConsultarLoteEventos.svc",
    downloadEvento: "https://webservices.homologacao.esocial.gov.br/servicos/empregador/download/DownloadEvento.svc",
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

export function getEsocialConfig(
  empresa_cnpj: string,
  ambiente: "producao" | "homologacao" = "homologacao",
): EsocialConfig {
  return {
    ambiente,
    cnpj: empresa_cnpj,
    certificado: {
      tipo: "A1" as const, // Padrão A1, pode ser configurado por empresa
    },
    urls: ESOCIAL_URLS[ambiente],
  }
}
