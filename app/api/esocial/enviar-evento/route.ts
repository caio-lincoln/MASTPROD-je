import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialService } from "@/lib/esocial/esocial-service"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { evento_id, empresa_id } = await request.json()

    if (!evento_id || !empresa_id) {
      return NextResponse.json(
        { error: "evento_id e empresa_id são obrigatórios" },
        { status: 400 }
      )
    }

    // Buscar dados do evento
    const { data: evento, error: eventoError } = await supabase
      .from("eventos_esocial")
      .select(`
        *,
        funcionarios (
          *,
          empresas (*)
        )
      `)
      .eq("id", evento_id)
      .eq("empresa_id", empresa_id)
      .single()

    if (eventoError || !evento) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se o evento está no status correto
    if (evento.status !== "preparando") {
      return NextResponse.json(
        { error: `Evento não pode ser enviado. Status atual: ${evento.status}` },
        { status: 400 }
      )
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

    // Atualizar status para "enviando"
    await supabase
      .from("eventos_esocial")
      .update({ 
        status: "enviando",
        updated_at: new Date().toISOString()
      })
      .eq("id", evento_id)

    try {
      // Processar evento através do serviço eSocial
      const esocialService = new EsocialService()
      const resultado = await esocialService.processarEvento(evento_id)

      // Atualizar evento com resultado do envio
      const updateData: any = {
        status: resultado.sucesso ? "enviado" : "erro",
        protocolo: resultado.protocolo,
        numero_recibo: resultado.numero_recibo,
        data_processamento: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (resultado.erros && resultado.erros.length > 0) {
        updateData.erros = resultado.erros
      }

      await supabase
        .from("eventos_esocial")
        .update(updateData)
        .eq("id", evento_id)

      // Criar log de auditoria
      await supabase
        .from("audit_logs")
        .insert({
          empresa_id,
          usuario_id: evento.funcionarios?.empresas?.created_by,
          acao: "envio_evento_esocial",
          tabela: "eventos_esocial",
          registro_id: evento_id,
          detalhes: {
            tipo_evento: evento.tipo_evento,
            protocolo: resultado.protocolo,
            sucesso: resultado.sucesso,
            erros: resultado.erros
          }
        })

      if (resultado.sucesso) {
        return NextResponse.json({
          success: true,
          protocolo: resultado.protocolo,
          numero_recibo: resultado.numero_recibo,
          message: "Evento enviado com sucesso para o eSocial"
        })
      } else {
        return NextResponse.json({
          success: false,
          erros: resultado.erros,
          message: "Erro ao processar evento no eSocial"
        }, { status: 400 })
      }

    } catch (envioError) {
      // Reverter status em caso de erro
      await supabase
        .from("eventos_esocial")
        .update({ 
          status: "erro",
          erros: [envioError instanceof Error ? envioError.message : "Erro desconhecido"],
          updated_at: new Date().toISOString()
        })
        .eq("id", evento_id)

      throw envioError
    }

  } catch (error) {
    console.error("Erro ao enviar evento eSocial:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    )
  }
}