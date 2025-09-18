import { EsocialFuncionariosService } from "./funcionarios-service"
import { EsocialConsultaFuncionarios } from "./consulta-funcionarios"
import { EsocialFuncionariosParser } from "./funcionarios-parser"

export interface SyncJob {
  id: string
  cnpj: string
  empresa_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  tipo: 'manual' | 'automatica'
  iniciado_em?: Date
  finalizado_em?: Date
  erro?: string
  estatisticas?: {
    eventos_processados: number
    funcionarios_atualizados: number
    funcionarios_novos: number
    tempo_execucao_ms: number
  }
}

export class EsocialSyncScheduler {
  private jobs: Map<string, SyncJob> = new Map()
  private runningJobs: Set<string> = new Set()
  private maxConcurrentJobs = 3
  private defaultSyncInterval = 6 * 60 * 60 * 1000 // 6 horas em ms

  constructor(
    private supabaseUrl: string,
    private supabaseServiceKey: string
  ) {}

  /**
   * Agenda uma sincronização manual
   */
  async agendarSincronizacaoManual(cnpj: string, empresaId: string): Promise<string> {
    const jobId = `manual_${cnpj}_${Date.now()}`
    
    const job: SyncJob = {
      id: jobId,
      cnpj,
      empresa_id: empresaId,
      status: 'pending',
      tipo: 'manual'
    }

    this.jobs.set(jobId, job)
    
    // Executar imediatamente se houver slot disponível
    if (this.runningJobs.size < this.maxConcurrentJobs) {
      this.executarJob(jobId)
    }

    return jobId
  }

  /**
   * Agenda sincronização automática para todas as empresas
   */
  async agendarSincronizacaoAutomatica(): Promise<string[]> {
    try {
      const funcionariosService = new EsocialFuncionariosService(
        this.supabaseUrl,
        this.supabaseServiceKey
      )

      // Buscar empresas que precisam de sincronização
      const empresas = await this.buscarEmpresasParaSincronizacao()
      const jobIds: string[] = []

      for (const empresa of empresas) {
        const jobId = `auto_${empresa.cnpj}_${Date.now()}`
        
        const job: SyncJob = {
          id: jobId,
          cnpj: empresa.cnpj,
          empresa_id: empresa.id,
          status: 'pending',
          tipo: 'automatica'
        }

        this.jobs.set(jobId, job)
        jobIds.push(jobId)

        // Executar se houver slot disponível
        if (this.runningJobs.size < this.maxConcurrentJobs) {
          this.executarJob(jobId)
        }
      }

      return jobIds
    } catch (error) {
      console.error("Erro ao agendar sincronização automática:", error)
      throw error
    }
  }

