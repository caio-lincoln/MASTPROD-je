import { readFileSync, readdirSync } from 'fs';
import { parseStringPromise } from 'xml2js';
import { ESocialXMLParser } from '../lib/esocial/xml-parser';

async function debugXMLStructure() {
  console.log('🔍 Analisando estrutura do XML...');
  
  const xmlDir = 'C:\\Users\\caiol\\OneDrive\\Documentos\\GitHub\\MASTPROD-je\\XML EMPRESAS';
  const files = readdirSync(xmlDir).filter(f => f.endsWith('.xml'));
  
  if (files.length === 0) {
    console.log('❌ Nenhum arquivo XML encontrado');
    return;
  }

  const fileName = files[0];
  console.log(`📄 Analisando arquivo: ${fileName}`);
  
  // Identificar tipo pelo nome
  const match = fileName.match(/\.S-(\d+)\./);
  if (match) {
    console.log(`✅ Tipo identificado pelo nome: S-${match[1]}`);
  }

  const xmlPath = `${xmlDir}\\${fileName}`;
  const xmlContent = readFileSync(xmlPath, 'utf-8');
  
  console.log('📝 Primeiros 500 caracteres do XML:');
  console.log(xmlContent.substring(0, 500) + '...\n');

  // Parse com xml2js
  const result = await parseStringPromise(xmlContent);
  
  console.log('🏗️ Estrutura do XML parseado:');
  console.log('Chaves principais:', Object.keys(result));
  
  const eSocial = result.eSocial;
  if (eSocial) {
    console.log('\n📋 Estrutura eSocial:');
    console.log('Chaves eSocial:', Object.keys(eSocial));
    
    if (eSocial.retornoProcessamentoDownload) {
      console.log('\n📦 Estrutura retornoProcessamentoDownload encontrada');
      console.log('Chaves retornoProcessamentoDownload:', Object.keys(eSocial.retornoProcessamentoDownload));
      
      if (eSocial.retornoProcessamentoDownload.evento) {
        console.log('Chaves evento:', Object.keys(eSocial.retornoProcessamentoDownload.evento));
        
        if (eSocial.retornoProcessamentoDownload.evento.eSocial) {
          const nestedESocial = eSocial.retornoProcessamentoDownload.evento.eSocial;
          console.log('Chaves eSocial aninhado:', Object.keys(nestedESocial));
          
          // Filtrar chaves
          const filteredKeys = Object.keys(nestedESocial).filter(key => 
            !key.startsWith('xmlns') && !key.includes('Signature')
          );
          console.log('Chaves filtradas:', filteredKeys);
          
          // Verificar eventos
          const eventTypeMap: { [key: string]: string } = {
            'evtRemun': 'S-1200',
            'evtBasesTrab': 'S-5001',
            'evtInfoComplPer': 'S-1299',
            'evtIrrf': 'S-5011',
            'evtFGTS': 'S-5012',
            'evtPgtos': 'S-1210'
          };
          
          for (const key of filteredKeys) {
            if (eventTypeMap[key]) {
              console.log(`\n🎯 Evento aninhado encontrado: ${key}`);
              console.log('Estrutura do evento aninhado:', Object.keys(nestedESocial[key]));
              console.log(`🏷️ Tipo mapeado: ${eventTypeMap[key]}`);
              
              // Verificar período de apuração
              if (nestedESocial[key].ideEvento) {
                console.log('📅 ideEvento encontrado:', Object.keys(nestedESocial[key].ideEvento));
                if (nestedESocial[key].ideEvento.perApur) {
                  console.log('📅 Período de apuração:', nestedESocial[key].ideEvento.perApur);
                }
              }
            }
          }
        }
      }
    }
  }

  // Testar com o parser atual
  console.log('\n🧪 Testando com parser atual...');
  const parser = new ESocialXMLParser();
  
  // Usar parseMultipleFiles para obter a estrutura completa
  const parsedMultiple = await parser.parseMultipleFiles([xmlPath]);
  console.log('Resultado parseMultipleFiles:');
  if (parsedMultiple.eventos && parsedMultiple.eventos.length > 0) {
    console.log({
      tipoEvento: parsedMultiple.eventos[0]?.tipoEvento,
      cnpj: parsedMultiple.eventos[0]?.cnpj,
      periodoApuracao: parsedMultiple.eventos[0]?.periodo_apuracao,
      id: parsedMultiple.eventos[0]?.id
    });
  } else {
    console.log('Nenhum evento encontrado no parseMultipleFiles');
  }
  
  // Também testar parseXMLFile individual
  const parsedSingle = await parser.parseXMLFile(xmlPath);
  console.log('\nResultado parseXMLFile:');
  if (parsedSingle) {
    console.log({
      tipoEvento: parsedSingle.tipoEvento,
      cnpj: parsedSingle.cnpj,
      periodoApuracao: parsedSingle.periodo_apuracao,
      id: parsedSingle.id
    });
  } else {
    console.log('Nenhum evento encontrado no parseXMLFile');
  }
}

debugXMLStructure().catch(console.error);