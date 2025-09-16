import { createClient } from '@supabase/supabase-js';
import { ESocialXMLParser } from '../lib/esocial/xml-parser';
import { ESocialValidator } from '../lib/esocial/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testImport() {
  try {
    console.log('Iniciando teste de importação...');
    
    const parser = new ESocialXMLParser();
    const validator = new ESocialValidator();
    
    console.log('Parser e Validator criados com sucesso');
    
    // Teste de conexão com Supabase
    const { data, error } = await supabase.from('empresas').select('id').limit(1);
    
    if (error) {
      console.error('Erro na conexão com Supabase:', error);
      return;
    }
    
    console.log('Conexão com Supabase OK');
    
    // Teste de parse de um arquivo
    const testFile = "C:\\Users\\caiol\\OneDrive\\Documentos\\GitHub\\MASTPROD-je\\XML EMPRESAS\\ID0010000000000000000000033851050921.S-5001.xml";
    
    console.log('Testando parse do arquivo:', testFile);
    
    const evento = await parser.parseXMLFile(testFile);
    
    if (evento) {
      console.log('Parse bem-sucedido!');
      console.log('Tipo de evento:', evento.tipoEvento);
      console.log('CNPJ:', evento.cnpj);
      console.log('Período:', evento.periodo_apuracao);
      
      // Teste de validação
      const validationResult = validator.validate(evento);
      console.log('Validação:', validationResult.isValid ? 'OK' : 'FALHOU');
      
      if (!validationResult.isValid) {
        console.log('Erros:', validationResult.errors);
      }
      
      if (validationResult.warnings.length > 0) {
        console.log('Warnings:', validationResult.warnings);
      }
    } else {
      console.log('Parse falhou - evento é null');
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testImport();