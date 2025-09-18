import { FuncionarioSST } from "./consulta-eventos-sst"

export interface ParsedEventoSST {
  tipo_evento: "S-2210" | "S-2220" | "S-2240"
  numero_recibo: string
  data_evento: string
  funcionario: {
    cpf: string
    nome: string
    matricula?: string
    cargo?: string
    categoria?: string
  }
  dados_especificos: any
  xml_original: string
  validacao: {
    valido: boolean
    erros: string[]
    avisos: string[]
  }
}

export interface ResultadoParseSST {
  sucesso: boolean
  eventos_processados: ParsedEventoSST[]
  total_eventos: number
  eventos_validos: number
  eventos_invalidos: number
  erros_gerais: string[]
  estatisticas: {
    por_tipo: {
      "S-2210": number
      "S-2220": number
      "S-2240": number
    }
    funcionarios_unicos: number
  }
}

export class EsocialParserEventosSST {
  private readonly NAMESPACES = {
    esocial: "http://www.esocial.gov.br/schema/evt",
    soap: "http://www.w3.org/2003/05/soap-envelope"
  }

  /**
   * Faz parse de múltiplos XMLs de eventos SST
   */
  async parseEventosSST(xmls: string[]): Promise<ResultadoParseSST> {
    const eventosProcessados: ParsedEventoSST[] = []
    const errosGerais: string[] = []
    const estatisticas = {
      por_tipo: { "S-2210": 0, "S-2220": 0, "S-2240": 0 },
      funcionarios_unicos: 0
    }

    console.log(`🔍 Iniciando parse de ${xmls.length} XMLs de eventos SST`)

    for (let i = 0; i < xmls.length; i++) {
      try {
        const xml = xmls[i]
        const eventos = await this.parseXMLEvento(xml)
        
        eventos.forEach(evento => {
          eventosProcessados.push(evento)
          estatisticas.por_tipo[evento.tipo_evento]++
        })
        
        console.log(`✅ XML ${i + 1}/${xmls.length} processado: ${eventos.length} eventos encontrados`)
      } catch (error) {
        const erro = `Erro ao processar XML ${i + 1}: ${String(error)}`
        errosGerais.push(erro)
        console.error(`❌ ${erro}`)
      }
    }

    // Calcular funcionários únicos
    const cpfsUnicos = new Set(eventosProcessados.map(e => e.funcionario.cpf))
    estatisticas.funcionarios_unicos = cpfsUnicos.size

    const eventosValidos = eventosProcessados.filter(e => e.validacao.valido).length
    const eventosInvalidos = eventosProcessados.length - eventosValidos

    return {
      sucesso: errosGerais.length === 0,
      eventos_processados: eventosProcessados,
      total_eventos: eventosProcessados.length,
      eventos_validos: eventosValidos,
      eventos_invalidos: eventosInvalidos,
      erros_gerais: errosGerais,
      estatisticas
    }
  }

  /**
   * Faz parse de um XML específico
   */
  private async parseXMLEvento(xml: string): Promise<ParsedEventoSST[]> {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xml, "text/xml")
      
      // Verificar se há erros de parsing
      const parseError = xmlDoc.querySelector("parsererror")
      if (parseError) {
        throw new Error(`Erro de parsing XML: ${parseError.textContent}`)
      }

      const eventos: ParsedEventoSST[] = []

      // Buscar eventos S-2210 (CAT)
      const eventosS2210 = xmlDoc.querySelectorAll("evtCAT, S-2210")
      eventosS2210.forEach(node => {
        const evento = this.parseEventoS2210(node, xml)
        if (evento) eventos.push(evento)
      })

      // Buscar eventos S-2220 (ASO)
      const eventosS2220 = xmlDoc.querySelectorAll("evtMonit, S-2220")
      eventosS2220.forEach(node => {
        const evento = this.parseEventoS2220(node, xml)
        if (evento) eventos.push(evento)
      })

      // Buscar eventos S-2240 (Agentes Nocivos)
      const eventosS2240 = xmlDoc.querySelectorAll("evtExpRisco, S-2240")
      eventosS2240.forEach(node => {
        const evento = this.parseEventoS2240(node, xml)
        if (evento) eventos.push(evento)
      })

