#!/usr/bin/env node
/**
 * Script para testar integração eSocial diretamente no banco de dados
 * Verifica se os dados estão sendo armazenados corretamente
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const CNPJ_TESTE = '03731608000184';

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Testa conexão com o banco
 */
async function testConnection() {
  console.log('🔌 === TESTE: CONEXÃO COM BANCO ===');
  
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com banco estabelecida');
    return true;
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message);
    return false;
  }
}

/**
 * Verifica se a empresa existe
 */
async function checkEmpresa() {
  console.log('\n🏢 === TESTE: VERIFICAR EMPRESA ===');
  
  try {
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, created_at')
      .eq('cnpj', CNPJ_TESTE)
      .single();
    
    if (error) {
      console.log('❌ Erro ao buscar empresa:', error.message);
      return null;
    }
    
    if (!empresa) {
      console.log('❌ Empresa não encontrada');
      return null;
    }
    
    console.log('✅ Empresa encontrada:');
    console.log(`   ID: ${empresa.id}`);
    console.log(`   Nome: ${empresa.nome}`);
    console.log(`   CNPJ: ${empresa.cnpj}`);
    console.log(`   Criada em: ${empresa.created_at}`);
    
    return empresa;
  } catch (error) {
    console.log('❌ Erro ao verificar empresa:', error.message);
    return null;
  }
}

/**
 * Verifica configuração eSocial
 */
