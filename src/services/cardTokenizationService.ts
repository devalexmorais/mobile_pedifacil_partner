import { MERCADO_PAGO_CONFIG } from '../config/mercadoPago';

interface CardData {
  number: string;
  security_code: string;
  expiration_month: string;
  expiration_year: string;
  cardholder: {
    name: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface TokenResponse {
  id: string;
  public_key: string;
  first_six_digits: string;
  expiration_month: number;
  expiration_year: number;
  last_four_digits: string;
  cardholder: {
    name: string;
    identification: {
      type: string;
      number: string;
    };
  };
  status: string;
  date_created: string;
  date_last_updated: string;
  date_due: string;
  luhn_validation: boolean;
  live_mode: boolean;
  require_multiple_cards: boolean;
}

class CardTokenizationService {
  private readonly publicKey = MERCADO_PAGO_CONFIG.PUBLIC_KEY;

  /**
   * Tokeniza os dados do cartão de forma segura usando a API real do Mercado Pago
   */
  async createCardToken(cardData: CardData): Promise<TokenResponse> {
    try {
      console.log('🔐 Criando token do cartão (PRODUÇÃO):', {
        ...cardData,
        number: cardData.number.replace(/\d(?=\d{4})/g, '*'), // Mask card number for logging
        security_code: '***'
      });

      // Validar dados antes de enviar
      if (!cardData.cardholder.identification?.number) {
        throw new Error('CPF obrigatório para tokenização do cartão');
      }

      console.log('🔐 Dados sendo enviados para tokenização:', {
        ...cardData,
        number: cardData.number.replace(/\d(?=\d{4})/g, '*'),
        security_code: '***'
      });

      const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json',
          'X-Product-Id': 'pedifacil-partner',
          'X-Idempotency-Key': `token_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          'User-Agent': 'PediFacil-Partner/1.0'
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        console.error('❌ Erro na API do Mercado Pago:', errorData);
        
        // Mapear erros comuns
        if (response.status === 400) {
          throw new Error('Dados do cartão inválidos. Verifique as informações e tente novamente.');
        } else if (response.status === 401) {
          throw new Error('Erro de autenticação. Verifique as credenciais do Mercado Pago.');
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Verifique as permissões da conta.');
        }
        
        throw new Error(errorData.message || `Erro HTTP ${response.status}: Não foi possível processar o cartão`);
      }

      const tokenData = await response.json();
      console.log('✅ Token criado com sucesso (REAL):', tokenData.id);
      return tokenData;

    } catch (error: any) {
      console.error('❌ Erro ao tokenizar cartão:', error);
      throw new Error(error.message || 'Não foi possível processar os dados do cartão');
    }
  }



  /**
   * Valida e formata os dados do cartão antes da tokenização
   */
  prepareCardData(formData: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
  }, cpf?: string): CardData {
    // Remove espaços e formatação do número do cartão
    const cleanNumber = formData.number.replace(/\s/g, '');
    
    // Extrai mês e ano da validade
    const [month, year] = formData.expiry.split('/');
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    // Remove formatação do CPF se fornecido
    const cleanCpf = cpf?.replace(/\D/g, '') || '';

    return {
      number: cleanNumber,
      security_code: formData.cvv,
      expiration_month: month,
      expiration_year: fullYear,
      cardholder: {
        name: formData.name,
        identification: {
          type: 'CPF',
          number: cleanCpf
        }
      }
    };
  }

  /**
   * Valida os dados do cartão antes da tokenização
   */
  validateCardData(formData: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Valida número do cartão
    const cleanNumber = formData.number.replace(/\s/g, '');
    if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.push('Número do cartão inválido');
    }

    // Valida validade
    if (!formData.expiry || !formData.expiry.match(/^\d{2}\/\d{2}$/)) {
      errors.push('Data de validade inválida (use MM/AA)');
    } else {
      const [month, year] = formData.expiry.split('/');
      const currentDate = new Date();
      const cardDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      
      if (cardDate <= currentDate) {
        errors.push('Cartão expirado');
      }
    }

    // Valida CVV
    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      errors.push('CVV inválido');
    }

    // Valida nome
    if (!formData.name || formData.name.trim().length < 3) {
      errors.push('Nome no cartão inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formata o número do cartão com espaços
   */
  formatCardNumber(value: string): string {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  }

  /**
   * Formata a data de validade
   */
  formatExpiry(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  }

  /**
   * Formata o CPF
   */
  formatCpf(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
      .substring(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  /**
   * Identifica a bandeira do cartão pelo número
   */
  getCardBrand(number: string): string {
    const cleanNumber = number.replace(/\s/g, '');
    
    if (cleanNumber.match(/^4/)) return 'visa';
    if (cleanNumber.match(/^5[1-5]/)) return 'mastercard';
    if (cleanNumber.match(/^3[47]/)) return 'amex';
    if (cleanNumber.match(/^6011|^65/)) return 'discover';
    if (cleanNumber.match(/^4011|^431274|^438935|^451416|^457393|^504175|^627780|^636297|^636368/)) return 'elo';
    
    return 'unknown';
  }
}

export const cardTokenizationService = new CardTokenizationService(); 