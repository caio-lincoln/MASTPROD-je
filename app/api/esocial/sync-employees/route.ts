import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/config/supabase-config"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error("Erro de autenticação:", authError)
      return NextResponse.json(
        { error: "Não autorizado", details: "Usuário não autenticado" },
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

    // Buscar dados da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("id, cnpj, razao_social")
      .eq("id", empresa_id)
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada ou sem acesso" },
        { status: 404 }
      )
    }

    // Chamar diretamente a lógica de sincronização em vez de fazer fetch interno
    const { EsocialPersistenciaFuncionarios } = await import("@/lib/esocial/persistencia-funcionarios")
    const { getCertificateConfig } = await import("@/lib/esocial/certificate-storage")
    
    try {
      const persistencia = new EsocialPersistenciaFuncionarios(supabase)
      
      // Obter configuração do certificado
      const certificateConfig = getCertificateConfig()
      
      const syncResult = await persistencia.sincronizarFuncionarios(
        empresa.cnpj,
        empresa.id,
        {
          certificado: certificateConfig.storage === 'supabase' 
            ? `${certificateConfig.bucket}/${certificateConfig.filename}`
            : certificateConfig.path || '',
          senha: certificateConfig.password,
          ambiente: "producao" as "producao" | "producao-restrita",
          urls: {
            recepcaoLote: "https://webservices.producao.esocial.gov.br/servicos/empregador/recepcaoloteeventos/WsRecepcaoLoteEventos.svc",
            consultaLote: "https://webservices.producao.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc",
            downloadEvento: "https://webservices.producao.esocial.gov.br/servicos/empregador/downloadeventos/WsDownloadEventos.svc",
            consultaEventos: "https://webservices.producao.esocial.gov.br/servicos/empregador/consultareventos/WsConsultarEventos.svc"
          }
        }
      )

      // Retornar resposta no formato esperado pelo frontend
      return NextResponse.json({
        success: true,
        message: "Funcionários sincronizados com sucesso",
        count: syncResult.funcionarios_processados || 0,
        details: {
          funcionarios_novos: syncResult.funcionarios_novos || 0,
          funcionarios_atualizados: syncResult.funcionarios_atualizados || 0,
          tempo_execucao_ms: syncResult.tempo_execucao_ms || 0
        }
      })
      
    } catch (syncError) {
      console.error("Erro na sincronização:", syncError)
      return NextResponse.json(
        { error: "Erro ao sincronizar funcionários", details: String(syncError) },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Erro ao sincronizar funcionários:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}