import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialService } from "@/lib/esocial/esocial-service"
import { isUuid } from "@/lib/security/validation"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    // Verificar usuário autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }
    const { empresa_id } = await request.json()

    if (!empresa_id) {
      return NextResponse.json(
        { error: "empresa_id é obrigatório" },
        { status: 400 }
      )
    }

    if (!isUuid(empresa_id)) {
      return NextResponse.json(
        { error: "Parâmetro inválido" },
        { status: 400 }
      )
    }

    // Buscar eventos enviados que ainda não foram processados
    const { data: eventos, error: eventosError } = await supabase
      .from("eventos_esocial")
      .select("*")
      .eq("empresa_id", empresa_id)
      .in("status", ["enviado", "processando"])
      .not("numero_recibo", "is", null)

    if (eventosError) {
      throw eventosError
    }

    if (!eventos || eventos.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum evento pendente de consulta",
        eventos_atualizados: 0
      })
    }

    // Buscar certificado da empresa
    const { data: certificado, error: certificadoError } = await supabase
      .from("certificados_esocial")
      .select("*")
      .eq("empresa_id", empresa_id)
      .eq("ativo", true)
      .single()

    if (certificadoError || !certificado) {
      return NextResponse.json(
        { error: "Certificado digital não encontrado ou inativo" },
        { status: 400 }
      )
    }

    const esocialService = new EsocialService()
    let eventosAtualizados = 0
    const resultados = []

    // Consultar status de cada evento
    for (const evento of eventos) {
      try {
        const statusConsulta = await esocialService.consultarStatusEvento(evento.numero_recibo!)
        
        let novoStatus = evento.status
        let dadosAtualizacao: any = {
          updated_at: new Date().toISOString()
        }

        if (statusConsulta.processado) {
          novoStatus = statusConsulta.sucesso ? "processado" : "erro"
          dadosAtualizacao.status = novoStatus
          
          if (statusConsulta.numero_recibo) {
            dadosAtualizacao.numero_recibo = statusConsulta.numero_recibo
          }
          
          if (statusConsulta.erros && statusConsulta.erros.length > 0) {
            dadosAtualizacao.erros = statusConsulta.erros
          }

          if (statusConsulta.data_processamento) {
            dadosAtualizacao.data_processamento = statusConsulta.data_processamento
          }

          // Atualizar evento no banco
          await supabase
            .from("eventos_esocial")
            .update(dadosAtualizacao)
            .eq("id", evento.id)

          eventosAtualizados++

          // Criar log de auditoria (logs_auditoria)
          await supabase
            .from("logs_auditoria")
            .insert({
              user_id: user.id,
              empresa_id,
              acao: "consulta_status_esocial",
              entidade: "eventos_esocial",
              entidade_id: evento.id,
              descricao: "Consulta de status de evento do eSocial",
              dados_anteriores: {
                status_anterior: evento.status,
              },
              dados_novos: {
                tipo_evento: evento.tipo_evento,
                numero_recibo: evento.numero_recibo,
                status_novo: novoStatus,
                processado: statusConsulta.processado,
                sucesso: statusConsulta.sucesso
              },
              created_at: new Date().toISOString(),
            })
        }

        resultados.push({
          evento_id: evento.id,
          tipo_evento: evento.tipo_evento,
          numero_recibo: evento.numero_recibo,
          status_anterior: evento.status,
          status_atual: novoStatus,
          processado: statusConsulta.processado,
          sucesso: statusConsulta.sucesso
        })

      } catch (consultaError) {
        console.error(`Erro ao consultar evento ${evento.id}:`, consultaError)
        resultados.push({
          evento_id: evento.id,
          tipo_evento: evento.tipo_evento,
          numero_recibo: evento.numero_recibo,
          erro: consultaError instanceof Error ? consultaError.message : "Erro desconhecido"
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Consulta realizada com sucesso. ${eventosAtualizados} eventos atualizados.`,
      eventos_consultados: eventos.length,
      eventos_atualizados: eventosAtualizados,
      resultados
    })

  } catch (error) {
    console.error("Erro ao consultar status dos eventos:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}
