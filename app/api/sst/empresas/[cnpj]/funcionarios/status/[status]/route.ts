import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialPersistenciaFuncionarios } from "@/lib/esocial/persistencia-funcionarios"

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string; status: string } }
) {
  try {
    const { cnpj, status } = params
    
    // Validar CNPJ
    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido" },
        { status: 400 }
      )
    }

    // Validar status
    const statusValidos = ['ativo', 'inativo', 'todos']
    if (!statusValidos.includes(status)) {
      return NextResponse.json(
        { error: "Status inválido. Use: ativo, inativo ou todos" },
        { status: 400 }
      )
    }

    // Autenticar usuário
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Verificar acesso à empresa
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id, cnpj, razao_social")
      .eq("cnpj", cnpj)
      .eq("user_id", user.id)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou sem acesso" },
        { status: 404 }
      )
    }

    // Obter parâmetros de consulta
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const search = searchParams.get("search") || ""
    const cargo = searchParams.get("cargo") || ""

    // Inicializar serviço de persistência
    const persistenciaService = new EsocialPersistenciaFuncionarios(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar funcionários
    const funcionarios = await persistenciaService.listarFuncionarios(
      empresa.id,
      {
        status: status === 'todos' ? undefined : status,
        search,
        cargo,
        page,
        limit
      }
    )

    // Obter estatísticas
    const estatisticas = await persistenciaService.obterEstatisticas(empresa.id)

    return NextResponse.json({
      success: true,
      empresa: {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social
      },
      filtros: {
        status,
        search,
        cargo,
        page,
        limit
      },
      funcionarios: funcionarios.map(funcionario => ({
        id: funcionario.id,
        nome: funcionario.nome,
        cpf: funcionario.cpf,
        matricula_esocial: funcionario.matricula_esocial,
        cargo: funcionario.cargo,
        categoria: funcionario.categoria,
        data_admissao: funcionario.data_admissao,
        data_desligamento: funcionario.data_desligamento,
        status: funcionario.status,
        created_at: funcionario.created_at,
        updated_at: funcionario.updated_at
      })),
      estatisticas: {
        total: estatisticas.total,
        ativos: estatisticas.ativos,
        inativos: estatisticas.inativos,
        admitidos_mes_atual: estatisticas.admitidos_mes_atual,
        desligados_mes_atual: estatisticas.desligados_mes_atual
      },
      paginacao: {
        pagina_atual: page,
        total_paginas: Math.ceil(estatisticas.total / limit),
        total_registros: estatisticas.total,
        registros_por_pagina: limit
      }
    })

  } catch (error) {
    console.error("Erro ao consultar funcionários por status:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}