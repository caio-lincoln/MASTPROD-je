import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialSyncScheduler } from "@/lib/esocial/sync-scheduler"

// Instância global do scheduler (em produção, usar Redis ou similar)
let globalScheduler: EsocialSyncScheduler | null = null

function getScheduler(): EsocialSyncScheduler {
  if (!globalScheduler) {
    globalScheduler = new EsocialSyncScheduler(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return globalScheduler
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const scheduler = getScheduler()
    const jobId = searchParams.get("job_id")
    const status = searchParams.get("status") as any
    const tipo = searchParams.get("tipo") as any
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    // Se job_id específico foi solicitado
    if (jobId) {
      const job = scheduler.getJobStatus(jobId)
      if (!job) {
        return NextResponse.json(
          { error: "Job não encontrado" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        job
      })
    }

    // Listar jobs com filtros
    const jobs = scheduler.listarJobs({ status, tipo })
      .slice(0, limit)

    // Obter estatísticas gerais
    const estatisticas = scheduler.obterEstatisticas()

    // Buscar informações das empresas relacionadas aos jobs
    const cnpjs = [...new Set(jobs.map(job => job.cnpj))]
    let empresasInfo: any[] = []

    if (cnpjs.length > 0) {
      const { data: empresas } = await supabase
        .from("empresas")
        .select("cnpj, razao_social, ultima_sincronizacao_esocial")
        .in("cnpj", cnpjs)

      empresasInfo = empresas || []
    }

    // Mapear empresas por CNPJ
    const empresasMap = new Map(
      empresasInfo.map(e => [e.cnpj, e])
    )

    // Enriquecer jobs com informações das empresas
    const jobsEnriquecidos = jobs.map(job => {
      const empresa = empresasMap.get(job.cnpj)
      
      return {
        ...job,
        empresa: {
          cnpj: job.cnpj,
          razao_social: empresa?.razao_social || "Não informado",
          ultima_sincronizacao: empresa?.ultima_sincronizacao_esocial
        }
      }
    })

    return NextResponse.json({
      success: true,
      jobs: jobsEnriquecidos,
      estatisticas,
      metadados: {
        total_jobs: jobs.length,
        filtros_aplicados: {
          status,
          tipo,
          limit
        },
        gerado_em: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("Erro ao obter status das sincronizações:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { acao, job_id, cnpj } = body

    const scheduler = getScheduler()

    switch (acao) {
      case "agendar_manual":
        if (!cnpj) {
          return NextResponse.json(
            { error: "CNPJ é obrigatório para agendamento manual" },
            { status: 400 }
          )
        }

        // Verificar se a empresa existe e o usuário tem acesso
        const { data: empresa, error: empresaError } = await supabase
          .from("empresas")
          .select("id, cnpj")
          .eq("cnpj", cnpj)
          .single()

        if (empresaError || !empresa) {
          return NextResponse.json(
            { error: "Empresa não encontrada ou sem acesso" },
            { status: 404 }
          )
        }

        const jobId = await scheduler.agendarSincronizacaoManual(cnpj, empresa.id)
        
        return NextResponse.json({
          success: true,
          message: "Sincronização agendada com sucesso",
          job_id: jobId
        })

      case "agendar_automatica":
        const jobIds = await scheduler.agendarSincronizacaoAutomatica()
        
        return NextResponse.json({
          success: true,
          message: `${jobIds.length} sincronizações automáticas agendadas`,
          job_ids: jobIds
        })

      case "cancelar":
        if (!job_id) {
          return NextResponse.json(
            { error: "job_id é obrigatório para cancelamento" },
            { status: 400 }
          )
        }

        const cancelado = scheduler.cancelarJob(job_id)
        
        if (!cancelado) {
          return NextResponse.json(
            { error: "Job não encontrado ou não pode ser cancelado" },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: "Job cancelado com sucesso"
        })

      case "limpar_antigos":
        const removidos = scheduler.limparJobsAntigos()
        
        return NextResponse.json({
          success: true,
          message: `${removidos} jobs antigos removidos`
        })

      default:
        return NextResponse.json(
          { error: "Ação não reconhecida" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Erro ao processar ação de sincronização:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}