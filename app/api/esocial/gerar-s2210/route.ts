import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialEventManager } from "@/lib/esocial/event-manager"
import { EsocialXmlBuilder } from "@/lib/esocial/xml-builder"
import { isUuid } from "@/lib/security/validation"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { empresa_id, incidente_id } = await request.json()

    if (!empresa_id || !incidente_id) {
      return NextResponse.json(
        { error: "empresa_id e incidente_id são obrigatórios" },
        { status: 400 }
      )
    }

    // Validação básica contra SQL Injection e entradas inválidas
    if (!isUuid(empresa_id) || !isUuid(incidente_id)) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      )
    }

    // Buscar dados do incidente
    const { data: incidente, error: incidenteError } = await supabase
      .from("incidentes")
      .select(`
        *,
        funcionarios (
          *,
          empresas (*)
        )
      `)
      .eq("id", incidente_id)
      .eq("empresa_id", empresa_id)
      .single()

    if (incidenteError || !incidente) {
      return NextResponse.json(
        { error: "Incidente não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se já existe evento para este incidente
    const { data: eventoExistente } = await supabase
      .from("eventos_esocial")
      .select("id")
      .eq("incidente_id", incidente_id)
      .eq("tipo_evento", "S-2210")
      .single()

    if (eventoExistente) {
      return NextResponse.json(
        { error: "Já existe um evento S-2210 para este incidente" },
        { status: 400 }
      )
    }

    // Buscar dados adicionais do acidente
    const { data: detalhesAcidente, error: detalhesError } = await supabase
      .from("acidentes_trabalho")
      .select("*")
      .eq("incidente_id", incidente_id)
      .single()

    if (detalhesError) {
      console.error("Erro ao buscar detalhes do acidente:", detalhesError)
    }

    // Gerar XML do evento (ambiente de produção)
    const xmlBuilder = new EsocialXmlBuilder({ ambiente: "producao" })
    const xmlContent = await xmlBuilder.gerarS2210({
      incidente,
      detalhes_acidente: detalhesAcidente
    })

    // Criar evento no banco
    const eventManager = new EsocialEventManager()
    const evento = await eventManager.criarEvento({
      tipo_evento: "S-2210",
      empresa_id,
      funcionario_id: incidente.funcionario_id,
      incidente_id,
      xml_content: xmlContent,
      status: "preparando",
      dados_evento: {
        tipo_incidente: incidente.tipo_incidente,
        data_ocorrencia: incidente.data_ocorrencia,
        local_acidente: incidente.local_acidente,
        descricao: incidente.descricao,
        gravidade: incidente.gravidade,
        parte_corpo_atingida: detalhesAcidente?.parte_corpo_atingida,
        agente_causador: detalhesAcidente?.agente_causador,
        situacao_geradora: detalhesAcidente?.situacao_geradora,
        houve_afastamento: detalhesAcidente?.houve_afastamento,
        dias_afastamento: detalhesAcidente?.dias_afastamento,
      }
    })

    return NextResponse.json({
      success: true,
      evento_id: evento.id,
      message: "Evento S-2210 gerado com sucesso"
    })

  } catch (error) {
    console.error("Erro ao gerar evento S-2210:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
