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

async function debugUsers() {
  console.log('🔍 Listando todos os usuários...');
  console.log('---');

  try {
    // Listar todos os usuários
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }

    console.log(`📊 Total de usuários encontrados: ${users.users.length}`);
    console.log('---');

    users.users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Criado em: ${user.created_at}`);
      console.log(`   Email confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
      console.log(`   Último login: ${user.last_sign_in_at || 'Nunca'}`);
      console.log(`   Provedor: ${user.app_metadata?.provider || 'N/A'}`);
      console.log(`   Metadados: ${JSON.stringify(user.user_metadata || {})}`);
      console.log('---');
    });

    // Procurar especificamente pelo usuário mastprodeng@gmail.com
    const targetUser = users.users.find(u => u.email === 'mastprodeng@gmail.com');
    
    if (targetUser) {
      console.log('🎯 Usuário mastprodeng@gmail.com encontrado:');
      console.log(`   ID: ${targetUser.id}`);
      console.log(`   Status: ${targetUser.email_confirmed_at ? 'Confirmado' : 'Não confirmado'}`);
      console.log(`   Último login: ${targetUser.last_sign_in_at || 'Nunca logou'}`);
      
      // Tentar resetar a senha deste usuário específico
      console.log('🔄 Tentando resetar senha...');
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        {
          password: '20021996'
        }
      );

      if (updateError) {
        console.error('❌ Erro ao resetar senha:', updateError);
      } else {
        console.log('✅ Senha resetada com sucesso!');
      }
    } else {
      console.log('❌ Usuário mastprodeng@gmail.com NÃO encontrado na lista de usuários');
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

debugUsers();