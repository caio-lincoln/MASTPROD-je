import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { EsocialConsultaEventosSST } from "@/lib/esocial/consulta-eventos-sst"
import { EsocialParserEventosSST } from "@/lib/esocial/parser-eventos-sst"
import { EsocialConfig } from "@/lib/esocial/types"

interface RouteParams {
  params: {
    cnpj: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { cnpj } = params
    const { searchParams } = new URL(request.url)
    
    // Parâmetros opcionais
    const dataInicio = searchParams.get("data_inicio") || "2024-01-01"
    const dataFim = searchParams.get("data_fim") || new Date().toISOString().split('T')[0]
    const sincronizar = searchParams.get("sincronizar") === "true"
    const origemEvento = searchParams.get("origem_evento") // Filtro por tipo de evento

    console.log(`🔍 Consultando funcionários SST para CNPJ: ${cnpj}`)

    // Configurar cliente Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Buscar empresa pelo CNPJ
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id, nome, cnpj")
      .eq("cnpj", cnpj)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem acesso à empresa
    const { data: usuarioEmpresa, error: acessoError } = await supabase
      .from("usuario_empresas")
      .select("id")
      .eq("user_id", user.id)
      .eq("empresa_id", empresa.id)
      .single()

    if (acessoError || !usuarioEmpresa) {
      return NextResponse.json(
        { error: "Acesso negado à empresa" },
        { status: 403 }
      )
    }

    // Se sincronizar=true, buscar novos dados do eSocial
    if (sincronizar) {
      try {
        console.log("🔄 Sincronizando dados do eSocial...")
        await sincronizarEventosSST(empresa.id, cnpj, dataInicio, dataFim)
      } catch (syncError) {
        console.error("❌ Erro na sincronização:", syncError)
        // Continuar mesmo com erro de sincronização
      }
    }

    // Buscar funcionários SST do banco
    let query = supabase
      .from("funcionarios_sst")
      .select("*")
      .eq("empresa_id", empresa.id)
      .gte("data_evento", dataInicio)
      .lte("data_evento", dataFim)
      .order("data_evento", { ascending: false })

    // Aplicar filtro por origem do evento se especificado
    if (origemEvento && ["S-2210", "S-2220", "S-2240"].includes(origemEvento)) {
      query = query.eq("origem_evento", origemEvento)
    }

    const { data: funcionariosSST, error: funcionariosError } = await query

    if (funcionariosError) {
      console.error("❌ Erro ao buscar funcionários SST:", funcionariosError)
      return NextResponse.json(
        { error: "Erro ao buscar funcionários SST" },
        { status: 500 }
      )
    }

    // Formatar resposta conforme especificação
    const funcionariosFormatados = funcionariosSST?.map(funcionario => ({
      cpf: funcionario.cpf,
      nome: funcionario.nome,
      matricula: funcionario.matricula,
      cargo: funcionario.cargo,
      categoria: funcionario.categoria,
      origem_evento: funcionario.origem_evento,
      detalhes: funcionario.detalhes,
      data_evento: funcionario.data_evento,
      numero_recibo: funcionario.numero_recibo
    })) || []

    // Estatísticas
    const estatisticas = {
      total_funcionarios: funcionariosFormatados.length,
      por_evento: {
        "S-2210": funcionariosFormatados.filter(f => f.origem_evento === "S-2210").length,
        "S-2220": funcionariosFormatados.filter(f => f.origem_evento === "S-2220").length,
        "S-2240": funcionariosFormatados.filter(f => f.origem_evento === "S-2240").length
      },
      periodo_consulta: {
        data_inicio: dataInicio,
        data_fim: dataFim
      }
    }

    console.log(`✅ ${funcionariosFormatados.length} funcionários SST encontrados`)

    return NextResponse.json({
      sucesso: true,
      funcionarios: funcionariosFormatados,
      estatisticas,
      empresa: {
        cnpj: empresa.cnpj,
        nome: empresa.nome
      },
      metadados: {
        data_consulta: new Date().toISOString(),
        sincronizado: sincronizar,
        filtros_aplicados: {
          origem_evento: origemEvento || "todos",
          periodo: `${dataInicio} a ${dataFim}`
        }
      }
    })

  } catch (error) {
    console.error("❌ Erro geral no endpoint:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        detalhes: String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Sincroniza eventos SST do eSocial
 */
async function sincronizarEventosSST(
  empresaId: string,
  cnpj: string,
  dataInicio: string,
  dataFim: string
): Promise<void> {
  try {
    // Configurar cliente Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Buscar configuração do eSocial
    const { data: config, error: configError } = await supabase
      .from("esocial_config")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .single()

    if (configError || !config) {
      throw new Error("Configuração do eSocial não encontrada")
    }

    // Criar configuração para consulta
    const esocialConfig: EsocialConfig = {
      cnpj: cnpj,
      ambiente: config.ambiente as "producao" | "homologacao",
      certificado: {
        tipo: config.certificado_tipo as "A1" | "A3",
        arquivo: config.certificado_arquivo,
        senha: config.certificado_senha_encrypted, // Descriptografar em produção
        thumbprint: config.certificado_thumbprint
      },
      urls: {
        consultaEventos: config.ambiente === "producao" 
          ? "https://webservices.producao.esocial.gov.br/servicos/empregador/consultareventos/WsConsultarEventos.svc"
          : "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultareventos/WsConsultarEventos.svc"
      }
    }

    // Consultar eventos SST
    const consultaSST = new EsocialConsultaEventosSST(esocialConfig)
    const resultadoConsulta = await consultaSST.consultarEventosSST(dataInicio, dataFim)

    if (!resultadoConsulta.sucesso) {
      throw new Error(`Erro na consulta: ${resultadoConsulta.erros?.map(e => e.descricao).join(", ")}`)
    }

    // Salvar funcionários no banco
    if (resultadoConsulta.funcionarios_sst.length > 0) {
      await consultaSST.salvarFuncionariosSST(resultadoConsulta.funcionarios_sst, empresaId)
    }

    // Registrar log da sincronização
    await supabase
      .from("logs_esocial")
      .insert({
        empresa_id: empresaId,
        tipo: "SINCRONIZACAO_SST",
        descricao: `Sincronização de eventos SST concluída: ${resultadoConsulta.total_eventos_processados} eventos processados`,
        detalhes: {
          periodo: { data_inicio: dataInicio, data_fim: dataFim },
          estatisticas: resultadoConsulta.eventos_por_tipo,
          funcionarios_encontrados: resultadoConsulta.funcionarios_sst.length
        }
      })

    console.log(`✅ Sincronização SST concluída: ${resultadoConsulta.funcionarios_sst.length} funcionários`)

  } catch (error) {
    console.error("❌ Erro na sincronização SST:", error)
    
    // Registrar erro no log
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    await supabase
      .from("logs_esocial")
      .insert({
        empresa_id: empresaId,
        tipo: "ERRO_SINCRONIZACAO_SST",
        descricao: `Erro na sincronização de eventos SST: ${String(error)}`,
        detalhes: {
          periodo: { data_inicio: dataInicio, data_fim: dataFim },
          erro: String(error)
        }
      })

    throw error
  }
}

/**
 * Endpoint para forçar nova sincronização
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { cnpj } = params
    const body = await request.json()
    const { data_inicio, data_fim } = body

    if (!data_inicio || !data_fim) {
      return NextResponse.json(
        { error: "data_inicio e data_fim são obrigatórios" },
        { status: 400 }
      )
    }

    // Redirecionar para GET com sincronizar=true
    const url = new URL(request.url)
    url.searchParams.set("sincronizar", "true")
    url.searchParams.set("data_inicio", data_inicio)
    url.searchParams.set("data_fim", data_fim)

    return GET(new NextRequest(url), { params })

  } catch (error) {
    console.error("❌ Erro no POST:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}