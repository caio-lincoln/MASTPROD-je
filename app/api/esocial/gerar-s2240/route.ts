import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialEventManager } from "@/lib/esocial/event-manager"
import { EsocialXmlBuilder } from "@/lib/esocial/xml-builder"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { empresa_id, funcionario_id } = await request.json()

    console.log(`[DEBUG API] Parâmetros recebidos - empresa_id: ${empresa_id}, funcionario_id: ${funcionario_id}`)

    if (!empresa_id || !funcionario_id) {
      return NextResponse.json(
        { error: "empresa_id e funcionario_id são obrigatórios" },
        { status: 400 }
      )
    }

    // Buscar dados do funcionário e condições ambientais
    const { data: funcionario, error: funcionarioError } = await supabase
      .from("funcionarios")
      .select(`
        *,
        empresas (*)
      `)
      .eq("id", funcionario_id)
      .eq("empresa_id", empresa_id)
      .single()

    console.log(`[DEBUG API] Resultado da consulta funcionário:`, { funcionario: funcionario?.id, funcionarioError })

    if (funcionarioError) {
      console.error(`[ERROR API] Erro na consulta:`, funcionarioError)
      return NextResponse.json(
        { error: `Erro ao buscar funcionário: ${funcionarioError.message}` },
        { status: 500 }
      )
    }

    if (!funcionario) {
      console.error(`[ERROR API] Funcionário não encontrado - ID: ${funcionario_id}, Empresa: ${empresa_id}`)
      return NextResponse.json(
        { error: `Funcionário não encontrado com ID ${funcionario_id} na empresa ${empresa_id}` },
        { status: 404 }
      )
    }

    // Buscar dados de exposição a riscos
    const { data: exposicaoRiscos, error: exposicaoError } = await supabase
      .from("exposicao_riscos")
      .select(`
        *,
        riscos_identificados (*)
      `)
      .eq("funcionario_id", funcionario_id)

    if (exposicaoError) {
      console.error("Erro ao buscar exposição a riscos:", exposicaoError)
    }

    // Verificar se já existe evento S-2240 ativo para este funcionário
    const { data: eventoExistente } = await supabase
      .from("eventos_esocial")
      .select("id")
      .eq("funcionario_id", funcionario_id)
      .eq("tipo_evento", "S-2240")
      .eq("status", "processado")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Gerar XML do evento
    const xmlBuilder = new EsocialXmlBuilder()
    const xmlContent = await xmlBuilder.gerarS2240({
      funcionario,
      exposicao_riscos: exposicaoRiscos || [],
      evento_existente: eventoExistente
    })

    // Criar evento no banco
    const eventManager = new EsocialEventManager()
    const evento = await eventManager.criarEvento({
      tipo_evento: "S-2240",
      empresa_id,
      funcionario_id,
      xml_content: xmlContent,
      status: "preparando",
      dados_evento: {
        cargo: funcionario.cargo,
        setor: funcionario.setor,
        data_admissao: funcionario.data_admissao,
        exposicao_riscos: exposicaoRiscos?.map(exp => ({
          tipo_risco: exp.riscos_identificados?.tipo_risco,
          agente: exp.riscos_identificados?.agente,
          intensidade: exp.intensidade,
          tecnica_medicao: exp.tecnica_medicao,
          epi_utilizado: exp.epi_utilizado,
        })) || []
      }
    })

    return NextResponse.json({
      success: true,
      evento_id: evento.id,
      message: "Evento S-2240 gerado com sucesso"
    })

  } catch (error) {
    console.error("Erro ao gerar evento S-2240:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}