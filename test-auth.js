const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://ifvgnuhyfmadzkqmtfkl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDM5NzUsImV4cCI6MjA3MjMxOTk3NX0.VSEgEuBtDcgY3mXTAALQJPBHv6tLDkzzORuFwBPNSFw';

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🔍 Testando autenticação direta via API do Supabase...');
  console.log('URL:', supabaseUrl);
  console.log('Email:', 'mastprodeng@gmail.com');
  console.log('Senha:', '20021996');
  console.log('---');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'mastprodeng@gmail.com',
      password: '20021996'
    });

    if (error) {
      console.error('❌ Erro de autenticação:', error);
      console.error('Código do erro:', error.status);
      console.error('Mensagem:', error.message);
      return;
    }

    if (data.user) {
      console.log('✅ Autenticação bem-sucedida!');
      console.log('ID do usuário:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Email confirmado em:', data.user.email_confirmed_at);
      console.log('Último login:', data.user.last_sign_in_at);
      
      // Fazer logout
      await supabase.auth.signOut();
      console.log('🔓 Logout realizado');
    } else {
      console.log('❌ Nenhum usuário retornado');
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

testAuth();