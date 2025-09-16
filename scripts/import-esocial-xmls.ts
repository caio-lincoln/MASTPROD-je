import { createClient } from '@supabase/supabase-js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ESocialXMLParser, ESocialEvent } from '../lib/esocial/xml-parser';
import { ESocialValidator, ValidationResult } from '../lib/esocial/validation';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ImportStats {
  totalFiles: number;
  processedFiles: number;
  errorFiles: number;
  validationErrors: number;
  validationWarnings: number;
  insertedEvents: number;
  insertedFuncionarios: number;
  errors: string[];
  warnings: string[];
}

class ESocialImporter {
  private parser: ESocialXMLParser;
  private validator: ESocialValidator;
  private stats: ImportStats;
  private empresaId: string;

  constructor(empresaId: string) {
    this.parser = new ESocialXMLParser();
    this.validator = new ESocialValidator();
    this.empresaId = empresaId;
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      errorFiles: 0,
      validationErrors: 0,
      validationWarnings: 0,
      insertedEvents: 0,
      insertedFuncionarios: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Importa todos os XMLs de uma pasta
   */
  async importFromDirectory(directoryPath: string): Promise<ImportStats> {
    console.log(`🚀 Iniciando importação da pasta: ${directoryPath}`);
    
    try {
      // Listar todos os arquivos XML
      const xmlFiles = this.getXMLFiles(directoryPath);
      this.stats.totalFiles = xmlFiles.length;

      console.log(`📁 Encontrados ${xmlFiles.length} arquivos XML`);

      // Processar arquivos em lotes para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < xmlFiles.length; i += batchSize) {
        const batch = xmlFiles.slice(i, i + batchSize);
        await this.processBatch(batch);
        
        console.log(`📊 Progresso: ${Math.min(i + batchSize, xmlFiles.length)}/${xmlFiles.length} arquivos processados`);
      }

      // Relatório final
      this.printFinalReport();
      
      return this.stats;
    } catch (error) {
      console.error('❌ Erro durante a importação:', error);
      this.stats.errors.push(`Erro geral: ${error}`);
      return this.stats;
    }
  }

  /**
   * Processa um lote de arquivos
   */
  private async processBatch(filePaths: string[]): Promise<void> {
    const promises = filePaths.map(filePath => this.processFile(filePath));
    await Promise.allSettled(promises);
  }

  /**
   * Processa um arquivo individual
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      console.log(`🔄 Processando: ${filePath}`);
      
      // Parse do XML
      const evento = await this.parser.parseXMLFile(filePath);
      
      if (!evento) {
        this.stats.errorFiles++;
        this.stats.errors.push(`Falha no parse: ${filePath}`);
        return;
      }

      // Validação do evento
      const validationResult = this.validator.validate(evento);
      
      // Log de validação
      if (validationResult.errors.length > 0) {
        console.log(`❌ Erros de validação em ${filePath}:`);
        validationResult.errors.forEach(error => {
          console.log(`   - ${error}`);
          this.stats.errors.push(`${filePath}: ${error}`);
        });
        this.stats.validationErrors += validationResult.errors.length;
      }

      if (validationResult.warnings.length > 0) {
        console.log(`⚠️  Warnings de validação em ${filePath}:`);
        validationResult.warnings.forEach(warning => {
          console.log(`   - ${warning}`);
          this.stats.warnings.push(`${filePath}: ${warning}`);
        });
        this.stats.validationWarnings += validationResult.warnings.length;
      }

      // Verificar se há erros críticos de validação
      if (!validationResult.isValid) {
        this.stats.errorFiles++;
        console.log(`❌ Validação falhou para: ${filePath}`);
        return;
      }

      // Log de warnings se houver
      if (validationResult.warnings.length > 0) {
        console.log(`⚠️  Warnings para ${filePath}: ${validationResult.warnings.length}`);
      }

      // Verificar se o evento já existe
      const existingEvent = await this.checkEventExists(evento.id);
      if (existingEvent) {
        console.log(`⚠️  Evento já existe: ${evento.id}`);
        this.stats.processedFiles++;
        return;
      }

      // Inserir/atualizar funcionário se necessário
      if (evento.cpf) {
        await this.upsertFuncionario(evento);
      }

      // Inserir evento
      await this.insertEvent(evento);
      
      this.stats.processedFiles++;
      this.stats.insertedEvents++;
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${filePath}:`, error);
      this.stats.errorFiles++;
      this.stats.errors.push(`${filePath}: ${error}`);
    }
  }

  /**
   * Verifica se um evento já existe
   */
  private async checkEventExists(eventoId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('eventos_esocial')
        .select('id')
        .eq('evento_id', eventoId)
        .eq('empresa_id', this.empresaId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar evento existente:', error);
      return false;
    }
  }

