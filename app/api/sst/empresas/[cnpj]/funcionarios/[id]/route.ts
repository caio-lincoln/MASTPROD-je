import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string; id: string } }
) {
  try {
    const { cnpj, id } = params
    
    // Validar CNPJ
    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido" },
        { status: 400 }
      )
    }

    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: "ID do funcionário inválido" },
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

    // Buscar funcionário específico
    const { data: funcionario, error: funcionarioError } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("id", parseInt(id))
      .eq("empresa_id", empresa.id)
      .single()

    if (funcionarioError || !funcionario) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      empresa: {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social
      },
      funcionario: {
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
      }
    })

  } catch (error) {
    console.error("Erro ao consultar funcionário:", error)
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}