const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas');
  console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadCertificado() {
  try {
    console.log('🔐 Iniciando upload do certificado A1...');
    
    // Ler o certificado
    const certPath = path.join(process.cwd(), 'XML EMPRESAS', 'RONALDO BEZERRA DE FREITAS_07031690501 (1).pfx');
    const certBuffer = fs.readFileSync(certPath);
    
    console.log(`📄 Certificado: ${path.basename(certPath)}`);
    console.log(`📊 Tamanho: ${certBuffer.length} bytes`);
    
    // Nome do arquivo no Storage
    const fileName = 'certificado-a1-ronaldo-bezerra.pfx';
    
    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('certificados-esocial')
      .upload(fileName, certBuffer, {
        contentType: 'application/x-pkcs12',
        upsert: true // Substitui se já existir
      });
    
    if (error) {
      console.error('❌ Erro no upload:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Upload realizado com sucesso!');
    console.log('📁 Bucket: certificados-esocial');
    console.log('📄 Arquivo:', fileName);
    console.log('🔗 Path:', data.path);
    
    // Verificar se o arquivo foi salvo
    const { data: listData, error: listError } = await supabase.storage
      .from('certificados-esocial')
      .list();
    
    if (listError) {
      console.error('❌ Erro ao listar arquivos:', listError.message);
    } else {
      console.log('📋 Arquivos no bucket:');
      listData.forEach(file => {
        console.log(`  - ${file.name} (${file.metadata?.size || 'N/A'} bytes)`);
      });
    }
    
    // Atualizar tabela de certificados eSocial
    const { data: insertData, error: insertError } = await supabase
      .from('certificados_esocial')
      .upsert({
        empresa_id: 1, // Será atualizado conforme necessário
        nome_arquivo: fileName,
        caminho_storage: data.path,
        data_upload: new Date().toISOString(),
        responsavel: 'Sistema',
        valido: true,
        cnpj: '07031690501',
        razao_social: 'RONALDO BEZERRA DE FREITAS'
      }, {
        onConflict: 'cnpj'
      });
    
    if (insertError) {
      console.warn('⚠️ Aviso: Erro ao atualizar tabela certificados_esocial:', insertError.message);
    } else {
      console.log('✅ Registro atualizado na tabela certificados_esocial');
    }
    
    console.log('');
    console.log('🎉 Certificado A1 configurado com sucesso!');
    console.log('🔐 Empresa: RONALDO BEZERRA DE FREITAS');
    console.log('🏢 CNPJ: 07.031.690/0001-01');
    console.log('📁 Storage: certificados-esocial/' + fileName);
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    process.exit(1);
  }
}

uploadCertificado();