  /**
   * Insere ou atualiza funcionário
   */
  private async upsertFuncionario(evento: ESocialEvent): Promise<void> {
    if (!evento.cpf) return;

    try {
      // Verificar se funcionário já existe
      const { data: existingFunc } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('cpf', evento.cpf)
        .eq('empresa_id', this.empresaId)
        .single();

      if (existingFunc) {
        // Atualizar dados se necessário
        if (evento.nome || evento.matricula) {
          const updateData: any = {};
          if (evento.nome) updateData.nome = evento.nome;
          if (evento.matricula) updateData.matricula_esocial = evento.matricula;

          await supabase
            .from('funcionarios')
            .update(updateData)
            .eq('id', existingFunc.id);
        }
      } else {
        // Inserir novo funcionário
        const { error } = await supabase
          .from('funcionarios')
          .insert({
            empresa_id: this.empresaId,
            nome: evento.nome || `Funcionário ${evento.cpf}`,
            cpf: evento.cpf,
            matricula_esocial: evento.matricula,
            status: true,
            ativo: true
          });

        if (error) {
          throw error;
        }

        this.stats.insertedFuncionarios++;
      }
    } catch (error) {
      console.error('Erro ao processar funcionário:', error);
      throw error;
    }
  }

  /**
   * Insere evento no banco
   */
  private async insertEvent(evento: ESocialEvent): Promise<void> {
    try {
      // Buscar funcionário se CPF estiver presente
      let funcionarioId = null;
      if (evento.cpf) {
        const { data: funcionario } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('cpf', evento.cpf)
          .eq('empresa_id', this.empresaId)
          .single();

        funcionarioId = funcionario?.id || null;
      }

      // Inserir evento
      const { error } = await supabase
        .from('eventos_esocial')
        .insert({
          empresa_id: this.empresaId,
          funcionario_id: funcionarioId,
          evento_id: evento.id,
          tipo_evento: evento.tipo,
          data_evento: evento.data_evento,
          periodo_apuracao: evento.periodo_apuracao,
          status: evento.status,
          xml_content: evento.xml_content,
          recibo_numero: evento.recibo,
          detalhes: evento.detalhes || {}
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Erro ao inserir evento:', error);
      throw error;
    }
  }

  /**
   * Lista todos os arquivos XML de uma pasta
   */
  private getXMLFiles(directoryPath: string): string[] {
    const files: string[] = [];
    
    try {
      const items = readdirSync(directoryPath);
      
      for (const item of items) {
        const fullPath = join(directoryPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isFile() && item.toLowerCase().endsWith('.xml')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
    }
    
    return files.sort();
  }

  /**
   * Imprime relatório final
   */
  private printFinalReport(): void {
    console.log('\n📊 RELATÓRIO FINAL DA IMPORTAÇÃO');
    console.log('=====================================');
    console.log(`📁 Total de arquivos: ${this.stats.totalFiles}`);
    console.log(`✅ Arquivos processados: ${this.stats.processedFiles}`);
    console.log(`❌ Arquivos com erro: ${this.stats.errorFiles}`);
    console.log(`📝 Eventos inseridos: ${this.stats.insertedEvents}`);
    console.log(`👥 Funcionários inseridos: ${this.stats.insertedFuncionarios}`);
    console.log(`🔍 Erros de validação: ${this.stats.validationErrors}`);
    console.log(`⚠️  Warnings de validação: ${this.stats.validationWarnings}`);
    
    if (this.stats.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS ENCONTRADOS:');
      this.stats.warnings.slice(0, 10).forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
      if (this.stats.warnings.length > 10) {
        console.log(`... e mais ${this.stats.warnings.length - 10} warnings`);
      }
    }
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      this.stats.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`... e mais ${this.stats.errors.length - 10} erros`);
      }
    }
    
    // Resumo da qualidade dos dados
    const successRate = this.stats.totalFiles > 0 ? 
      ((this.stats.processedFiles / this.stats.totalFiles) * 100).toFixed(1) : '0';
    
    console.log(`\n📈 Taxa de sucesso: ${successRate}%`);
    
    if (this.stats.validationErrors === 0 && this.stats.validationWarnings === 0) {
      console.log('🎯 Todos os dados passaram na validação!');
    } else if (this.stats.validationErrors === 0) {
      console.log('✅ Nenhum erro crítico de validação encontrado');
    }
    
    console.log('\n🎉 Importação concluída!');
  }

  /**
   * Limpa dados de importação anterior (use com cuidado!)
   */
  async clearPreviousImport(): Promise<void> {
    console.log('🧹 Limpando dados anteriores...');
    
    try {
      // Deletar eventos
      await supabase
        .from('eventos_esocial')
        .delete()
        .eq('empresa_id', this.empresaId);

      // Deletar funcionários sem outros vínculos
      await supabase
        .from('funcionarios')
        .delete()
        .eq('empresa_id', this.empresaId)
        .is('matricula_esocial', null);

      console.log('✅ Dados anteriores removidos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      throw error;
    }
  }
}

/**
 * Função principal de importação
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Uso: node import-esocial-xmls.js <empresa_id> <caminho_pasta_xml> [--clear]');
    console.log('Exemplo: node import-esocial-xmls.js f91e1374-b1e4-475e-9c90-2d475ca894e4 "C:\\XML EMPRESAS"');
    process.exit(1);
  }

  const empresaId = args[0];
  const xmlDirectory = args[1];
  const shouldClear = args.includes('--clear');

  console.log(`🏢 Empresa ID: ${empresaId}`);
  console.log(`📁 Pasta XML: ${xmlDirectory}`);
  
  const importer = new ESocialImporter(empresaId);

  try {
    // Limpar dados anteriores se solicitado
    if (shouldClear) {
      await importer.clearPreviousImport();
    }

    // Executar importação
    const stats = await importer.importFromDirectory(xmlDirectory);
    
    // Sair com código apropriado
    process.exit(stats.errorFiles > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { ESocialImporter, ImportStats };