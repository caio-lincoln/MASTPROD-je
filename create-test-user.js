const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://ifvgnuhyfmadzkqmtfkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc0Mzk3NSwiZXhwIjoyMDcyMzE5OTc1fQ.ljnRx4I8q_fKDrrzN1zm5w1frFBaMxYjgBzSKn6kmnQ';

// Criar cliente Supabase com service role key para criar usuários
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente normal para teste de login
const supabaseClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDM5NzUsImV4cCI6MjA3MjMxOTk3NX0.VSEgEuBtDcgY3mXTAALQJPBHv6tLDkzzORuFwBPNSFw');

async function createAndTestUser() {
  const testEmail = 'teste@mastprod.com';
  const testPassword = 'teste123456';

  console.log('🔍 Criando usuário de teste...');
  console.log('Email:', testEmail);
  console.log('Senha:', testPassword);
  console.log('---');

  try {
    // Criar usuário
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Usuário Teste'
      }
    });

    if (createError) {
      console.error('❌ Erro ao criar usuário:', createError);
      return;
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log('ID:', createData.user.id);
    console.log('Email:', createData.user.email);
    console.log('---');

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Testar login com o novo usuário
    console.log('🔐 Testando login com o novo usuário...');
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('❌ Erro no login do usuário teste:', loginError);
      return;
    }

    console.log('✅ Login do usuário teste bem-sucedido!');
    console.log('ID:', loginData.user.id);
    console.log('Email:', loginData.user.email);
    
    // Fazer logout
    await supabaseClient.auth.signOut();
    console.log('🔓 Logout realizado');

    // Agora testar com o usuário original
    console.log('---');
    console.log('🔐 Testando login com usuário original...');
    const { data: originalData, error: originalError } = await supabaseClient.auth.signInWithPassword({
      email: 'mastprodeng@gmail.com',
      password: '20021996'
    });

    if (originalError) {
      console.error('❌ Erro no login do usuário original:', originalError);
      console.log('🔍 Problema confirmado: usuário original tem problema específico');
    } else {
      console.log('✅ Login do usuário original funcionou!');
      await supabaseClient.auth.signOut();
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

createAndTestUser();