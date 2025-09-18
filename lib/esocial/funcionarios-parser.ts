import { EventoFuncionario } from "./consulta-funcionarios"

export interface DadosFuncionarioCompleto {
  cpf: string
  nome: string
  matricula?: string
  cargo?: string
  categoria?: string
  data_admissao?: string
  data_desligamento?: string
  situacao: "Ativo" | "Desligado"
  historico_eventos: EventoFuncionario[]
  ultimo_evento: EventoFuncionario
}

export class EsocialFuncionariosParser {
  
  /**
   * Consolida eventos de funcionários em uma lista única
   * Remove duplicatas e mantém apenas o estado mais atual de cada funcionário
   */
  static consolidarFuncionarios(eventos: EventoFuncionario[]): DadosFuncionarioCompleto[] {
    const funcionariosPorCpf = new Map<string, EventoFuncionario[]>()

    // Agrupar eventos por CPF
    eventos.forEach(evento => {
      if (!evento.cpf) return

      if (!funcionariosPorCpf.has(evento.cpf)) {
        funcionariosPorCpf.set(evento.cpf, [])
      }
      funcionariosPorCpf.get(evento.cpf)!.push(evento)
    })

    const funcionariosConsolidados: DadosFuncionarioCompleto[] = []

    // Processar cada funcionário
    funcionariosPorCpf.forEach((eventosDoFuncionario, cpf) => {
      const funcionarioConsolidado = this.consolidarEventosFuncionario(
        cpf,
        eventosDoFuncionario
      )
      if (funcionarioConsolidado) {
        funcionariosConsolidados.push(funcionarioConsolidado)
      }
    })

    return funcionariosConsolidados.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  /**
   * Consolida eventos de um funcionário específico
   */
  private static consolidarEventosFuncionario(
    cpf: string,
    eventos: EventoFuncionario[]
  ): DadosFuncionarioCompleto | null {
    if (eventos.length === 0) return null

    // Ordenar eventos por data
    const eventosOrdenados = eventos.sort((a, b) => 
      new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime()
    )

    const ultimoEvento = eventosOrdenados[eventosOrdenados.length - 1]
    
    // Construir dados consolidados
    let dadosConsolidados: Partial<DadosFuncionarioCompleto> = {
      cpf,
      historico_eventos: eventosOrdenados,
      ultimo_evento: ultimoEvento
    }

    // Processar cada evento para construir o estado atual
    eventosOrdenados.forEach(evento => {
      // Nome (geralmente vem no S-2200 ou S-2300)
      if (evento.nome && !dadosConsolidados.nome) {
        dadosConsolidados.nome = evento.nome
      }

      // Matrícula (pode ser atualizada em S-2206)
      if (evento.matricula) {
        dadosConsolidados.matricula = evento.matricula
      }

      // Cargo (pode ser atualizado em S-2206)
      if (evento.cargo) {
        dadosConsolidados.cargo = evento.cargo
      }

      // Categoria (pode ser atualizada em S-2206)
      if (evento.categoria) {
        dadosConsolidados.categoria = evento.categoria
      }

      // Data de admissão (S-2200 ou S-2300)
      if (evento.data_admissao && !dadosConsolidados.data_admissao) {
        dadosConsolidados.data_admissao = evento.data_admissao
      }

      // Data de desligamento (S-2299 ou S-2399)
      if (evento.data_desligamento) {
        dadosConsolidados.data_desligamento = evento.data_desligamento
      }
    })

    // Determinar situação atual
    dadosConsolidados.situacao = this.determinarSituacaoAtual(eventosOrdenados)

    return dadosConsolidados as DadosFuncionarioCompleto
  }

  /**
   * Determina a situação atual do funcionário baseado no histórico de eventos
   */
  private static determinarSituacaoAtual(eventos: EventoFuncionario[]): "Ativo" | "Desligado" {
    // Verificar se há eventos de desligamento
    const eventoDesligamento = eventos.find(e => 
      e.tipo === "S-2299" || e.tipo === "S-2399"
    )

    if (eventoDesligamento) {
      // Verificar se há eventos posteriores ao desligamento
      const dataDesligamento = new Date(eventoDesligamento.data_evento)
      const eventosPosteriores = eventos.filter(e => 
        new Date(e.data_evento) > dataDesligamento &&
        (e.tipo === "S-2200" || e.tipo === "S-2300")
      )

      // Se há eventos de admissão posteriores, funcionário está ativo
      return eventosPosteriores.length > 0 ? "Ativo" : "Desligado"
    }

    // Se não há eventos de desligamento, funcionário está ativo
    return "Ativo"
  }

  /**
   * Filtra funcionários por situação
   */
  static filtrarPorSituacao(
    funcionarios: DadosFuncionarioCompleto[],
    situacao?: "Ativo" | "Desligado"
  ): DadosFuncionarioCompleto[] {
    if (!situacao) return funcionarios
    return funcionarios.filter(f => f.situacao === situacao)
  }

  /**
   * Converte dados consolidados para formato de API
   */
  static converterParaFormatoAPI(funcionarios: DadosFuncionarioCompleto[]) {
    return funcionarios.map(funcionario => ({
      cpf: funcionario.cpf,
      nome: funcionario.nome || "Nome não informado",
      matricula: funcionario.matricula || null,
      cargo: funcionario.cargo || "Cargo não informado",
      categoria: funcionario.categoria || "Categoria não informada",
      admissao: funcionario.data_admissao || null,
      desligamento: funcionario.data_desligamento || null,
      situacao: funcionario.situacao
    }))
  }

  /**
   * Gera hash dos dados para controle de mudanças
   */
  static gerarHashDados(funcionario: DadosFuncionarioCompleto): string {
    const dadosParaHash = {
      cpf: funcionario.cpf,
      nome: funcionario.nome,
      matricula: funcionario.matricula,
      cargo: funcionario.cargo,
      categoria: funcionario.categoria,
      data_admissao: funcionario.data_admissao,
      data_desligamento: funcionario.data_desligamento,
      situacao: funcionario.situacao
    }

    // Simples hash MD5 (em produção, usar biblioteca crypto)
    return btoa(JSON.stringify(dadosParaHash))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
  }

  /**
   * Valida dados obrigatórios do funcionário
   */
  static validarDadosFuncionario(funcionario: DadosFuncionarioCompleto): {
    valido: boolean
    erros: string[]
  } {
    const erros: string[] = []

    if (!funcionario.cpf || funcionario.cpf.length !== 11) {
      erros.push("CPF inválido ou não informado")
    }

    if (!funcionario.nome || funcionario.nome.trim().length === 0) {
      erros.push("Nome não informado")
    }

    if (funcionario.situacao === "Ativo" && !funcionario.data_admissao) {
      erros.push("Data de admissão obrigatória para funcionários ativos")
    }

    if (funcionario.situacao === "Desligado" && !funcionario.data_desligamento) {
      erros.push("Data de desligamento obrigatória para funcionários desligados")
    }

    return {
      valido: erros.length === 0,
      erros
    }
  }
}