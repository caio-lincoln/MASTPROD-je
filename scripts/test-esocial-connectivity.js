#!/usr/bin/env node
/**
 * Script para testar conectividade com web services do eSocial
 * Verifica se os endpoints estão acessíveis e funcionais
 */

const https = require('https');
const { URL } = require('url');

// URLs dos web services do eSocial
const ESOCIAL_ENDPOINTS = {
  producao: {
    envioLoteEventos: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
    consultarLoteEventos: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
    consultarIdentificadoresEventos: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultaridentificadoreseventos/WsConsultarIdentificadoresEventos.svc'
  },
  homologacao: {
    envioLoteEventos: 'https://webservices.envio.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
    consultarLoteEventos: 'https://webservices.consulta.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
    consultarIdentificadoresEventos: 'https://webservices.consulta.esocial.gov.br/servicos/empregador/consultaridentificadoreseventos/WsConsultarIdentificadoresEventos.svc'
  }
};

/**
 * Testa conectividade com um endpoint específico
 */
async function testEndpoint(name, url) {
  return new Promise((resolve) => {
    console.log(`🔍 Testando ${name}...`);
    console.log(`   URL: ${url}`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 10000,
      rejectUnauthorized: false, // Para contornar problemas de certificado SSL
      headers: {
        'User-Agent': 'SST-System/1.0 (Connectivity Test)',
        'Accept': 'text/xml, application/soap+xml, */*'
      }
    };

    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      
      console.log(`   ✅ Status: ${res.statusCode}`);
      console.log(`   ⏱️  Tempo de resposta: ${responseTime}ms`);
      console.log(`   📋 Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      resolve({
        success: true,
        statusCode: res.statusCode,
        responseTime,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      console.log(`   ❌ Erro: ${error.message}`);
      console.log(`   ⏱️  Tempo até erro: ${responseTime}ms`);
      
      resolve({
        success: false,
        error: error.message,
        responseTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`   ⏰ Timeout após 10 segundos`);
      
      resolve({
        success: false,
        error: 'Timeout',
        responseTime: 10000
      });
    });

    req.end();
  });
}

/**
 * Testa conectividade com WSDL
 */
async function testWSDL(name, baseUrl) {
  const wsdlUrl = baseUrl + '?wsdl';
  console.log(`\n📄 Testando WSDL ${name}...`);
  
  return new Promise((resolve) => {
    const urlObj = new URL(wsdlUrl);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 15000,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'SST-System/1.0 (WSDL Test)',
        'Accept': 'text/xml, application/xml, */*'
      }
    };

    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const isValidWSDL = data.includes('<wsdl:') || data.includes('<definitions');
        
        console.log(`   ✅ Status: ${res.statusCode}`);
        console.log(`   ⏱️  Tempo de resposta: ${responseTime}ms`);
        console.log(`   📄 WSDL válido: ${isValidWSDL ? '✅' : '❌'}`);
        console.log(`   📊 Tamanho da resposta: ${data.length} bytes`);
        
        if (isValidWSDL) {
          const operations = (data.match(/<wsdl:operation/g) || []).length;
          console.log(`   🔧 Operações encontradas: ${operations}`);
        }
        
        resolve({
          success: res.statusCode === 200 && isValidWSDL,
          statusCode: res.statusCode,
          responseTime,
          isValidWSDL,
          dataSize: data.length
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      console.log(`   ❌ Erro: ${error.message}`);
      
      resolve({
        success: false,
        error: error.message,
        responseTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`   ⏰ Timeout após 15 segundos`);
      
      resolve({
        success: false,
        error: 'Timeout',
        responseTime: 15000
      });
    });

    req.end();
  });
}

/**
 * Função principal
 */
async function main() {
  console.log('🌐 Testando conectividade com web services do eSocial...\n');
  
  const results = {
    producao: {},
    homologacao: {}
  };
  
  // Testar ambientes
  for (const [ambiente, endpoints] of Object.entries(ESOCIAL_ENDPOINTS)) {
    console.log(`\n🏢 === AMBIENTE: ${ambiente.toUpperCase()} ===`);
    
    // Testar cada endpoint
    for (const [serviceName, url] of Object.entries(endpoints)) {
      console.log(`\n📡 Serviço: ${serviceName}`);
      
      // Teste básico de conectividade
      const connectivityResult = await testEndpoint(serviceName, url);
      results[ambiente][serviceName] = connectivityResult;
      
      // Se conectividade OK, testar WSDL
      if (connectivityResult.success) {
        const wsdlResult = await testWSDL(serviceName, url);
        results[ambiente][serviceName].wsdl = wsdlResult;
      }
      
      console.log(''); // Linha em branco para separar
    }
  }
  
  // Resumo final
  console.log('\n📊 === RESUMO DOS TESTES ===\n');
  
  for (const [ambiente, endpoints] of Object.entries(results)) {
    console.log(`🏢 ${ambiente.toUpperCase()}:`);
    
    for (const [serviceName, result] of Object.entries(endpoints)) {
      const status = result.success ? '✅' : '❌';
      const wsdlStatus = result.wsdl ? (result.wsdl.success ? '✅' : '❌') : '⏸️';
      
      console.log(`  ${status} ${serviceName} (${result.responseTime}ms) | WSDL: ${wsdlStatus}`);
      
      if (!result.success) {
        console.log(`    ❌ Erro: ${result.error}`);
      }
    }
    console.log('');
  }
  
  // Verificar se pelo menos um ambiente está funcionando
  const prodOK = Object.values(results.producao).some(r => r.success);
  const homolOK = Object.values(results.homologacao).some(r => r.success);
  
  if (prodOK || homolOK) {
    console.log('🎉 CONECTIVIDADE COM ESOCIAL: ✅ FUNCIONAL');
    console.log(`   - Produção: ${prodOK ? '✅' : '❌'}`);
    console.log(`   - Homologação: ${homolOK ? '✅' : '❌'}`);
  } else {
    console.log('⚠️  CONECTIVIDADE COM ESOCIAL: ❌ PROBLEMAS DETECTADOS');
    console.log('   Verifique sua conexão de internet e firewall');
  }
  
  console.log('\n🔧 Próximos passos:');
  console.log('   1. Se conectividade OK → Testar integração com dados reais');
  console.log('   2. Se problemas → Verificar firewall/proxy corporativo');
  console.log('   3. Configurar certificado para ambiente específico');
}

// Executar teste
main().catch(console.error);