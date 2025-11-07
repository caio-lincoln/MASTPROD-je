import { parseStringPromise } from 'xml2js';
import { readFileSync } from 'fs';

export interface ESocialEvent {
  id: string;
  tipo: string;
  tipoEvento?: string; // Adicionar para compatibilidade
  cnpj: string;
  cpf?: string;
  matricula?: string;
  nome?: string;
  data_evento: string;
  periodo_apuracao: string;
  xml_content: string;
  recibo?: string;
  status: 'processado' | 'erro' | 'preparando';
  detalhes?: any;
}

export interface ParsedESocialData {
  empresa: {
    cnpj: string;
    nome?: string;
  };
  eventos: ESocialEvent[];
  funcionarios: Array<{
    cpf: string;
    nome?: string;
    matricula?: string;
  }>;
}

export class ESocialXMLParser {
  
  /**
   * Parse um arquivo XML do eSocial
   */
  async parseXMLFile(filePath: string): Promise<ESocialEvent | null> {
    try {
      const xmlContent = readFileSync(filePath, 'utf-8');
      return await this.parseXMLContent(xmlContent, filePath);
    } catch (error) {
      console.error(`Erro ao processar arquivo ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse o conteúdo XML do eSocial
   */
  async parseXMLContent(xmlContent: string, fileName?: string): Promise<ESocialEvent | null> {
    try {
      const parsed = await parseStringPromise(xmlContent, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      });

      const eSocial = parsed.eSocial;
      if (!eSocial) {
        throw new Error('Estrutura eSocial não encontrada no XML');
      }

      // Extrair informações básicas
      const evento = this.extractEventInfo(eSocial, xmlContent, fileName);
      
      return evento;
    } catch (error) {
      console.error('Erro ao fazer parse do XML:', error);
      return null;
    }
  }

  /**
   * Extrai informações do evento baseado no tipo
   */
  private extractEventInfo(eSocial: any, xmlContent: string, fileName?: string): ESocialEvent {
    // Identificar tipo do evento pelo nome do arquivo ou estrutura
    const tipoEvento = this.identifyEventType(eSocial, fileName);
    
    // Extrair dados comuns
    const evento: ESocialEvent = {
      id: this.generateEventId(fileName),
      tipo: tipoEvento,
      tipoEvento: tipoEvento, // Adicionar para compatibilidade
      cnpj: this.extractCNPJ(eSocial),
      data_evento: new Date().toISOString(),
      periodo_apuracao: this.extractPeriodoApuracao(eSocial),
      xml_content: xmlContent,
      status: 'processado',
      recibo: this.extractRecibo(eSocial)
    };

    // Extrair dados específicos baseado no tipo
    switch (tipoEvento) {
      case 'S-1200': // Remuneração
        this.parseS1200(eSocial, evento);
        break;
      case 'S-5001': // Informações das contribuições sociais
        this.parseS5001(eSocial, evento);
        break;
      case 'S-5002': // Imposto de Renda Retido na Fonte
        this.parseS5002(eSocial, evento);
        break;
      case 'S-5003': // Informações do FGTS
        this.parseS5003(eSocial, evento);
        break;
      case 'S-1210': // Pagamentos de rendimentos
        this.parseS1210(eSocial, evento);
        break;
      case 'S-3000': // Exclusão de eventos
        this.parseS3000(eSocial, evento);
        break;
      case 'S-1299': // Fechamento dos eventos periódicos
        this.parseS1299(eSocial, evento);
        break;
      default:
        this.parseGenericEvent(eSocial, evento);
    }

    return evento;
  }

  /**
   * Identifica o tipo do evento
   */
  private identifyEventType(eSocial: any, fileName?: string): string {
    // Primeiro tenta pelo nome do arquivo
    if (fileName) {
      const match = fileName.match(/\.S-(\d+)\./); 
      if (match) {
        return `S-${match[1]}`;
      }
    }

    // Verifica primeiro na estrutura aninhada
    const nestedEvent = this.getNestedValue(eSocial, 'retornoProcessamentoDownload.evento.eSocial');
    if (nestedEvent) {
      const nestedEventKeys = Object.keys(nestedEvent).filter(key => !key.startsWith('xmlns') && !key.includes('Signature'));
      for (const key of nestedEventKeys) {
        if (key.startsWith('evt')) {
          const eventTypeMap: { [key: string]: string } = {
            'evtRemun': 'S-1200',
            'evtBasesTrab': 'S-5001',
            'evtIrrf': 'S-5002',
            'evtFGTS': 'S-5003',
            'evtPgtos': 'S-1210',
            'evtExclusao': 'S-3000',
            'evtFechaEvPer': 'S-1299'
          };
          
          return eventTypeMap[key] || 'DESCONHECIDO';
        }
      }
    }

    // Depois tenta pela estrutura do XML
    const eventKeys = Object.keys(eSocial).filter(key => !key.startsWith('xmlns') && !key.includes('Signature'));
    for (const key of eventKeys) {
      if (key.startsWith('evt')) {
        // Mapear tipos de eventos conhecidos
        const eventTypeMap: { [key: string]: string } = {
          'evtRemun': 'S-1200',
          'evtBasesTrab': 'S-5001',
          'evtIrrf': 'S-5002',
          'evtFGTS': 'S-5003',
          'evtPgtos': 'S-1210',
          'evtExclusao': 'S-3000',
          'evtFechaEvPer': 'S-1299'
        };
        
        return eventTypeMap[key] || 'DESCONHECIDO';
      }
    }

    return 'DESCONHECIDO';
  }

  /**
   * Extrai CNPJ do empregador
   */
  private extractCNPJ(eSocial: any): string {
    try {
      // Procurar em diferentes estruturas possíveis
      const paths = [
        'evtRemun.ideEmpregador.nrInsc',
        'evtBasesTrab.ideEmpregador.nrInsc',
        'evtIrrf.ideEmpregador.nrInsc',
        'evtFGTS.ideEmpregador.nrInsc',
        'evtPgtos.ideEmpregador.nrInsc',
        'evtExclusao.ideEmpregador.nrInsc',
        'evtFechaEvPer.ideEmpregador.nrInsc',
        // Para estruturas aninhadas com retornoProcessamentoDownload
        'retornoProcessamentoDownload.evento.eSocial.evtBasesTrab.ideEmpregador.nrInsc',
        'retornoProcessamentoDownload.evento.eSocial.evtRemun.ideEmpregador.nrInsc',
        'retornoProcessamentoDownload.evento.eSocial.evtInfoComplPer.ideEmpregador.nrInsc'
      ];

      for (const path of paths) {
        const value = this.getNestedValue(eSocial, path);
        if (value) {
          return this.formatCNPJ(value);
        }
      }

      return '';
    } catch (error) {
      console.error('Erro ao extrair CNPJ:', error);
      return '';
    }
  }

  /**
   * Extrai período de apuração
   */
  private extractPeriodoApuracao(eSocial: any): string {
    try {
      const paths = [
        'evtRemun.ideEvento.perApur',
        'evtBasesTrab.ideEvento.perApur',
        'evtIrrf.ideEvento.perApur',
        'evtFGTS.ideEvento.perApur',
        'evtPgtos.ideEvento.perApur',
        'evtFechaEvPer.ideEvento.perApur',
        // Para estruturas aninhadas com retornoProcessamentoDownload
        'retornoProcessamentoDownload.evento.eSocial.evtBasesTrab.ideEvento.perApur',
        'retornoProcessamentoDownload.evento.eSocial.evtRemun.ideEvento.perApur',
        'retornoProcessamentoDownload.evento.eSocial.evtInfoComplPer.ideEvento.perApur'
      ];

      for (const path of paths) {
        const value = this.getNestedValue(eSocial, path);
        if (value) {
          return value;
        }
      }

      return '';
    } catch (error) {
      console.error('Erro ao extrair período de apuração:', error);
      return '';
    }
  }

  /**
   * Extrai número do recibo
   */
  private extractRecibo(eSocial: any): string | undefined {
    try {
      const retornoEvento = eSocial.retornoEvento;
      if (retornoEvento && retornoEvento.eSocial && retornoEvento.eSocial.retornoProcessamento) {
        return retornoEvento.eSocial.retornoProcessamento.dadosRecepcao?.numeroRecibo;
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Parse evento S-1200 (Remuneração)
   */
  private parseS1200(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtRemun = eSocial.evtRemun;
      if (evtRemun) {
        const ideTrabalhador = evtRemun.ideTrabalhador;
        if (ideTrabalhador) {
          evento.cpf = ideTrabalhador.cpfTrab;
          evento.matricula = ideTrabalhador.matricula;
        }

        // Extrair informações de remuneração
        evento.detalhes = {
          tipo_evento: 'Remuneração de trabalhador',
          remuneracao: evtRemun.dmDev || {},
          trabalhador: ideTrabalhador || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-1200:', error);
    }
  }

  /**
   * Parse evento S-5001 (Informações das contribuições sociais)
   */
  private parseS5001(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtBasesTrab = eSocial.evtBasesTrab;
      if (evtBasesTrab) {
        const ideTrabalhador = evtBasesTrab.ideTrabalhador;
        if (ideTrabalhador) {
          evento.cpf = ideTrabalhador.cpfTrab;
          evento.matricula = ideTrabalhador.matricula;
        }

        evento.detalhes = {
          tipo_evento: 'Informações das contribuições sociais por trabalhador',
          bases_contribuicao: evtBasesTrab.infoCpCalc || {},
          trabalhador: ideTrabalhador || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-5001:', error);
    }
  }

  /**
   * Parse evento S-5002 (IRRF)
   */
  private parseS5002(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtIrrf = eSocial.evtIrrf;
      if (evtIrrf) {
        const ideTrabalhador = evtIrrf.ideTrabalhador;
        if (ideTrabalhador) {
          evento.cpf = ideTrabalhador.cpfTrab;
          evento.matricula = ideTrabalhador.matricula;
        }

        evento.detalhes = {
          tipo_evento: 'Imposto de Renda Retido na Fonte por trabalhador',
          irrf: evtIrrf.infoIrrf || {},
          trabalhador: ideTrabalhador || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-5002:', error);
    }
  }

  /**
   * Parse evento S-5003 (FGTS)
   */
  private parseS5003(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtFGTS = eSocial.evtFGTS;
      if (evtFGTS) {
        const ideTrabalhador = evtFGTS.ideTrabalhador;
        if (ideTrabalhador) {
          evento.cpf = ideTrabalhador.cpfTrab;
          evento.matricula = ideTrabalhador.matricula;
        }

        evento.detalhes = {
          tipo_evento: 'Informações do FGTS por trabalhador',
          fgts: evtFGTS.infoFGTS || {},
          trabalhador: ideTrabalhador || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-5003:', error);
    }
  }

  /**
   * Parse evento S-1210 (Pagamentos)
   */
  private parseS1210(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtPgtos = eSocial.evtPgtos;
      if (evtPgtos) {
        const ideBenef = evtPgtos.ideBenef;
        if (ideBenef) {
          evento.cpf = ideBenef.cpfBenef;
        }

        evento.detalhes = {
          tipo_evento: 'Pagamentos de rendimentos do trabalho',
          pagamentos: evtPgtos.infoPgto || {},
          beneficiario: ideBenef || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-1210:', error);
    }
  }

  /**
   * Parse evento S-3000 (Exclusão)
   */
  private parseS3000(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtExclusao = eSocial.evtExclusao;
      if (evtExclusao) {
        evento.detalhes = {
          tipo_evento: 'Exclusão de eventos',
          exclusao: evtExclusao.infoExclusao || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-3000:', error);
    }
  }

  /**
   * Parse evento S-1299 (Fechamento)
   */
  private parseS1299(eSocial: any, evento: ESocialEvent): void {
    try {
      const evtFechaEvPer = eSocial.evtFechaEvPer;
      if (evtFechaEvPer) {
        evento.detalhes = {
          tipo_evento: 'Fechamento dos eventos periódicos',
          fechamento: evtFechaEvPer.infoFech || {}
        };
      }
    } catch (error) {
      console.error('Erro ao processar S-1299:', error);
    }
  }

  /**
   * Parse genérico para eventos não mapeados
   */
  private parseGenericEvent(eSocial: any, evento: ESocialEvent): void {
    evento.detalhes = {
      tipo_evento: 'Evento genérico',
      dados: eSocial
    };
  }

  /**
   * Utilitários
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private formatCNPJ(cnpj: string): string {
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private generateEventId(fileName?: string): string {
    if (fileName) {
      const match = fileName.match(/ID(\d+)/);
      if (match) {
        return match[1];
      }
    }
    return Date.now().toString();
  }

  /**
   * Parse múltiplos arquivos XML
   */
  async parseMultipleFiles(filePaths: string[]): Promise<ParsedESocialData> {
    const eventos: ESocialEvent[] = [];
    const funcionariosMap = new Map<string, any>();
    let empresa: any = {};

    for (const filePath of filePaths) {
      const evento = await this.parseXMLFile(filePath);
      if (evento) {
        eventos.push(evento);

        // Coletar dados da empresa
        if (evento.cnpj && !empresa.cnpj) {
          empresa.cnpj = evento.cnpj;
        }

        // Coletar dados dos funcionários
        if (evento.cpf) {
          funcionariosMap.set(evento.cpf, {
            cpf: evento.cpf,
            nome: evento.nome,
            matricula: evento.matricula
          });
        }
      }
    }

    return {
      empresa,
      eventos,
      funcionarios: Array.from(funcionariosMap.values())
    };
  }
}

export default ESocialXMLParser;
