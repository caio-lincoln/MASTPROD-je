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

async function createMastprodUser() {
  const userEmail = 'mastprodeng@gmail.com';
  const userPassword = '20021996';

  console.log('👤 Criando usuário MASTPROD...');
  console.log('Email:', userEmail);
  console.log('Senha:', userPassword);
  console.log('---');

  try {
    // Criar usuário via API do Supabase
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Admin MASTPROD',
        full_name: 'Admin MASTPROD'
      }
    });

    if (createError) {
      console.error('❌ Erro ao criar usuário:', createError);
      return;
    }

    console.log('✅ Usuário MASTPROD criado com sucesso!');
    console.log('ID:', createData.user.id);
    console.log('Email:', createData.user.email);
    console.log('Email confirmado:', createData.user.email_confirmed_at ? 'Sim' : 'Não');
    console.log('---');

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Testar login com o usuário criado
    console.log('🔐 Testando login com o usuário MASTPROD...');
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if (loginError) {
      console.error('❌ Erro no login do usuário MASTPROD:', loginError);
      return;
    }

    console.log('✅ Login do usuário MASTPROD bem-sucedido!');
    console.log('ID:', loginData.user.id);
    console.log('Email:', loginData.user.email);
    console.log('Último login:', loginData.user.last_sign_in_at);
    
    // Fazer logout
    await supabaseClient.auth.signOut();
    console.log('🔓 Logout realizado');
    console.log('---');
    console.log('🎉 Usuário MASTPROD está pronto para uso!');

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

createMastprodUser();