  /**
   * Executa um job de sincronização
   */
  private async executarJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job || this.runningJobs.has(jobId)) {
      return
    }

    this.runningJobs.add(jobId)
    job.status = 'running'
    job.iniciado_em = new Date()

    try {
      console.log(`Iniciando sincronização para empresa ${job.cnpj} (Job: ${jobId})`)

      const startTime = Date.now()
      
      // Inicializar serviços
      const funcionariosService = new EsocialFuncionariosService(
        this.supabaseUrl,
        this.supabaseServiceKey
      )

      const consultaService = new EsocialConsultaFuncionarios(
        this.supabaseUrl,
        this.supabaseServiceKey
      )

      const parser = new EsocialFuncionariosParser()

      // Buscar configuração da empresa
      const config = await this.buscarConfiguracaoEmpresa(job.cnpj)
      if (!config) {
        throw new Error(`Configuração não encontrada para empresa ${job.cnpj}`)
      }

      // Consultar eventos do eSocial
      console.log(`Consultando eventos do eSocial para ${job.cnpj}`)
      const eventosResponse = await consultaService.consultarEventosFuncionarios(
        job.cnpj,
        config
      )

      if (!eventosResponse.success) {
        throw new Error(`Erro ao consultar eventos: ${eventosResponse.error}`)
      }

      // Processar eventos
      console.log(`Processando ${eventosResponse.eventos.length} eventos`)
      const funcionariosConsolidados = parser.consolidarEventos(eventosResponse.eventos)
      const funcionariosFormatados = funcionariosConsolidados.map(f => 
        parser.converterParaFormatoApi(f)
      )

      // Sincronizar com banco de dados
      console.log(`Sincronizando ${funcionariosFormatados.length} funcionários`)
      const resultadoSync = await funcionariosService.sincronizarFuncionarios(
        job.cnpj,
        funcionariosFormatados
      )

      // Salvar eventos no banco
      for (const evento of eventosResponse.eventos) {
        await funcionariosService.salvarEvento(job.cnpj, evento)
      }

      // Atualizar última sincronização
      await funcionariosService.atualizarUltimaSincronizacao(job.cnpj)

      const endTime = Date.now()
      const tempoExecucao = endTime - startTime

      // Atualizar estatísticas do job
      job.estatisticas = {
        eventos_processados: eventosResponse.eventos.length,
        funcionarios_atualizados: resultadoSync.atualizados,
        funcionarios_novos: resultadoSync.novos,
        tempo_execucao_ms: tempoExecucao
      }

      job.status = 'completed'
      job.finalizado_em = new Date()

      console.log(`Sincronização concluída para ${job.cnpj}:`, job.estatisticas)

    } catch (error) {
      console.error(`Erro na sincronização ${jobId}:`, error)
      job.status = 'failed'
      job.erro = String(error)
      job.finalizado_em = new Date()
    } finally {
      this.runningJobs.delete(jobId)
      
      // Processar próximo job na fila
      this.processarProximoJob()
    }
  }

  /**
   * Processa o próximo job pendente na fila
   */
  private processarProximoJob(): void {
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return
    }

    const jobPendente = Array.from(this.jobs.values())
      .find(job => job.status === 'pending')

    if (jobPendente) {
      this.executarJob(jobPendente.id)
    }
  }

  /**
   * Busca empresas que precisam de sincronização
   */
  private async buscarEmpresasParaSincronizacao(): Promise<Array<{id: string, cnpj: string}>> {
    // Implementar lógica para buscar empresas que:
    // 1. Não foram sincronizadas nas últimas 6 horas
    // 2. Têm configuração ativa do eSocial
    // 3. Não estão sendo processadas no momento
    
    // Por enquanto, retorna array vazio - implementar conforme necessário
    return []
  }

  /**
   * Busca configuração do eSocial para uma empresa
   */
  private async buscarConfiguracaoEmpresa(cnpj: string): Promise<any> {
    // Implementar busca da configuração do eSocial
    // Incluindo certificado, URLs dos web services, etc.
    
    // Por enquanto, retorna configuração mock
    return {
      certificado: process.env.ESOCIAL_CERTIFICADO,
      urls: {
        consultaEventos: process.env.ESOCIAL_URL_CONSULTA || "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc"
      }
    }
  }

  /**
   * Obtém status de um job
   */
  getJobStatus(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Lista todos os jobs
   */
  listarJobs(filtro?: { status?: SyncJob['status'], tipo?: SyncJob['tipo'] }): SyncJob[] {
    let jobs = Array.from(this.jobs.values())

    if (filtro?.status) {
      jobs = jobs.filter(job => job.status === filtro.status)
    }

    if (filtro?.tipo) {
      jobs = jobs.filter(job => job.tipo === filtro.tipo)
    }

    return jobs.sort((a, b) => {
      const dateA = a.iniciado_em || new Date(0)
      const dateB = b.iniciado_em || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
  }

  /**
   * Cancela um job pendente
   */
  cancelarJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'pending') {
      return false
    }

    this.jobs.delete(jobId)
    return true
  }

  /**
   * Limpa jobs antigos (mais de 24 horas)
   */
  limparJobsAntigos(): number {
    const agora = new Date()
    const limite = new Date(agora.getTime() - 24 * 60 * 60 * 1000) // 24 horas atrás
    
    let removidos = 0
    
    for (const [jobId, job] of this.jobs.entries()) {
      const dataReferencia = job.finalizado_em || job.iniciado_em
      
      if (dataReferencia && dataReferencia < limite && job.status !== 'running') {
        this.jobs.delete(jobId)
        removidos++
      }
    }

    return removidos
  }

  /**
   * Obtém estatísticas do scheduler
   */
  obterEstatisticas(): {
    jobs_pendentes: number
    jobs_executando: number
    jobs_concluidos: number
    jobs_falharam: number
    slots_disponiveis: number
  } {
    const jobs = Array.from(this.jobs.values())
    
    return {
      jobs_pendentes: jobs.filter(j => j.status === 'pending').length,
      jobs_executando: jobs.filter(j => j.status === 'running').length,
      jobs_concluidos: jobs.filter(j => j.status === 'completed').length,
      jobs_falharam: jobs.filter(j => j.status === 'failed').length,
      slots_disponiveis: this.maxConcurrentJobs - this.runningJobs.size
    }
  }
}