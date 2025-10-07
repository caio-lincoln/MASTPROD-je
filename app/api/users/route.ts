import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/config/supabase-config'
import { isUuid, sanitizeString } from '@/lib/security/validation'

// Cliente Supabase com service role key para operações administrativas
const supabaseAdmin = createClient(
  getSupabaseUrl(),
  getSupabaseServiceRoleKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresa_id')

    if (!empresaId) {
      return NextResponse.json(
        { error: 'empresa_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!isUuid(empresaId)) {
      return NextResponse.json(
        { error: 'empresa_id inválido' },
        { status: 400 }
      )
    }

    // Buscar usuários relacionados à empresa selecionada
    const { data: userCompanies, error: userCompaniesError } = await supabaseAdmin
      .from('usuario_empresas')
      .select('user_id, role, created_at')
      .eq('empresa_id', empresaId)

    if (userCompaniesError) {
      console.error('Erro ao buscar usuario_empresas:', userCompaniesError)
      return NextResponse.json(
        { error: 'Erro ao buscar usuários da empresa' },
        { status: 500 }
      )
    }

    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Buscar dados dos usuários do auth.users usando service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('Erro ao buscar usuários do auth:', authError)
      // Fallback: retornar dados limitados
      const fallbackUsers = userCompanies.map((uc: any) => ({
        id: uc.user_id,
        email: `usuario-${uc.user_id.substring(0, 8)}@empresa.com`,
        role: uc.role,
        created_at: uc.created_at,
        last_sign_in_at: uc.created_at
      }))
      return NextResponse.json({ users: fallbackUsers })
    }

    // Combinar dados das duas consultas
    const combinedUsers = userCompanies.map((uc: any) => {
      const authUser = authData.users.find(au => au.id === uc.user_id)
      return {
        id: uc.user_id,
        email: authUser?.email || `usuario-${uc.user_id.substring(0, 8)}@empresa.com`,
        role: uc.role,
        created_at: authUser?.created_at || uc.created_at,
        last_sign_in_at: authUser?.last_sign_in_at || uc.created_at,
        email_confirmed_at: authUser?.email_confirmed_at,
        banned_until: authUser?.banned_until,
        deleted_at: authUser?.deleted_at,
        phone: authUser?.phone,
        user_metadata: authUser?.user_metadata
      }
    })

    return NextResponse.json({ users: combinedUsers })
  } catch (error) {
    console.error('Erro na API de usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, role, empresa_id, name } = body

    if (!email || !password || !role || !empresa_id) {
      return NextResponse.json(
        { error: 'Email, senha, role e empresa_id são obrigatórios' },
        { status: 400 }
      )
    }

    if (!isUuid(empresa_id)) {
      return NextResponse.json(
        { error: 'empresa_id inválido' },
        { status: 400 }
      )
    }

    const safeEmail = sanitizeString(email)
    const safePassword = sanitizeString(password)
    const safeRole = sanitizeString(role)
    const safeName = name ? sanitizeString(name) : undefined

    // Criar usuário no auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: safeEmail,
      password: safePassword,
      email_confirm: true,
      user_metadata: {
        name: safeName || safeEmail.split('@')[0]
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário:', authError)
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // Associar usuário à empresa
    const { error: relationError } = await supabaseAdmin
      .from('usuario_empresas')
      .insert({
        user_id: authUser.user.id,
        empresa_id,
        role: safeRole
      })

    if (relationError) {
      console.error('Erro ao associar usuário à empresa:', relationError)
      // Tentar deletar o usuário criado se falhar a associação
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'Erro ao associar usuário à empresa' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role,
        created_at: authUser.user.created_at
      }
    })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, email, role, empresa_id, name } = body

    if (!user_id || !empresa_id) {
      return NextResponse.json(
        { error: 'user_id e empresa_id são obrigatórios' },
        { status: 400 }
      )
    }

    if (!isUuid(user_id) || !isUuid(empresa_id)) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    // Atualizar dados do usuário no auth se fornecidos
    if (email || name) {
      const updateData: any = {}
      if (email) updateData.email = sanitizeString(email)
      if (name) updateData.user_metadata = { name: sanitizeString(name) }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      )

      if (authError) {
        console.error('Erro ao atualizar usuário no auth:', authError)
        return NextResponse.json(
          { error: 'Erro ao atualizar dados do usuário' },
          { status: 500 }
        )
      }
    }

    // Atualizar role na tabela usuario_empresas se fornecido
    if (role) {
      const { error: roleError } = await supabaseAdmin
        .from('usuario_empresas')
        .update({ role: sanitizeString(role) })
        .eq('user_id', user_id)
        .eq('empresa_id', empresa_id)

      if (roleError) {
        console.error('Erro ao atualizar role:', roleError)
        return NextResponse.json(
          { error: 'Erro ao atualizar role do usuário' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const empresaId = searchParams.get('empresa_id')

    if (!userId || !empresaId) {
      return NextResponse.json(
        { error: 'user_id e empresa_id são obrigatórios' },
        { status: 400 }
      )
    }

    if (!isUuid(userId) || !isUuid(empresaId)) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    // Remover associação da empresa
    const { error: relationError } = await supabaseAdmin
      .from('usuario_empresas')
      .delete()
      .eq('user_id', userId)
      .eq('empresa_id', empresaId)

    if (relationError) {
      console.error('Erro ao remover associação:', relationError)
      return NextResponse.json(
        { error: 'Erro ao remover usuário da empresa' },
        { status: 500 }
      )
    }

    // Verificar se o usuário ainda está associado a outras empresas
    const { data: otherAssociations, error: checkError } = await supabaseAdmin
      .from('usuario_empresas')
      .select('empresa_id')
      .eq('user_id', userId)

    if (checkError) {
      console.error('Erro ao verificar outras associações:', checkError)
      return NextResponse.json(
        { error: 'Erro ao verificar associações do usuário' },
        { status: 500 }
      )
    }

    // Se não há outras associações, deletar o usuário do auth
    if (!otherAssociations || otherAssociations.length === 0) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (deleteError) {
        console.error('Erro ao deletar usuário do auth:', deleteError)
        return NextResponse.json(
          { error: 'Erro ao deletar usuário completamente' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}