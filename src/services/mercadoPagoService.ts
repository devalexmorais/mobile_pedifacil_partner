import axios from 'axios';
import { MERCADO_PAGO_CONFIG } from '@/config/mercadoPago';

interface MercadoPagoPaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  point_of_interaction: {
    transaction_data: {
      qr_code: string;
      qr_code_base64: string;
      ticket_url?: string;
    };
  };
}

interface MercadoPagoCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface MercadoPagoCard {
  id: string;
  first_six_digits: string;
  last_four_digits: string;
  payment_method: {
    id: string;
    name: string;
  };
  cardholder: {
    name: string;
  };
}

interface MercadoPagoSubscription {
  id: string;
  status: string;
  reason: string;
  next_payment_date: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
}

class MercadoPagoService {
  private readonly baseUrl = 'https://api.mercadopago.com/v1';
  private readonly headers = {
    Authorization: `Bearer ${MERCADO_PAGO_CONFIG.ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  async createPixPayment(amount: number, description: string, email: string): Promise<MercadoPagoPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          transaction_amount: amount,
          description,
          payment_method_id: 'pix',
          payer: {
            email,
          },
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar pagamento Pix:', error);
      throw new Error('Não foi possível gerar o pagamento via Pix');
    }
  }

  async createBoletoPayment(
    amount: number,
    description: string,
    payer: {
      email: string;
      first_name: string;
      last_name: string;
      identification: {
        type: string;
        number: string;
      };
    }
  ): Promise<MercadoPagoPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          transaction_amount: amount,
          description,
          payment_method_id: 'bolbradesco',
          payer,
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar boleto:', error);
      throw new Error('Não foi possível gerar o boleto');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        { headers: this.headers }
      );

      return response.data.status;
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      throw new Error('Não foi possível verificar o status do pagamento');
    }
  }

  // Métodos para Customer
  async getCustomerByEmail(email: string): Promise<MercadoPagoCustomer | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers/search?email=${email}`,
        { headers: this.headers }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0];
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar customer por email:', error);
      return null;
    }
  }

  async createCustomer(customerData: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: {
      area_code: string;
      number: string;
    };
    identification?: {
      type: string;
      number: string;
    };
  }): Promise<MercadoPagoCustomer> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/customers`,
        customerData,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar customer:', error);
      throw new Error('Não foi possível criar o customer');
    }
  }

  // Métodos para Cartões
  async saveCard(customerId: string, cardData: any): Promise<MercadoPagoCard> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/customers/${customerId}/cards`,
        cardData,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      throw new Error('Não foi possível salvar o cartão');
    }
  }

  async getCustomerCards(customerId: string): Promise<MercadoPagoCard[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers/${customerId}/cards`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cartões do customer:', error);
      return [];
    }
  }

  async deleteCard(customerId: string, cardId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/customers/${customerId}/cards/${cardId}`,
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Erro ao deletar cartão:', error);
      throw new Error('Não foi possível deletar o cartão');
    }
  }

  // Métodos para Assinaturas
  async createSubscription(
    customerId: string,
    cardId: string,
    subscriptionData: {
      reason: string;
      auto_recurring: {
        frequency: number;
        frequency_type: string;
        transaction_amount: number;
        currency_id: string;
      };
      external_reference: string;
    }
  ): Promise<MercadoPagoSubscription> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/preapproval`,
        {
          ...subscriptionData,
          payer_email: customerId, // Usando customerId como email temporariamente
          card_token_id: cardId,
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw new Error('Não foi possível criar a assinatura');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/preapproval/${subscriptionId}`,
        { status: 'cancelled' },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw new Error('Não foi possível cancelar a assinatura');
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/preapproval/${subscriptionId}`,
        { status: 'paused' },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Erro ao pausar assinatura:', error);
      throw new Error('Não foi possível pausar a assinatura');
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      await axios.put(
        `${this.baseUrl}/preapproval/${subscriptionId}`,
        { status: 'authorized' },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Erro ao retomar assinatura:', error);
      throw new Error('Não foi possível retomar a assinatura');
    }
  }

  // Método para pagamento com cartão
  async createCardPayment(
    customerId: string,
    cardId: string,
    paymentData: {
      transaction_amount: number;
      description: string;
      payment_method_id: string;
      external_reference: string;
    }
  ): Promise<MercadoPagoPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          ...paymentData,
          payer: {
            id: customerId,
          },
          token: cardId,
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar pagamento com cartão:', error);
      throw new Error('Não foi possível processar o pagamento com cartão');
    }
  }
}

export const mercadoPagoService = new MercadoPagoService(); 