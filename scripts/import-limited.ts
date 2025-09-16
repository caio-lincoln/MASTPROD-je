import { createClient } from '@supabase/supabase-js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ESocialXMLParser } from '../lib/esocial/xml-parser';
import { ESocialValidator } from '../lib/esocial/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importLimited() {
  try {
    console.log('🚀 Iniciando importação limitada...');
    
    const parser = new ESocialXMLParser();
    const validator = new ESocialValidator();
    const empresaId = '2327b557-465f-455c-b4ef-301e21655f61';
    
    // Listar arquivos XML
    const xmlDir = join(process.cwd(), '..', 'XML EMPRESAS');
    const files = readdirSync(xmlDir)
      .filter(file => file.endsWith('.xml'))
      .slice(0, 10); // Limitar a 10 arquivos para teste
    
    console.log(`📁 Encontrados ${files.length} arquivos para importar`);
    
    const stats = {
      success: 0,
      errors: 0,
      skipped: 0
    };
    
    for (const file of files) {
      try {
        console.log(`📄 Processando: ${file}`);
        
        const filePath = join(xmlDir, file);
        const evento = await parser.parseXMLFile(filePath);
        
        if (!evento) {
          console.log(`❌ Falha no parse: ${file}`);
          stats.errors++;
          continue;
        }
        
        // Validar evento
        const validationResult = validator.validate(evento);
        
        if (!validationResult.isValid) {
          console.log(`❌ Validação falhou: ${file}`);
          console.log('Erros:', validationResult.errors);
          stats.errors++;
          continue;
        }
        
        if (validationResult.warnings.length > 0) {
          console.log(`⚠️  Warnings: ${validationResult.warnings.join(', ')}`);
        }
        
        // Verificar se o evento já existe
        const { data: existingEvent } = await supabase
          .from('eventos_esocial')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('xml_original', evento.xml_content)
          .single();

        if (existingEvent) {
          console.log(`⏭️ Evento já existe: ${file}`);
          stats.skipped++;
          continue;
        }

        // Inserir o evento no banco
        const { error: insertError } = await supabase
          .from('eventos_esocial')
          .insert({
            empresa_id: empresaId,
            entidade_id: empresaId, // Usando empresa_id como entidade_id
            tipo_evento: evento.tipo,
            xml_original: evento.xml_content,
            status: 'importado'
          });
        
        if (insertError) {
          console.log(`❌ Erro ao inserir: ${file}`, insertError.message);
          stats.errors++;
        } else {
          console.log(`✅ Sucesso: ${file}`);
          stats.success++;
        }
        
      } catch (error) {
        console.log(`❌ Erro processando ${file}:`, error);
        stats.errors++;
      }
    }
    
    console.log('\n📊 RELATÓRIO FINAL:');
    console.log(`✅ Sucessos: ${stats.success}`);
    console.log(`❌ Erros: ${stats.errors}`);
    console.log(`📈 Taxa de sucesso: ${((stats.success / files.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

importLimited().catch(console.error);