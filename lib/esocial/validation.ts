import { ESocialEvent } from './xml-parser';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  name: string;
  validate: (event: ESocialEvent) => ValidationResult;
}

/**
 * Classe para validação de eventos eSocial
 */
export class ESocialValidator {
  private rules: ValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Inicializa regras de validação padrão
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        name: 'required_fields',
        validate: this.validateRequiredFields.bind(this)
      },
      {
        name: 'cpf_format',
        validate: this.validateCPFFormat.bind(this)
      },
      {
        name: 'cnpj_format',
        validate: this.validateCNPJFormat.bind(this)
      },
      {
        name: 'date_format',
        validate: this.validateDateFormat.bind(this)
      },
      {
        name: 'event_type',
        validate: this.validateEventType.bind(this)
      },
      {
        name: 'period_format',
        validate: this.validatePeriodFormat.bind(this)
      },
      {
        name: 'xml_structure',
        validate: this.validateXMLStructure.bind(this)
      }
    ];
  }

  /**
   * Valida um evento eSocial
   */
  validate(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Executar todas as regras
    for (const rule of this.rules) {
      try {
        const ruleResult = rule.validate(event);
        
        result.errors.push(...ruleResult.errors);
        result.warnings.push(...ruleResult.warnings);
        
        if (!ruleResult.isValid) {
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push(`Erro na validação ${rule.name}: ${error}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Valida campos obrigatórios
   */
  private validateRequiredFields(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    // Campos sempre obrigatórios
    if (!event.id) {
      result.errors.push('ID do evento é obrigatório');
      result.isValid = false;
    }

    if (!event.tipo) {
      result.errors.push('Tipo do evento é obrigatório');
      result.isValid = false;
    }

    if (!event.cnpj || event.cnpj.trim() === '') {
      result.warnings.push('CNPJ não encontrado - pode ser necessário ajustar a extração');
    }

    if (!event.xml_content) {
      result.errors.push('Conteúdo XML é obrigatório');
      result.isValid = false;
    }

    // Campos específicos por tipo de evento
    switch (event.tipo) {
      case 'S-1200': // Remuneração
        if (!event.cpf) {
          result.errors.push('CPF é obrigatório para eventos S-1200');
          result.isValid = false;
        }
        if (!event.periodo_apuracao) {
          result.errors.push('Período de apuração é obrigatório para eventos S-1200');
          result.isValid = false;
        }
        break;

      case 'S-5001': // Informações das contribuições sociais
      case 'S-5002': // Imposto de Renda Retido na Fonte
        if (!event.periodo_apuracao) {
          result.errors.push(`Período de apuração é obrigatório para eventos ${event.tipo}`);
          result.isValid = false;
        }
        break;

      case 'S-3000': // Exclusão de eventos
        if (!event.data_evento) {
          result.warnings.push('Data do evento recomendada para eventos S-3000');
        }
        break;
    }

    return result;
  }

  /**
   * Valida formato do CPF
   */
  private validateCPFFormat(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    if (event.cpf) {
      // Remove caracteres não numéricos
      const cpfNumbers = event.cpf.replace(/\D/g, '');
      
      // Verifica se tem 11 dígitos
      if (cpfNumbers.length !== 11) {
        result.errors.push(`CPF deve ter 11 dígitos: ${event.cpf}`);
        result.isValid = false;
        return result;
      }

      // Verifica se não são todos iguais
      if (/^(\d)\1{10}$/.test(cpfNumbers)) {
        result.errors.push(`CPF inválido (dígitos iguais): ${event.cpf}`);
        result.isValid = false;
        return result;
      }

      // Validação do dígito verificador
      if (!this.isValidCPF(cpfNumbers)) {
        result.errors.push(`CPF inválido: ${event.cpf}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Valida formato do CNPJ
   */
  private validateCNPJFormat(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    if (event.cnpj) {
      // Remove caracteres não numéricos
      const cnpjNumbers = event.cnpj.replace(/\D/g, '');
      
      // Verifica se tem 8 ou 14 dígitos
      if (cnpjNumbers.length !== 8 && cnpjNumbers.length !== 14) {
        result.errors.push(`CNPJ deve ter 8 ou 14 dígitos: ${event.cnpj}`);
        result.isValid = false;
        return result;
      }

      // Verifica se não são todos iguais
      if (/^(\d)\1{13}$/.test(cnpjNumbers)) {
        result.errors.push(`CNPJ inválido (dígitos iguais): ${event.cnpj}`);
        result.isValid = false;
        return result;
      }

      // Validação do dígito verificador
      if (!this.isValidCNPJ(cnpjNumbers)) {
        result.errors.push(`CNPJ inválido: ${event.cnpj}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Valida formato de datas
   */
  private validateDateFormat(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    // Validar data_evento
    if (event.data_evento) {
      if (!this.isValidDate(event.data_evento)) {
        result.errors.push(`Data do evento inválida: ${event.data_evento}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Valida tipo de evento
   */
  private validateEventType(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    const validTypes = [
      'S-1000', 'S-1005', 'S-1010', 'S-1020', 'S-1030', 'S-1035', 'S-1040', 'S-1050', 'S-1060', 'S-1070', 'S-1080',
      'S-1200', 'S-1202', 'S-1207', 'S-1210', 'S-1250', 'S-1260', 'S-1270', 'S-1280', 'S-1298', 'S-1299',
      'S-2190', 'S-2200', 'S-2205', 'S-2206', 'S-2210', 'S-2220', 'S-2230', 'S-2240', 'S-2245', 'S-2250', 'S-2260', 'S-2298', 'S-2299', 'S-2300', 'S-2306', 'S-2399', 'S-2400', 'S-2405', 'S-2410', 'S-2416', 'S-2418', 'S-2420',
      'S-3000',
      'S-5001', 'S-5002', 'S-5003', 'S-5011', 'S-5012', 'S-5013'
    ];

    if (event.tipo && !validTypes.includes(event.tipo)) {
      result.warnings.push(`Tipo de evento não reconhecido: ${event.tipo}`);
    }

    return result;
  }

  /**
   * Valida formato do período de apuração
   */
  private validatePeriodFormat(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    if (event.periodo_apuracao) {
      // Formato esperado: YYYY-MM
      const periodRegex = /^\d{4}-\d{2}$/;
      
      if (!periodRegex.test(event.periodo_apuracao)) {
        result.errors.push(`Formato de período inválido (esperado YYYY-MM): ${event.periodo_apuracao}`);
        result.isValid = false;
        return result;
      }

      // Validar se é uma data válida
      const [year, month] = event.periodo_apuracao.split('-').map(Number);
      
      if (year < 2000 || year > new Date().getFullYear() + 1) {
        result.warnings.push(`Ano do período suspeito: ${year}`);
      }

      if (month < 1 || month > 12) {
        result.errors.push(`Mês inválido no período: ${month}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Valida estrutura básica do XML
   */
  private validateXMLStructure(event: ESocialEvent): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    if (event.xml_content) {
      // Verificar se contém elementos básicos do eSocial
      if (!event.xml_content.includes('<eSocial')) {
        result.errors.push('XML não contém elemento raiz eSocial');
        result.isValid = false;
      }

      // Verificar se contém assinatura digital
      if (!event.xml_content.includes('<Signature')) {
        result.warnings.push('XML não contém assinatura digital');
      }

      // Verificar se XML está bem formado (básico)
      const openTags = (event.xml_content.match(/</g) || []).length;
      const closeTags = (event.xml_content.match(/>/g) || []).length;
      
      if (openTags !== closeTags) {
        result.errors.push('XML pode estar mal formado (tags desbalanceadas)');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Valida CPF usando algoritmo oficial
   */
  private isValidCPF(cpf: string): boolean {
    // Primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    // Segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  /**
   * Valida CNPJ usando algoritmo oficial
   */
  private isValidCNPJ(cnpj: string): boolean {
    // CNPJ pode ter 8 dígitos (apenas raiz) ou 14 dígitos (completo)
    if (cnpj.length !== 8 && cnpj.length !== 14) {
      return false;
    }

    // Se tem 14 dígitos, valida o formato completo
    if (cnpj.length === 14) {
      // Validação básica do CNPJ
      if (cnpj === '00000000000000') return false;
      
      // Primeiro dígito verificador
      const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(cnpj.charAt(i)) * weights1[i];
      }
      let remainder = sum % 11;
      const digit1 = remainder < 2 ? 0 : 11 - remainder;
      if (digit1 !== parseInt(cnpj.charAt(12))) return false;

      // Segundo dígito verificador
      const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      sum = 0;
      for (let i = 0; i < 13; i++) {
        sum += parseInt(cnpj.charAt(i)) * weights2[i];
      }
      remainder = sum % 11;
      const digit2 = remainder < 2 ? 0 : 11 - remainder;
      if (digit2 !== parseInt(cnpj.charAt(13))) return false;
    }

    return true;
  }

  /**
   * Valida se uma string é uma data válida
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Adiciona uma regra de validação customizada
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove uma regra de validação
   */
  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }

  /**
   * Lista todas as regras ativas
   */
  getRules(): string[] {
    return this.rules.map(rule => rule.name);
  }
}

/**
 * Função utilitária para validação rápida
 */
export function validateESocialEvent(event: ESocialEvent): ValidationResult {
  const validator = new ESocialValidator();
  return validator.validate(event);
}

/**
 * Função para validar lote de eventos
 */
export function validateESocialBatch(events: ESocialEvent[]): { [eventId: string]: ValidationResult } {
  const validator = new ESocialValidator();
  const results: { [eventId: string]: ValidationResult } = {};

  for (const event of events) {
    results[event.id] = validator.validate(event);
  }

  return results;
}