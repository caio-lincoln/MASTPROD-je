import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialPersistenciaFuncionarios } from "@/lib/esocial/persistencia-funcionarios"

export async function POST(
  request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const cnpj = params.cnpj

    // Validar CNPJ
    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Deve conter 14 dígitos." },
        { status: 400 }
      )
    }

    // Verificar se a empresa existe e o usuário tem acesso
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id, cnpj, razao_social, ultima_sincronizacao_esocial")
      .eq("cnpj", cnpj)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou sem acesso" },
        { status: 404 }
      )
    }

    // Obter parâmetros da requisição
    const body = await request.json()
    const { 
      data_inicio, 
      data_fim, 
      forcar_sincronizacao = false,
      tipos_eventos = ["S-2200", "S-2206", "S-2299", "S-2300", "S-2399"]
    } = body

    // Validar tipos de eventos
    const tiposValidos = ["S-2200", "S-2206", "S-2299", "S-2300", "S-2399"]
    const tiposInvalidos = tipos_eventos.filter((tipo: string) => !tiposValidos.includes(tipo))
    
    if (tiposInvalidos.length > 0) {
      return NextResponse.json(
        { 
          error: `Tipos de eventos inválidos: ${tiposInvalidos.join(", ")}`,
          tipos_validos: tiposValidos
        },
        { status: 400 }
      )
    }

    // Buscar configuração do eSocial da empresa
    const { data: config, error: configError } = await supabase
      .from("esocial_config")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: "Configuração do eSocial não encontrada para esta empresa" },
        { status: 400 }
      )
    }

    // Verificar se já houve sincronização recente (últimas 30 minutos)
    if (!forcar_sincronizacao && empresa.ultima_sincronizacao_esocial) {
      const ultimaSincronizacao = new Date(empresa.ultima_sincronizacao_esocial)
      const agora = new Date()
      const diferencaMinutos = (agora.getTime() - ultimaSincronizacao.getTime()) / (1000 * 60)

      if (diferencaMinutos < 30) {
        return NextResponse.json(
          { 
            error: "Sincronização já realizada nos últimos 30 minutos. Use 'forcar_sincronizacao: true' para forçar.",
            ultima_sincronizacao: empresa.ultima_sincronizacao_esocial,
            proxima_sincronizacao_permitida: new Date(ultimaSincronizacao.getTime() + 30 * 60 * 1000).toISOString()
          },
          { status: 429 }
        )
      }
    }

    // Registrar início da sincronização
    const { data: logSincronizacao, error: logError } = await supabase
      .from("logs_esocial")
      .insert({
        empresa_id: empresa.id,
        operacao: "sincronizacao_funcionarios",
        status: "iniciado",
        detalhes: {
          cnpj,
          data_inicio,
          data_fim,
          tipos_eventos,
          forcar_sincronizacao
        }
      })
      .select()
      .single()

    if (logError) {
      console.error("Erro ao criar log de sincronização:", logError)
    }

    try {
      // Inicializar serviço de persistência de funcionários
      const persistenciaService = new EsocialPersistenciaFuncionarios(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Executar sincronização
      const resultado = await persistenciaService.sincronizarFuncionarios(
        cnpj,
        empresa.id,
        {
          certificado: config.certificado_path,
          senha: config.certificado_senha,
          ambiente: config.ambiente as "producao" | "producao-restrita",
          urls: {
            recepcaoLote: config.url_recepcao_lote,
            consultaLote: config.url_consulta_lote,
            downloadEvento: config.url_download_evento,
            consultaEventos: config.url_consulta_eventos
          }
        },
        data_inicio,
        data_fim
      )

      // Atualizar log de sincronização
      if (logSincronizacao) {
        await supabase
          .from("logs_esocial")
          .update({
            status: resultado.sucesso ? "concluido" : "erro",
            detalhes: {
              ...logSincronizacao.detalhes,
              resultado: {
                funcionarios_processados: resultado.funcionarios_processados,
                funcionarios_novos: resultado.funcionarios_novos,
                funcionarios_atualizados: resultado.funcionarios_atualizados,
                tempo_execucao_ms: resultado.tempo_execucao,
                erros: resultado.erros
              }
            },
            processado_em: new Date().toISOString()
          })
          .eq("id", logSincronizacao.id)
      }

      // Obter estatísticas atualizadas
      const estatisticas = await persistenciaService.obterEstatisticas(empresa.id)

      if (resultado.sucesso) {
        return NextResponse.json({
          success: true,
          message: "Sincronização concluída com sucesso",
          sincronizacao: {
            funcionarios_processados: resultado.funcionarios_processados,
            funcionarios_novos: resultado.funcionarios_novos,
            funcionarios_atualizados: resultado.funcionarios_atualizados,
            tempo_execucao_ms: resultado.tempo_execucao,
            erros: resultado.erros.length > 0 ? resultado.erros : undefined
          },
          estatisticas_atualizadas: estatisticas,
          log_id: logSincronizacao?.id
        })
      } else {
        return NextResponse.json({
          success: false,
          message: "Sincronização concluída com erros",
          sincronizacao: {
            funcionarios_processados: resultado.funcionarios_processados,
            funcionarios_novos: resultado.funcionarios_novos,
            funcionarios_atualizados: resultado.funcionarios_atualizados,
            tempo_execucao_ms: resultado.tempo_execucao,
            erros: resultado.erros
          },
          estatisticas_atualizadas: estatisticas,
          log_id: logSincronizacao?.id
        }, { status: 207 }) // 207 Multi-Status
      }

    } catch (syncError) {
      // Atualizar log com erro
      if (logSincronizacao) {
        await supabase
          .from("logs_esocial")
          .update({
            status: "erro",
            detalhes: {
              ...logSincronizacao.detalhes,
              erro: String(syncError)
            },
            processado_em: new Date().toISOString()
          })
          .eq("id", logSincronizacao.id)
      }

      throw syncError
    }

  } catch (error) {
    console.error("Erro ao sincronizar funcionários:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor durante sincronização",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const cnpj = params.cnpj

    // Validar CNPJ
    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Deve conter 14 dígitos." },
        { status: 400 }
      )
    }

    // Verificar se a empresa existe
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id, cnpj, razao_social, ultima_sincronizacao_esocial")
      .eq("cnpj", cnpj)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou sem acesso" },
        { status: 404 }
      )
    }

    // Buscar histórico de sincronizações
    const { data: logs, error: logsError } = await supabase
      .from("logs_esocial")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("operacao", "sincronizacao_funcionarios")
      .order("created_at", { ascending: false })
      .limit(10)

    if (logsError) {
      console.error("Erro ao buscar logs:", logsError)
    }

    // Verificar se há sincronização em andamento
    const sincronizacaoEmAndamento = logs?.find(log => log.status === "iniciado")

    // Calcular próxima sincronização permitida
    let proximaSincronizacaoPermitida = null
    if (empresa.ultima_sincronizacao_esocial) {
      const ultimaSincronizacao = new Date(empresa.ultima_sincronizacao_esocial)
      proximaSincronizacaoPermitida = new Date(ultimaSincronizacao.getTime() + 30 * 60 * 1000)
    }

    return NextResponse.json({
      success: true,
      empresa: {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social,
        ultima_sincronizacao: empresa.ultima_sincronizacao_esocial
      },
      status_sincronizacao: {
        em_andamento: !!sincronizacaoEmAndamento,
        proxima_permitida: proximaSincronizacaoPermitida,
        pode_sincronizar: !sincronizacaoEmAndamento && 
          (!proximaSincronizacaoPermitida || new Date() > proximaSincronizacaoPermitida)
      },
      historico_sincronizacoes: logs?.map(log => ({
        id: log.id,
        status: log.status,
        iniciado_em: log.created_at,
        concluido_em: log.processado_em,
        resultado: log.detalhes?.resultado
      })) || []
    })

  } catch (error) {
    console.error("Erro ao consultar status de sincronização:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}