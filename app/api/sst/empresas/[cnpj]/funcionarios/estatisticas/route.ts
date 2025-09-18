import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialFuncionariosService } from "@/lib/esocial/funcionarios-service"

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

    // Inicializar serviço de funcionários
    const funcionariosService = new EsocialFuncionariosService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Obter estatísticas básicas
    const estatisticasBasicas = await funcionariosService.obterEstatisticas(cnpj)

    // Obter estatísticas detalhadas do banco
    const { data: estatisticasDetalhadas, error: detalhesError } = await supabase
      .rpc('obter_estatisticas_funcionarios_esocial', { cnpj_empresa: cnpj })

    if (detalhesError) {
      console.error("Erro ao obter estatísticas detalhadas:", detalhesError)
    }

    // Buscar distribuição por cargo
    const { data: distribuicaoCargos, error: cargosError } = await supabase
      .from("esocial_funcionarios")
      .select("cargo, situacao_atual")
      .eq("cnpj_empresa", cnpj)

    if (cargosError) {
      console.error("Erro ao buscar distribuição por cargos:", cargosError)
    }

    // Processar distribuição por cargo
    const cargosMap = new Map<string, { total: number; ativos: number; desligados: number }>()
    
    distribuicaoCargos?.forEach(funcionario => {
      const cargo = funcionario.cargo || "Não informado"
      if (!cargosMap.has(cargo)) {
        cargosMap.set(cargo, { total: 0, ativos: 0, desligados: 0 })
      }
      
      const stats = cargosMap.get(cargo)!
      stats.total++
      
      if (funcionario.situacao_atual === "Ativo") {
        stats.ativos++
      } else {
        stats.desligados++
      }
    })

    const distribuicaoPorCargo = Array.from(cargosMap.entries())
      .map(([cargo, stats]) => ({ cargo, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10) // Top 10 cargos

    // Buscar distribuição por categoria
    const { data: distribuicaoCategoria, error: categoriaError } = await supabase
      .from("esocial_funcionarios")
      .select("categoria, situacao_atual")
      .eq("cnpj_empresa", cnpj)

    if (categoriaError) {
      console.error("Erro ao buscar distribuição por categoria:", categoriaError)
    }

    // Processar distribuição por categoria
    const categoriaMap = new Map<string, { total: number; ativos: number; desligados: number }>()
    
    distribuicaoCategoria?.forEach(funcionario => {
      const categoria = funcionario.categoria || "Não informado"
      if (!categoriaMap.has(categoria)) {
        categoriaMap.set(categoria, { total: 0, ativos: 0, desligados: 0 })
      }
      
      const stats = categoriaMap.get(categoria)!
      stats.total++
      
      if (funcionario.situacao_atual === "Ativo") {
        stats.ativos++
      } else {
        stats.desligados++
      }
    })

    const distribuicaoPorCategoria = Array.from(categoriaMap.entries())
      .map(([categoria, stats]) => ({ categoria, ...stats }))
      .sort((a, b) => b.total - a.total)

    // Buscar eventos recentes
    const { data: eventosRecentes, error: eventosError } = await supabase
      .from("esocial_eventos")
      .select("tipo_evento, data_evento, cpf_funcionario")
      .eq("cnpj_empresa", cnpj)
      .order("data_evento", { ascending: false })
      .limit(50)

    if (eventosError) {
      console.error("Erro ao buscar eventos recentes:", eventosError)
    }

    // Processar eventos por tipo
    const eventosPorTipo = new Map<string, number>()
    eventosRecentes?.forEach(evento => {
      const tipo = evento.tipo_evento
      eventosPorTipo.set(tipo, (eventosPorTipo.get(tipo) || 0) + 1)
    })

    // Calcular tendências (últimos 30 dias vs 30 dias anteriores)
    const agora = new Date()
    const ultimos30Dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
    const anteriores30Dias = new Date(agora.getTime() - 60 * 24 * 60 * 60 * 1000)

    const { data: admissoesRecentes } = await supabase
      .from("esocial_funcionarios")
      .select("data_admissao")
      .eq("cnpj_empresa", cnpj)
      .gte("data_admissao", ultimos30Dias.toISOString().split('T')[0])

    const { data: admissoesAnteriores } = await supabase
      .from("esocial_funcionarios")
      .select("data_admissao")
      .eq("cnpj_empresa", cnpj)
      .gte("data_admissao", anteriores30Dias.toISOString().split('T')[0])
      .lt("data_admissao", ultimos30Dias.toISOString().split('T')[0])

    const { data: desligamentosRecentes } = await supabase
      .from("esocial_funcionarios")
      .select("data_desligamento")
      .eq("cnpj_empresa", cnpj)
      .gte("data_desligamento", ultimos30Dias.toISOString().split('T')[0])

    const { data: desligamentosAnteriores } = await supabase
      .from("esocial_funcionarios")
      .select("data_desligamento")
      .eq("cnpj_empresa", cnpj)
      .gte("data_desligamento", anteriores30Dias.toISOString().split('T')[0])
      .lt("data_desligamento", ultimos30Dias.toISOString().split('T')[0])

    const tendencias = {
      admissoes: {
        ultimos_30_dias: admissoesRecentes?.length || 0,
        anteriores_30_dias: admissoesAnteriores?.length || 0,
        variacao: ((admissoesRecentes?.length || 0) - (admissoesAnteriores?.length || 0))
      },
      desligamentos: {
        ultimos_30_dias: desligamentosRecentes?.length || 0,
        anteriores_30_dias: desligamentosAnteriores?.length || 0,
        variacao: ((desligamentosRecentes?.length || 0) - (desligamentosAnteriores?.length || 0))
      }
    }

    return NextResponse.json({
      success: true,
      empresa: {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social,
        ultima_sincronizacao: empresa.ultima_sincronizacao_esocial
      },
      estatisticas_gerais: {
        total_funcionarios: estatisticasBasicas.total,
        funcionarios_ativos: estatisticasBasicas.ativos,
        funcionarios_desligados: estatisticasBasicas.desligados,
        percentual_ativos: estatisticasBasicas.total > 0 
          ? Math.round((estatisticasBasicas.ativos / estatisticasBasicas.total) * 100) 
          : 0,
        percentual_desligados: estatisticasBasicas.total > 0 
          ? Math.round((estatisticasBasicas.desligados / estatisticasBasicas.total) * 100) 
          : 0
      },
      distribuicoes: {
        por_cargo: distribuicaoPorCargo,
        por_categoria: distribuicaoPorCategoria,
        por_tipo_evento: Array.from(eventosPorTipo.entries())
          .map(([tipo, quantidade]) => ({ tipo_evento: tipo, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade)
      },
      tendencias,
      qualidade_dados: {
        funcionarios_sem_cargo: distribuicaoCargos?.filter(f => !f.cargo || f.cargo.trim() === "").length || 0,
        funcionarios_sem_categoria: distribuicaoCategoria?.filter(f => !f.categoria || f.categoria.trim() === "").length || 0,
        percentual_completude: estatisticasBasicas.total > 0 
          ? Math.round(((estatisticasBasicas.total - (distribuicaoCargos?.filter(f => !f.cargo || f.cargo.trim() === "").length || 0)) / estatisticasBasicas.total) * 100)
          : 100
      },
      metadados: {
        gerado_em: new Date().toISOString(),
        periodo_analise: {
          inicio: anteriores30Dias.toISOString().split('T')[0],
          fim: agora.toISOString().split('T')[0]
        }
      }
    })

  } catch (error) {
    console.error("Erro ao obter estatísticas:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}