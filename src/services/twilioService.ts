import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// Tipos para as respostas das funções
interface SendVerificationResponse {
  success: boolean;
  sid: string;
  status: string;
  message: string;
}

interface VerifyCodeResponse {
  success: boolean;
  valid: boolean;
  status: string;
  message: string;
}

interface TestCredentialsResponse {
  success: boolean;
  message?: string;
  accountInfo?: {
    friendlyName: string;
    status: string;
  };
  error?: any;
}

// Referências para as Cloud Functions
const sendSMSVerificationFunction = httpsCallable<{ phone: string }, SendVerificationResponse>(
  functions,
  'sendSMSVerification'
);

const verifySMSCodeFunction = httpsCallable<{ phone: string; code: string }, VerifyCodeResponse>(
  functions,
  'verifySMSCode'
);

const testTwilioCredentialsFunction = httpsCallable<{}, TestCredentialsResponse>(
  functions,
  'testTwilioCredentials'
);

// Funções alternativas para conta de teste
const sendSMSDirectlyFunction = httpsCallable<{ phone: string }, SendVerificationResponse>(
  functions,
  'sendSMSDirectly'
);

const verifySMSDirectlyFunction = httpsCallable<{ phone: string; code: string }, VerifyCodeResponse>(
  functions,
  'verifySMSDirectly'
);

export class TwilioService {
  /**
   * Testa as credenciais do Twilio
   * @returns Resposta do teste
   */
  static async testCredentials(): Promise<TestCredentialsResponse> {
    try {
      console.log('Testando credenciais do Twilio...');
      
      const result = await testTwilioCredentialsFunction({});
      
      if (result.data) {
        console.log('Resultado do teste:', result.data);
        return result.data;
      } else {
        throw new Error('Resposta inválida da função');
      }
    } catch (error: any) {
      console.error('Erro ao testar credenciais:', error);
      throw new Error(error.message || 'Erro ao testar credenciais');
    }
  }

  /**
   * Envia código de verificação SMS via Twilio
   * @param phone Número de telefone no formato +5511999999999
   * @returns Resposta da verificação
   */
  static async sendVerificationCode(phone: string): Promise<SendVerificationResponse> {
    try {
      // Formatar o telefone para o padrão internacional brasileiro
      const formattedPhone = this.formatPhoneNumber(phone);
      
      console.log('Enviando código de verificação para:', formattedPhone);
      
      const result = await sendSMSVerificationFunction({ phone: formattedPhone });
      
      if (result.data) {
        console.log('Código enviado com sucesso:', result.data);
        return result.data;
      } else {
        throw new Error('Resposta inválida da função');
      }
    } catch (error: any) {
      console.error('Erro ao enviar código de verificação:', error);
      throw new Error(error.message || 'Erro ao enviar código de verificação');
    }
  }

  /**
   * Envia código de verificação SMS via Twilio (método direto para conta de teste)
   * @param phone Número de telefone no formato +5511999999999
   * @returns Resposta da verificação
   */
  static async sendVerificationCodeDirect(phone: string): Promise<SendVerificationResponse> {
    try {
      // Formatar o telefone para o padrão internacional brasileiro
      const formattedPhone = this.formatPhoneNumber(phone);
      
      console.log('Enviando código de verificação (direto) para:', formattedPhone);
      
      const result = await sendSMSDirectlyFunction({ phone: formattedPhone });
      
      if (result.data) {
        console.log('Código enviado com sucesso (direto):', result.data);
        return result.data;
      } else {
        throw new Error('Resposta inválida da função');
      }
    } catch (error: any) {
      console.error('Erro ao enviar código de verificação (direto):', error);
      throw new Error(error.message || 'Erro ao enviar código de verificação');
    }
  }

  /**
   * Verifica o código SMS enviado pelo Twilio
   * @param phone Número de telefone no formato +5511999999999
   * @param code Código de 6 dígitos
   * @returns Resposta da verificação
   */
  static async verifyCode(phone: string, code: string): Promise<VerifyCodeResponse> {
    try {
      // Formatar o telefone para o padrão internacional brasileiro
      const formattedPhone = this.formatPhoneNumber(phone);
      
      console.log('Verificando código:', code, 'para o telefone:', formattedPhone);
      
      const result = await verifySMSCodeFunction({ 
        phone: formattedPhone, 
        code: code.trim() 
      });
      
      if (result.data) {
        console.log('Resposta da verificação:', result.data);
        return result.data;
      } else {
        throw new Error('Resposta inválida da função');
      }
    } catch (error: any) {
      console.error('Erro ao verificar código:', error);
      throw new Error(error.message || 'Erro ao verificar código');
    }
  }

  /**
   * Verifica o código SMS enviado pelo Twilio (método direto para conta de teste)
   * @param phone Número de telefone no formato +5511999999999
   * @param code Código de 6 dígitos
   * @returns Resposta da verificação
   */
  static async verifyCodeDirect(phone: string, code: string): Promise<VerifyCodeResponse> {
    try {
      // Formatar o telefone para o padrão internacional brasileiro
      const formattedPhone = this.formatPhoneNumber(phone);
      
      console.log('Verificando código (direto):', code, 'para o telefone:', formattedPhone);
      
      const result = await verifySMSDirectlyFunction({ 
        phone: formattedPhone, 
        code: code.trim() 
      });
      
      if (result.data) {
        console.log('Resposta da verificação (direto):', result.data);
        return result.data;
      } else {
        throw new Error('Resposta inválida da função');
      }
    } catch (error: any) {
      console.error('Erro ao verificar código (direto):', error);
      throw new Error(error.message || 'Erro ao verificar código');
    }
  }

  /**
   * Formatar número de telefone brasileiro para o padrão internacional
   * @param phone Número de telefone
   * @returns Telefone formatado no padrão +5511999999999
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Se já começa com 55 (código do Brasil), adiciona apenas o +
    if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
      return `+${digitsOnly}`;
    }
    
    // Se não tem o código do país, adiciona +55
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      return `+55${digitsOnly}`;
    }
    
    // Se já está no formato completo, retorna como está
    if (phone.startsWith('+55')) {
      return phone;
    }
    
    throw new Error('Formato de telefone inválido');
  }

  /**
   * Valida se o número de telefone está no formato correto
   * @param phone Número de telefone
   * @returns true se válido
   */
  static isValidPhoneNumber(phone: string): boolean {
    try {
      const formatted = this.formatPhoneNumber(phone);
      // Verifica se está no formato brasileiro +55NNNNNNNNNN (10 ou 11 dígitos após +55)
      const phoneRegex = /^\+55\d{10,11}$/;
      return phoneRegex.test(formatted);
    } catch {
      return false;
    }
  }

  /**
   * Formatar telefone para exibição (11) 99999-9999
   * @param phone Número de telefone
   * @returns Telefone formatado para exibição
   */
  static formatPhoneDisplay(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Remove o código do país se presente
    let localPhone = digitsOnly;
    if (localPhone.startsWith('55') && localPhone.length > 11) {
      localPhone = localPhone.substring(2);
    }
    
    // Formatar para (11) 99999-9999 ou (11) 9999-9999
    if (localPhone.length === 11) {
      return `(${localPhone.substring(0, 2)}) ${localPhone.substring(2, 7)}-${localPhone.substring(7)}`;
    } else if (localPhone.length === 10) {
      return `(${localPhone.substring(0, 2)}) ${localPhone.substring(2, 6)}-${localPhone.substring(6)}`;
    }
    
    return phone;
  }
} 