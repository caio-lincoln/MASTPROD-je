export interface EsocialConfig {
  ambiente: "producao" | "homologacao"
  cnpj: string
  certificado: {
    tipo: "A1" | "A3"
    arquivo?: string
    senha?: string
    thumbprint?: string
  }
  urls: {
    recepcaoLote: string
    consultaLote: string
    downloadEvento: string
  }
}

export interface EventoEsocial {
  id: string
  empresa_id: string
  tipo_evento: "S-2220" | "S-2240" | "S-2210" | "S-2230"
  status: "preparando" | "enviado" | "aguardando" | "processado" | "erro" | "rejeitado"
  xml_original?: string
  xml_assinado?: string
  retorno_xml?: string
  protocolo?: string
  numero_recibo?: string
  data_envio?: string
  data_processamento?: string
  erros?: string[]
  arquivo_url?: string
  funcionario_id?: string
  created_at: string
  updated_at: string
}

export interface LoteEventos {
  id: string
  empresa_id: string
  protocolo?: string
  status: "preparando" | "enviado" | "processado" | "erro"
  eventos: EventoEsocial[]
  data_envio?: string
  retorno_completo?: string
}

export interface DadosS2220 {
  funcionario: {
    cpf: string
    pis: string
    nome: string
    data_nascimento: string
  }
  exame: {
    tipo: "ASO" | "Periodico" | "Mudanca" | "Retorno" | "Demissional"
    data_exame: string
    data_validade: string
    medico_crm: string
    medico_nome: string
    resultado: "Apto" | "Inapto"
    observacoes?: string
  }
  empresa: {
    cnpj: string
    razao_social: string
  }
}

export interface DadosS2240 {
  funcionario: {
    cpf: string
    pis: string
    matricula: string
  }
  ambiente: {
    setor: string
    descricao_atividade: string
    fatores_risco: Array<{
      codigo: string
      intensidade?: string
      tecnica_medicao?: string
      epi_eficaz: boolean
    }>
  }
  periodo: {
    data_inicio: string
    data_fim?: string
  }
}

export interface DadosS2210 {
  acidente: {
    data_acidente: string
    hora_acidente: string
    tipo_acidente: "Tipico" | "Trajeto" | "Doenca"
    local_acidente: string
    descricao: string
    houve_afastamento: boolean
    dias_afastamento?: number
  }
  funcionario: {
    cpf: string
    pis: string
    nome: string
    cargo: string
  }
  empresa: {
    cnpj: string
    razao_social: string
  }
}
