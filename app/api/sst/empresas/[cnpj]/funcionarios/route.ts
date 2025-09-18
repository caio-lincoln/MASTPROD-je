import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialPersistenciaFuncionarios } from "@/lib/esocial/persistencia-funcionarios"

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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    // Buscar empresa e verificar acesso do usuário
    const { data: empresaAccess, error: empresaError } = await supabase
      .from("empresas")
      .select(`
        id, 
        cnpj, 
        razao_social,
        usuario_empresas!inner(
          user_id,
          role
        )
      `)
      .eq("cnpj", cnpj)
      .eq("usuario_empresas.user_id", user.id)
      .single()

    if (empresaError || !empresaAccess) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou sem acesso" },
        { status: 404 }
      )
    }

    const empresa = {
      id: empresaAccess.id,
      cnpj: empresaAccess.cnpj,
      razao_social: empresaAccess.razao_social
    }

    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as "Ativo" | "Desligado" | null
    const nome = searchParams.get("nome")
    const cargo = searchParams.get("cargo")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100) // Máximo 100
    const offset = (page - 1) * limit

    // Validar status se fornecido
    if (status && !["Ativo", "Desligado"].includes(status)) {
      return NextResponse.json(
        { error: "Status deve ser 'Ativo' ou 'Desligado'" },
        { status: 400 }
      )
    }

    // Inicializar serviço de persistência de funcionários
    const persistenciaService = new EsocialPersistenciaFuncionarios(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar funcionários da tabela funcionarios
    const funcionarios = await persistenciaService.listarFuncionarios(empresa.id, {
      status: status === "Ativo" ? true : status === "Desligado" ? false : undefined,
      nome: nome || undefined,
      cargo: cargo || undefined,
      limite: limit,
      offset: offset
    })

    // Converter para formato da API
    const funcionariosFormatados = funcionarios.map(funcionario => ({
      cpf: funcionario.cpf,
      nome: funcionario.nome || "Nome não informado",
      matricula: funcionario.matricula_esocial || null,
      cargo: funcionario.cargo || "Cargo não informado",
      setor: funcionario.setor || "Setor não informado",
      admissao: funcionario.data_nascimento || null, // Usando data_nascimento como placeholder
      desligamento: null, // Campo não existe na tabela atual
      situacao: funcionario.status ? "Ativo" : "Desligado"
    }))

    // Obter estatísticas
    const estatisticas = await persistenciaService.obterEstatisticas(empresa.id)

    // Calcular informações de paginação
    const totalFiltrado = funcionariosFormatados.length
    const totalPages = Math.ceil(estatisticas.total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      data: funcionariosFormatados,
      pagination: {
        page,
        limit,
        total: estatisticas.total,
        total_filtered: totalFiltrado,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage
      },
      statistics: {
        total_funcionarios: estatisticas.total,
        funcionarios_ativos: estatisticas.ativos,
        funcionarios_desligados: estatisticas.inativos,
        ultima_sincronizacao: estatisticas.ultima_sincronizacao
      },
      filters_applied: {
        status,
        nome,
        cargo
      },
      empresa: {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social
      }
    })

  } catch (error) {
    console.error("Erro ao listar funcionários:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? error : undefined
      },
      { status: 500 }
    )
  }
}

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
      .select("id, cnpj, razao_social")
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
    const { data_inicio, data_fim, forcar_sincronizacao = false } = body

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

    // Verificar se já houve sincronização recente (últimas 2 horas)
    if (!forcar_sincronizacao && empresa.ultima_sincronizacao_esocial) {
      const ultimaSincronizacao = new Date(empresa.ultima_sincronizacao_esocial)
      const agora = new Date()
      const diferencaHoras = (agora.getTime() - ultimaSincronizacao.getTime()) / (1000 * 60 * 60)

      if (diferencaHoras < 2) {
        return NextResponse.json(
          { 
            error: "Sincronização já realizada nas últimas 2 horas. Use 'forcar_sincronizacao: true' para forçar.",
            ultima_sincronizacao: empresa.ultima_sincronizacao_esocial
          },
          { status: 429 }
        )
      }
    }

    // Inicializar serviço de funcionários
    const funcionariosService = new EsocialFuncionariosService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Executar sincronização
    const resultado = await funcionariosService.sincronizarFuncionarios(
      cnpj,
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

    if (resultado.sucesso) {
      return NextResponse.json({
        success: true,
        message: "Sincronização concluída com sucesso",
        resultado: {
          funcionarios_processados: resultado.funcionarios_processados,
          funcionarios_novos: resultado.funcionarios_novos,
          funcionarios_atualizados: resultado.funcionarios_atualizados,
          tempo_execucao_ms: resultado.tempo_execucao,
          erros: resultado.erros
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Sincronização concluída com erros",
        resultado: {
          funcionarios_processados: resultado.funcionarios_processados,
          funcionarios_novos: resultado.funcionarios_novos,
          funcionarios_atualizados: resultado.funcionarios_atualizados,
          tempo_execucao_ms: resultado.tempo_execucao,
          erros: resultado.erros
        }
      }, { status: 207 }) // 207 Multi-Status
    }

  } catch (error) {
    console.error("Erro ao sincronizar funcionários:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor durante sincronização",
        details: process.env.NODE_ENV === "development" ? error : undefined
      },
      { status: 500 }
    )
  }
}