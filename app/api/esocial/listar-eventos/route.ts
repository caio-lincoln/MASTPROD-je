import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    
    let query = supabase
      .from('esocial_eventos')
      .select(`
        *,
        funcionarios:funcionario_id (
          nome,
          cpf
        )
      `)

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
    }

    if (tipoEvento) {
      query = query.eq('tipo_evento', tipoEvento)
    }

    if (funcionarioId) {
      query = query.eq('funcionario_id', funcionarioId)
    }

    if (dataInicio) {
      query = query.gte('created_at', dataInicio)
    }

    if (dataFim) {
      query = query.lte('created_at', dataFim)
    }

    // Contar total de registros
    const { count, error: countError } = await supabase
      .from('esocial_eventos')
      .select('*', { count: 'exact', head: true })

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

    // Buscar estatísticas
    const { data: stats, error: statsError } = await supabase
      .from('esocial_eventos')
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