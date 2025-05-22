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
}

export const mercadoPagoService = new MercadoPagoService(); 