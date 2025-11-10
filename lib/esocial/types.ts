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
    consultaEventos: string
  }
}

export interface EventoEsocial {
  id: string
  empresa_id: string
  tipo_evento: "S-1000" | "S-2220" | "S-2240" | "S-2210" | "S-2230"
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
  // Opcional: empresa emissora do evento (CNPJ), para preencher ideEmpregador/Transmissor
  empresa?: {
    cnpj: string
    razao_social?: string
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

// S-1000 - Informações do Empregador/Contribuinte/Órgão Público (S-1.3)
export interface DadosS1000 {
  ideEvento: {
    indRetif?: "1" | "2" // 1=Original, 2=Retificação
    nrRecibo?: string // Número do recibo quando indRetif=2
    tpAmb: "1" | "2" // 1=Produção, 2=Homologação
    procEmi: "1" | "2" | "3" | "4" // Forma de emissão
    verProc: string // Versão do aplicativo emissor
  }
  idePeriodo: {
    iniValid: string // AAAA-MM
    fimValid?: string // AAAA-MM
  }
  /**
   * Operação de infoEmpregador: 'inclusao' (default), 'alteracao' ou 'exclusao'
   */
  operacao?: "inclusao" | "alteracao" | "exclusao"
  infoCadastro: {
    classTrib: string // Classificação tributária (código)
    indCoop?: "0" | "1"
    indConstr?: "0" | "1"
    indDesFolha?: "0" | "1"
    indOptRegEletron?: "0" | "1"
    indEntEd?: "0" | "1"
    indEtt?: "0" | "1"
    contato: {
      nmCtt: string
      cpfCtt: string
      foneFix?: string
      foneCel?: string
      email: string
    }
    softHouse?: {
      cnpjSoft: string
      nmRazao: string
      nmContato?: string
      telefone?: string
      email?: string
    }
  }
  /**
   * Dados para operação de alteração (S-1000/infoEmpregador/alteracao)
   */
  alteracao?: {
    idePeriodo: {
      iniValid: string
      fimValid?: string
    }
    infoCadastro: DadosS1000["infoCadastro"]
  }
  /**
   * Dados para operação de exclusão (S-1000/infoEmpregador/exclusao)
   */
  exclusao?: {
    idePeriodo: {
      iniValid: string
      fimValid?: string
    }
  }
}
