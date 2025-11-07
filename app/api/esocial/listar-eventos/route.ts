import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid, sanitizeString } from '@/lib/security/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const tipoEvento = searchParams.get('tipo_evento')
    const funcionarioId = searchParams.get('funcionario_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError) {
      console.error('Erro de autenticação:', authError)
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para continuar.' },
        { status: 401 }
      )
    }
    
    let query = supabase
      .from('eventos_esocial')
      .select(`
        *,
        funcionarios:funcionario_id (
          nome,
          cpf
        )
      `)

    // Aplicar filtros
    if (status) {
      query = query.eq('status', sanitizeString(status))
    }

    if (tipoEvento) {
      query = query.eq('tipo_evento', sanitizeString(tipoEvento))
    }

    if (funcionarioId) {
      if (!isUuid(funcionarioId)) {
        return NextResponse.json(
          { error: 'funcionario_id inválido' },
          { status: 400 }
        )
      }
      query = query.eq('funcionario_id', funcionarioId)
    }

    if (dataInicio) {
      query = query.gte('created_at', sanitizeString(dataInicio))
    }

    if (dataFim) {
      query = query.lte('created_at', sanitizeString(dataFim))
    }

    // Contar total de registros com filtros aplicados
    let countQuery = supabase
      .from('eventos_esocial')
      .select('id', { count: 'exact', head: true })

    if (status) {
      countQuery = countQuery.eq('status', sanitizeString(status))
    }

    if (tipoEvento) {
      countQuery = countQuery.eq('tipo_evento', sanitizeString(tipoEvento))
    }

    if (funcionarioId) {
      if (!isUuid(funcionarioId)) {
        return NextResponse.json(
          { error: 'funcionario_id inválido' },
          { status: 400 }
        )
      }
      countQuery = countQuery.eq('funcionario_id', funcionarioId)
    }

    if (dataInicio) {
      countQuery = countQuery.gte('created_at', sanitizeString(dataInicio))
    }

    if (dataFim) {
      countQuery = countQuery.lte('created_at', sanitizeString(dataFim))
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Erro ao contar eventos:', countError)
      return NextResponse.json(
        { error: 'Erro ao contar eventos' },
        { status: 500 }
      )
    }

    // Buscar eventos com paginação
    const { data: eventos, error: eventosError } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (eventosError) {
      console.error('Erro ao buscar eventos:', eventosError)
      return NextResponse.json(
        { error: 'Erro ao buscar eventos' },
        { status: 500 }
      )
    }

    // Log de auditoria da listagem
    await supabase.from('logs_auditoria').insert({
      user_id: user.id,
      empresa_id: null,
      acao: 'listar_eventos_esocial',
      entidade: 'esocial_eventos',
      entidade_id: null,
      descricao: 'Listagem de eventos do eSocial com filtros e paginação',
      dados_novos: {
        page,
        limit,
        status: status ? sanitizeString(status) : null,
        tipo_evento: tipoEvento ? sanitizeString(tipoEvento) : null,
        funcionario_id: funcionarioId || null,
        data_inicio: dataInicio ? sanitizeString(dataInicio) : null,
        data_fim: dataFim ? sanitizeString(dataFim) : null,
      },
      created_at: new Date().toISOString(),
    })

    // Buscar estatísticas
    const { data: stats, error: statsError } = await supabase
      .from('eventos_esocial')
      .select('status')

    if (statsError) {
      console.error('Erro ao buscar estatísticas:', statsError)
    }

    const estatisticas = stats?.reduce((acc, evento) => {
      acc[evento.status] = (acc[evento.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      success: true,
      eventos: eventos || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      estatisticas
    })

  } catch (error) {
    console.error('Erro ao listar eventos eSocial:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