      return eventos
    } catch (error) {
      console.error("Erro ao fazer parse do XML:", error)
      throw error
    }
  }

  /**
   * Parse específico para evento S-2210 (CAT)
   */
  private parseEventoS2210(node: Element, xmlOriginal: string): ParsedEventoSST | null {
    try {
      const validacao = { valido: true, erros: [], avisos: [] }

      // Extrair dados básicos
      const numeroRecibo = this.extrairTexto(node, "nrRecibo") || ""
      const dataEvento = this.extrairTexto(node, "dtEvento") || ""

      // Dados do funcionário
      const cpf = this.extrairTexto(node, "cpfTrab")
      const nome = this.extrairTexto(node, "nmTrab")
      const matricula = this.extrairTexto(node, "matricula")

      // Validações obrigatórias
      if (!cpf) {
        validacao.erros.push("CPF do trabalhador é obrigatório")
        validacao.valido = false
      }
      if (!nome) {
        validacao.erros.push("Nome do trabalhador é obrigatório")
        validacao.valido = false
      }

      // Dados específicos do acidente
      const dadosEspecificos = {
        data_acidente: this.extrairTexto(node, "dtAcid"),
        hora_acidente: this.extrairTexto(node, "hrAcid"),
        tipo_acidente: this.extrairTexto(node, "tpAcid"),
        codigo_situacao: this.extrairTexto(node, "codSitGeradora"),
        descricao_lesao: this.extrairTexto(node, "dscLesao"),
        parte_corpo_atingida: this.extrairTexto(node, "codParteAting"),
        codigo_agente_causador: this.extrairTexto(node, "codAgntCausador"),
        houve_afastamento: this.extrairTexto(node, "indCatObito") === "S",
        local_acidente: {
          tipo_local: this.extrairTexto(node, "tpLocal"),
          descricao: this.extrairTexto(node, "dscLocal"),
          endereco: this.extrairEnderecoAcidente(node)
        },
        testemunhas: this.extrairTestemunhas(node)
      }

      // Validações específicas
      if (!dadosEspecificos.data_acidente) {
        validacao.avisos.push("Data do acidente não informada")
      }
      if (!dadosEspecificos.tipo_acidente) {
        validacao.avisos.push("Tipo de acidente não informado")
      }

      return {
        tipo_evento: "S-2210",
        numero_recibo: numeroRecibo,
        data_evento: dataEvento,
        funcionario: {
          cpf: cpf || "",
          nome: nome || "",
          matricula,
          cargo: this.extrairTexto(node, "codCargo"),
          categoria: this.extrairTexto(node, "codCateg")
        },
        dados_especificos: dadosEspecificos,
        xml_original: xmlOriginal,
        validacao
      }
    } catch (error) {
      console.error("Erro ao fazer parse do evento S-2210:", error)
      return null
    }
  }

  /**
   * Parse específico para evento S-2220 (ASO)
   */
  private parseEventoS2220(node: Element, xmlOriginal: string): ParsedEventoSST | null {
    try {
      const validacao = { valido: true, erros: [], avisos: [] }

      // Extrair dados básicos
      const numeroRecibo = this.extrairTexto(node, "nrRecibo") || ""
      const dataEvento = this.extrairTexto(node, "dtEvento") || ""

      // Dados do funcionário
      const cpf = this.extrairTexto(node, "cpfTrab")
      const nome = this.extrairTexto(node, "nmTrab")
      const matricula = this.extrairTexto(node, "matricula")

      // Validações obrigatórias
      if (!cpf) {
        validacao.erros.push("CPF do trabalhador é obrigatório")
        validacao.valido = false
      }
      if (!nome) {
        validacao.erros.push("Nome do trabalhador é obrigatório")
        validacao.valido = false
      }

      // Dados específicos do exame
      const dadosEspecificos = {
        tipo_exame: this.extrairTexto(node, "tpExame"),
        data_exame: this.extrairTexto(node, "dtExm"),
        resultado_exame: this.extrairTexto(node, "indResult"),
        medico_responsavel: {
          nome: this.extrairTexto(node, "nmMed"),
          crm: this.extrairTexto(node, "nrCRM"),
          uf_crm: this.extrairTexto(node, "ufCRM")
        },
        exames_realizados: this.extrairExamesRealizados(node),
        observacoes: this.extrairTexto(node, "observacoes"),
        data_proximo_exame: this.extrairTexto(node, "dtProxExame")
      }

      // Validações específicas
      if (!dadosEspecificos.tipo_exame) {
        validacao.erros.push("Tipo de exame é obrigatório")
        validacao.valido = false
      }
      if (!dadosEspecificos.data_exame) {
        validacao.erros.push("Data do exame é obrigatória")
        validacao.valido = false
      }
      if (!dadosEspecificos.medico_responsavel.nome) {
        validacao.avisos.push("Nome do médico responsável não informado")
      }

      return {
        tipo_evento: "S-2220",
        numero_recibo: numeroRecibo,
        data_evento: dataEvento,
        funcionario: {
          cpf: cpf || "",
          nome: nome || "",
          matricula,
          cargo: this.extrairTexto(node, "codCargo"),
          categoria: this.extrairTexto(node, "codCateg")
        },
        dados_especificos: dadosEspecificos,
        xml_original: xmlOriginal,
        validacao
      }
    } catch (error) {
      console.error("Erro ao fazer parse do evento S-2220:", error)
      return null
    }
  }

  /**
   * Parse específico para evento S-2240 (Agentes Nocivos)
   */
  private parseEventoS2240(node: Element, xmlOriginal: string): ParsedEventoSST | null {
    try {
      const validacao = { valido: true, erros: [], avisos: [] }

      // Extrair dados básicos
      const numeroRecibo = this.extrairTexto(node, "nrRecibo") || ""
      const dataEvento = this.extrairTexto(node, "dtEvento") || ""

      // Dados do funcionário
      const cpf = this.extrairTexto(node, "cpfTrab")
      const nome = this.extrairTexto(node, "nmTrab")
      const matricula = this.extrairTexto(node, "matricula")

      // Validações obrigatórias
      if (!cpf) {
        validacao.erros.push("CPF do trabalhador é obrigatório")
        validacao.valido = false
      }
      if (!nome) {
        validacao.erros.push("Nome do trabalhador é obrigatório")
        validacao.valido = false
      }

      // Dados específicos dos agentes nocivos
      const dadosEspecificos = {
        data_inicio_exposicao: this.extrairTexto(node, "dtIniCondicao"),
        data_fim_exposicao: this.extrairTexto(node, "dtFimCondicao"),
        agentes_nocivos: this.extrairAgentesNocivos(node),
        epi_utilizado: this.extrairTexto(node, "epcEpi") === "S",
        equipamentos_protecao: this.extrairEquipamentosProtecao(node),
        ambiente_trabalho: {
          setor: this.extrairTexto(node, "codSetor"),
          descricao_atividade: this.extrairTexto(node, "dscAtivDes"),
          local_trabalho: this.extrairTexto(node, "localTrab")
        },
        responsavel_registros: {
          nome: this.extrairTexto(node, "nmResp"),
          cpf: this.extrairTexto(node, "cpfResp"),
          ideOC: this.extrairTexto(node, "ideOC")
        }
      }

      // Validações específicas
      if (!dadosEspecificos.data_inicio_exposicao) {
        validacao.erros.push("Data de início da exposição é obrigatória")
        validacao.valido = false
      }
      if (!dadosEspecificos.agentes_nocivos || dadosEspecificos.agentes_nocivos.length === 0) {
        validacao.erros.push("Pelo menos um agente nocivo deve ser informado")
        validacao.valido = false
      }

      return {
        tipo_evento: "S-2240",
        numero_recibo: numeroRecibo,
        data_evento: dataEvento,
        funcionario: {
          cpf: cpf || "",
          nome: nome || "",
          matricula,
          cargo: this.extrairTexto(node, "codCargo"),
          categoria: this.extrairTexto(node, "codCateg")
        },
        dados_especificos: dadosEspecificos,
        xml_original: xmlOriginal,
        validacao
      }
    } catch (error) {
      console.error("Erro ao fazer parse do evento S-2240:", error)
      return null
    }
  }

  /**
   * Extrai texto de um elemento XML
   */
  private extrairTexto(node: Element, tagName: string): string | undefined {
    const element = node.querySelector(tagName)
    return element?.textContent?.trim() || undefined
  }

  /**
   * Extrai endereço do local do acidente
   */
  private extrairEnderecoAcidente(node: Element): any {
    return {
      logradouro: this.extrairTexto(node, "dscLograd"),
      numero: this.extrairTexto(node, "nrLograd"),
      complemento: this.extrairTexto(node, "complemento"),
      bairro: this.extrairTexto(node, "bairro"),
      cep: this.extrairTexto(node, "cep"),
      municipio: this.extrairTexto(node, "codMunic"),
      uf: this.extrairTexto(node, "uf")
    }
  }

  /**
   * Extrai testemunhas do acidente
   */
  private extrairTestemunhas(node: Element): any[] {
    const testemunhas: any[] = []
    const testemunhaNodes = node.querySelectorAll("testemunha")
    
    testemunhaNodes.forEach(testNode => {
      testemunhas.push({
        nome: this.extrairTexto(testNode, "nmTestemunha"),
        cpf: this.extrairTexto(testNode, "cpfTestemunha")
      })
    })
    
    return testemunhas
  }

  /**
   * Extrai exames realizados
   */
  private extrairExamesRealizados(node: Element): any[] {
    const exames: any[] = []
    const exameNodes = node.querySelectorAll("exame")
    
    exameNodes.forEach(exameNode => {
      exames.push({
        codigo_exame: this.extrairTexto(exameNode, "codExame"),
        descricao: this.extrairTexto(exameNode, "dscExame"),
        resultado: this.extrairTexto(exameNode, "indResult")
      })
    })
    
    return exames
  }

  /**
   * Extrai agentes nocivos
   */
  private extrairAgentesNocivos(node: Element): any[] {
    const agentes: any[] = []
    const agenteNodes = node.querySelectorAll("agNoc")
    
    agenteNodes.forEach(agenteNode => {
      const codigoAgente = this.extrairTexto(agenteNode, "codAgNoc")
      agentes.push({
        codigo: codigoAgente,
        descricao: this.mapearDescricaoAgente(codigoAgente || ""),
        intensidade: this.extrairTexto(agenteNode, "intConc"),
        unidade: this.extrairTexto(agenteNode, "unMed"),
        tecnica_medicao: this.extrairTexto(agenteNode, "tecMedicao")
      })
    })
    
    return agentes
  }

  /**
   * Extrai equipamentos de proteção
   */
  private extrairEquipamentosProtecao(node: Element): any[] {
    const equipamentos: any[] = []
    const epiNodes = node.querySelectorAll("epi")
    
    epiNodes.forEach(epiNode => {
      equipamentos.push({
        codigo_ca: this.extrairTexto(epiNode, "codCA"),
        descricao: this.extrairTexto(epiNode, "dscEPI"),
        eficacia: this.extrairTexto(epiNode, "eficEpi") === "S"
      })
    })
    
    return equipamentos
  }

  /**
   * Mapeia código do agente para descrição
   */
  private mapearDescricaoAgente(codigo: string): string {
    const mapeamento: { [key: string]: string } = {
      "01.01.001": "Ruído contínuo ou intermitente",
      "01.01.002": "Ruído de impacto",
      "01.02.001": "Vibrações localizadas",
      "01.02.002": "Vibrações de corpo inteiro",
      "02.01.001": "Calor",
      "02.02.001": "Frio",
      "03.01.001": "Radiações ionizantes",
      "03.02.001": "Radiações não ionizantes",
      "04.01.001": "Benzeno",
      "04.01.002": "Amianto",
      "04.02.001": "Poeiras minerais",
      "04.03.001": "Agentes químicos diversos"
    }
    
    return mapeamento[codigo] || `Agente nocivo: ${codigo}`
  }

  /**
   * Converte eventos parseados para formato FuncionarioSST
   */
  converterParaFuncionariosSST(eventosParseados: ParsedEventoSST[]): FuncionarioSST[] {
    return eventosParseados
      .filter(evento => evento.validacao.valido)
      .map(evento => {
        const funcionario: FuncionarioSST = {
          cpf: evento.funcionario.cpf,
          nome: evento.funcionario.nome,
          matricula: evento.funcionario.matricula,
          cargo: evento.funcionario.cargo,
          categoria: evento.funcionario.categoria,
          origem_evento: evento.tipo_evento,
          detalhes: this.extrairDetalhesEspecificos(evento),
          data_evento: evento.data_evento,
          numero_recibo: evento.numero_recibo
        }
        
        return funcionario
      })
  }

  /**
   * Extrai detalhes específicos baseado no tipo de evento
   */
  private extrairDetalhesEspecificos(evento: ParsedEventoSST): any {
    switch (evento.tipo_evento) {
      case "S-2210":
        return {
          data_acidente: evento.dados_especificos.data_acidente,
          tipo_acidente: evento.dados_especificos.tipo_acidente,
          descricao_acidente: evento.dados_especificos.descricao_lesao
        }
      
      case "S-2220":
        return {
          tipo_exame: evento.dados_especificos.tipo_exame,
          data_exame: evento.dados_especificos.data_exame,
          resultado: evento.dados_especificos.resultado_exame,
          medico_responsavel: evento.dados_especificos.medico_responsavel?.nome
        }
      
      case "S-2240":
        return {
          agentes_nocivos: evento.dados_especificos.agentes_nocivos?.map((a: any) => a.descricao) || [],
          data_inicio: evento.dados_especificos.data_inicio_exposicao,
          data_fim: evento.dados_especificos.data_fim_exposicao,
          epi_utilizado: evento.dados_especificos.epi_utilizado
        }
      
      default:
        return {}
    }
  }
}