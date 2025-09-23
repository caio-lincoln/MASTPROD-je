const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://ifvgnuhyfmadzkqmtfkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc0Mzk3NSwiZXhwIjoyMDcyMzE5OTc1fQ.ljnRx4I8q_fKDrrzN1zm5w1frFBaMxYjgBzSKn6kmnQ';

// Criar cliente Supabase com service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente normal para teste de login
const supabaseClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDM5NzUsImV4cCI6MjA3MjMxOTk3NX0.VSEgEuBtDcgY3mXTAALQJPBHv6tLDkzzORuFwBPNSFw');

async function resetUserPassword() {
  const userEmail = 'mastprodeng@gmail.com';
  const newPassword = '20021996';

  console.log('🔄 Resetando senha do usuário...');
  console.log('Email:', userEmail);
  console.log('Nova senha:', newPassword);
  console.log('---');

  try {
    // Primeiro, vamos buscar o usuário pelo email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }

    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error('❌ Usuário não encontrado');
      return;
    }

    console.log('✅ Usuário encontrado:', user.id);

    // Resetar a senha usando updateUserById
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword
      }
    );

    if (updateError) {
      console.error('❌ Erro ao resetar senha:', updateError);
      return;
    }

    console.log('✅ Senha resetada com sucesso!');
    console.log('ID do usuário:', updateData.user.id);
    console.log('Email:', updateData.user.email);
    console.log('---');

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Testar login com a nova senha
    console.log('🔐 Testando login com a senha resetada...');
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: userEmail,
      password: newPassword
    });

    if (loginError) {
      console.error('❌ Erro no login após reset:', loginError);
      return;
    }

    console.log('✅ Login bem-sucedido após reset da senha!');
    console.log('ID:', loginData.user.id);
    console.log('Email:', loginData.user.email);
    console.log('Último login:', loginData.user.last_sign_in_at);
    
    // Fazer logout
    await supabaseClient.auth.signOut();
    console.log('🔓 Logout realizado');

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

resetUserPassword();