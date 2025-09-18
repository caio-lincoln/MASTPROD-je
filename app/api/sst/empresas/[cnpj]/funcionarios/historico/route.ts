import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const cnpj = params.cnpj
    const { searchParams } = new URL(request.url)

    // Validar CNPJ
    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Deve conter 14 dígitos." },
        { status: 400 }
      )
    }

    // Parâmetros de consulta
    const cpf = searchParams.get("cpf")
    const tipoEvento = searchParams.get("tipo_evento")
    const dataInicio = searchParams.get("data_inicio")
    const dataFim = searchParams.get("data_fim")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = (page - 1) * limit

    // Verificar se a empresa existe e o usuário tem acesso
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id, cnpj, razao_social")
      .eq("cnpj", cnpj)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou sem acesso" },
        { status: 404 }
      )
    }

    // Construir query base
    let query = supabase
      .from("esocial_eventos")
      .select(`
        id,
        tipo_evento,
        cpf_funcionario,
        data_evento,
        numero_recibo,
        status_processamento,
        conteudo_xml,
        dados_funcionario,
        created_at,
        updated_at
      `)
      .eq("cnpj_empresa", cnpj)

    // Aplicar filtros
    if (cpf) {
      query = query.eq("cpf_funcionario", cpf)
    }

    if (tipoEvento) {
      query = query.eq("tipo_evento", tipoEvento)
    }

    if (dataInicio) {
      query = query.gte("data_evento", dataInicio)
    }

    if (dataFim) {
      query = query.lte("data_evento", dataFim)
    }

    // Executar query com paginação
    const { data: eventos, error: eventosError, count } = await query
      .order("data_evento", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (eventosError) {
      console.error("Erro ao buscar histórico de eventos:", eventosError)
      return NextResponse.json(
        { error: "Erro ao buscar histórico de eventos" },
        { status: 500 }
      )
    }

    // Buscar informações dos funcionários relacionados
    const cpfsUnicos = [...new Set(eventos?.map(e => e.cpf_funcionario).filter(Boolean))]
    
    let funcionariosInfo: any[] = []
    if (cpfsUnicos.length > 0) {
      const { data: funcionarios } = await supabase
        .from("esocial_funcionarios")
        .select("cpf, nome, matricula, cargo, situacao_atual")
        .eq("cnpj_empresa", cnpj)
        .in("cpf", cpfsUnicos)

      funcionariosInfo = funcionarios || []
    }

    // Mapear funcionários por CPF para facilitar lookup
    const funcionariosMap = new Map(
      funcionariosInfo.map(f => [f.cpf, f])
    )

    // Enriquecer eventos com informações dos funcionários
    const eventosEnriquecidos = eventos?.map(evento => {
      const funcionario = funcionariosMap.get(evento.cpf_funcionario)
      
      return {
        id: evento.id,
        tipo_evento: evento.tipo_evento,
        cpf_funcionario: evento.cpf_funcionario,
        nome_funcionario: funcionario?.nome || evento.dados_funcionario?.nome || "Não informado",
        matricula_funcionario: funcionario?.matricula || evento.dados_funcionario?.matricula || null,
        cargo_funcionario: funcionario?.cargo || evento.dados_funcionario?.cargo || null,
        situacao_atual: funcionario?.situacao_atual || null,
        data_evento: evento.data_evento,
        numero_recibo: evento.numero_recibo,
        status_processamento: evento.status_processamento,
        tem_xml: !!evento.conteudo_xml,
        dados_evento: evento.dados_funcionario,
        processado_em: evento.created_at,
        atualizado_em: evento.updated_at
      }
    }) || []

    // Calcular estatísticas do período consultado
    const estatisticas = {
      total_eventos: count || 0,
      eventos_por_tipo: {} as Record<string, number>,
      funcionarios_afetados: cpfsUnicos.length,
      periodo: {
        data_inicio: dataInicio || null,
        data_fim: dataFim || null
      }
    }

    // Contar eventos por tipo
    eventosEnriquecidos.forEach(evento => {
      const tipo = evento.tipo_evento
      estatisticas.eventos_por_tipo[tipo] = (estatisticas.eventos_por_tipo[tipo] || 0) + 1
    })

    // Informações de paginação
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      empresa: {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social
      },
      eventos: eventosEnriquecidos,
      estatisticas,
      paginacao: {
        pagina_atual: page,
        total_paginas: totalPages,
        total_registros: count || 0,
        registros_por_pagina: limit,
        tem_proxima_pagina: hasNextPage,
        tem_pagina_anterior: hasPrevPage
      },
      filtros_aplicados: {
        cpf,
        tipo_evento: tipoEvento,
        data_inicio: dataInicio,
        data_fim: dataFim
      },
      metadados: {
        gerado_em: new Date().toISOString(),
        tipos_evento_disponiveis: [
          "S-2200", // Admissão
          "S-2206", // Alteração contratual
          "S-2299", // Desligamento
          "S-2300", // Trabalhador sem vínculo
          "S-2399"  // Término de TSV
        ]
      }
    })

  } catch (error) {
    console.error("Erro ao buscar histórico:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}