async function checkEsocialConfig(empresaId) {
  console.log('\n⚙️  === TESTE: CONFIGURAÇÃO ESOCIAL ===');
  
  try {
    const { data: config, error } = await supabase
      .from('esocial_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single();
    
    if (error) {
      console.log('❌ Erro ao buscar configuração eSocial:', error.message);
      return null;
    }
    
    if (!config) {
      console.log('❌ Configuração eSocial não encontrada');
      return null;
    }
    
    console.log('✅ Configuração eSocial encontrada:');
    console.log(`   Tipo de certificado: ${config.tipo_certificado}`);
    console.log(`   Arquivo: ${config.certificado_arquivo}`);
    console.log(`   Status: ${config.ativo ? 'Ativo' : 'Inativo'}`);
    console.log(`   Thumbprint: ${config.thumbprint}`);
    
    return config;
  } catch (error) {
    console.log('❌ Erro ao verificar configuração eSocial:', error.message);
    return null;
  }
}

/**
 * Verifica funcionários existentes
 */
async function checkFuncionarios(empresaId) {
  console.log('\n👥 === TESTE: FUNCIONÁRIOS EXISTENTES ===');
  
  try {
    const { data: funcionarios, error, count } = await supabase
      .from('funcionarios')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .limit(5);
    
    if (error) {
      console.log('❌ Erro ao buscar funcionários:', error.message);
      return [];
    }
    
    console.log(`📊 Total de funcionários: ${count || 0}`);
    
    if (funcionarios && funcionarios.length > 0) {
      console.log('✅ Funcionários encontrados (primeiros 5):');
      funcionarios.forEach((func, index) => {
        console.log(`   ${index + 1}. ${func.nome} - CPF: ${func.cpf} - Status: ${func.status}`);
      });
    } else {
      console.log('⚠️  Nenhum funcionário encontrado');
    }
    
    return funcionarios || [];
  } catch (error) {
    console.log('❌ Erro ao verificar funcionários:', error.message);
    return [];
  }
}

/**
 * Verifica eventos eSocial
 */
async function checkEventosEsocial(empresaId) {
  console.log('\n📋 === TESTE: EVENTOS ESOCIAL ===');
  
  try {
    const { data: eventos, error, count } = await supabase
      .from('esocial_eventos')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .limit(5);
    
    if (error) {
      console.log('❌ Erro ao buscar eventos eSocial:', error.message);
      return [];
    }
    
    console.log(`📊 Total de eventos eSocial: ${count || 0}`);
    
    if (eventos && eventos.length > 0) {
      console.log('✅ Eventos encontrados (primeiros 5):');
      eventos.forEach((evento, index) => {
        console.log(`   ${index + 1}. ${evento.tipo_evento} - Status: ${evento.status} - Criado: ${evento.created_at}`);
      });
    } else {
      console.log('⚠️  Nenhum evento eSocial encontrado');
    }
    
    return eventos || [];
  } catch (error) {
    console.log('❌ Erro ao verificar eventos eSocial:', error.message);
    return [];
  }
}

/**
 * Testa inserção de funcionário de teste
 */
async function testInsertFuncionario(empresaId) {
  console.log('\n➕ === TESTE: INSERIR FUNCIONÁRIO DE TESTE ===');
  
  const funcionarioTeste = {
    empresa_id: empresaId,
    nome: 'João da Silva Teste',
    cpf: '12345678901',
    email: 'joao.teste@empresa.com',
    cargo: 'Analista de Sistemas',
    status: 'Ativo',
    data_admissao: '2024-01-15',
    salario: 5000.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    // Verificar se já existe
    const { data: existente } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('cpf', funcionarioTeste.cpf)
      .single();
    
    if (existente) {
      console.log('⚠️  Funcionário de teste já existe');
      return existente;
    }
    
    // Inserir novo funcionário
    const { data: novoFuncionario, error } = await supabase
      .from('funcionarios')
      .insert(funcionarioTeste)
      .select()
      .single();
    
    if (error) {
      console.log('❌ Erro ao inserir funcionário:', error.message);
      return null;
    }
    
    console.log('✅ Funcionário de teste inserido com sucesso:');
    console.log(`   ID: ${novoFuncionario.id}`);
    console.log(`   Nome: ${novoFuncionario.nome}`);
    console.log(`   CPF: ${novoFuncionario.cpf}`);
    
    return novoFuncionario;
  } catch (error) {
    console.log('❌ Erro ao testar inserção:', error.message);
    return null;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🧪 Testando integração eSocial no banco de dados...');
  console.log(`🏢 CNPJ de teste: ${CNPJ_TESTE}\n`);
  
  // Testar conexão
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Falha na conexão com o banco. Abortando testes.');
    return;
  }
  
  // Verificar empresa
  const empresa = await checkEmpresa();
  if (!empresa) {
    console.log('\n❌ Empresa não encontrada. Abortando testes.');
    return;
  }
  
  // Verificar configuração eSocial
  const esocialConfig = await checkEsocialConfig(empresa.id);
  
  // Verificar funcionários
  const funcionarios = await checkFuncionarios(empresa.id);
  
  // Verificar eventos eSocial
  const eventos = await checkEventosEsocial(empresa.id);
  
  // Testar inserção de funcionário
  const novoFuncionario = await testInsertFuncionario(empresa.id);
  
  // Resumo final
  console.log('\n📊 === RESUMO DOS TESTES ===\n');
  
  const results = [
    { name: 'Conexão com banco', success: connected },
    { name: 'Empresa encontrada', success: !!empresa },
    { name: 'Configuração eSocial', success: !!esocialConfig },
    { name: 'Funcionários existentes', success: funcionarios.length > 0 },
    { name: 'Eventos eSocial', success: eventos.length > 0 },
    { name: 'Inserção de funcionário', success: !!novoFuncionario }
  ];
  
  let successCount = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    
    if (result.success) {
      successCount++;
    }
  });
  
  console.log(`\n📈 Resultado: ${successCount}/${results.length} testes passaram`);
  
  if (empresa && esocialConfig) {
    console.log('\n🎉 INTEGRAÇÃO ESOCIAL: ✅ CONFIGURAÇÃO BÁSICA OK!');
    console.log('\n🚀 Status da integração:');
    console.log('   ✅ Empresa cadastrada no sistema');
    console.log('   ✅ Certificado digital configurado');
    console.log('   ✅ Banco de dados acessível');
    console.log(`   ${funcionarios.length > 0 ? '✅' : '⚠️'} Funcionários: ${funcionarios.length} registros`);
    console.log(`   ${eventos.length > 0 ? '✅' : '⚠️'} Eventos eSocial: ${eventos.length} registros`);
    
    console.log('\n🔄 Próximos passos:');
    console.log('   1. Testar sincronização com eSocial (S-1000, S-1005, etc.)');
    console.log('   2. Implementar autenticação nos endpoints REST');
    console.log('   3. Testar geração e envio de eventos');
    console.log('   4. Configurar monitoramento e logs');
  } else {
    console.log('\n⚠️  INTEGRAÇÃO ESOCIAL: ❌ CONFIGURAÇÃO INCOMPLETA');
    console.log('\n🔧 Ações necessárias:');
    if (!empresa) {
      console.log('   ❌ Cadastrar empresa no sistema');
    }
    if (!esocialConfig) {
      console.log('   ❌ Configurar certificado digital eSocial');
    }
  }
}

// Executar teste
main().catch(console.error);