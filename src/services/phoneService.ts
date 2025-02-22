import { FirebaseError } from 'firebase/app';
import { 
  getAuth, 
  PhoneAuthProvider, 
  signInWithCredential,
} from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { app } from '../config/firebase';

let recaptchaVerifier: FirebaseRecaptchaVerifierModal | null = null;

export const phoneService = {
  setRecaptchaVerifier(verifier: FirebaseRecaptchaVerifierModal) {
    recaptchaVerifier = verifier;
  },

  async sendVerificationCode(phoneNumber: string): Promise<string> {
    try {
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA não inicializado');
      }

      const auth = getAuth();
      const provider = new PhoneAuthProvider(auth);
      
      // Formata o número para padrão internacional
      const formattedPhone = phoneNumber.startsWith('+55') 
        ? phoneNumber 
        : `+55${phoneNumber.replace(/\D/g, '')}`;

      // Envia o código SMS usando o reCAPTCHA
      const verificationId = await provider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier
      );

      return verificationId;
    } catch (error) {
      console.error('Erro ao enviar código:', error);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-phone-number':
            throw new Error('Número de telefone inválido');
          case 'auth/too-many-requests':
            throw new Error('Muitas tentativas. Tente novamente mais tarde');
          default:
            throw new Error('Erro ao enviar o código. Tente novamente');
        }
      }
      throw error;
    }
  },

  async verifyCode(verificationId: string, code: string): Promise<boolean> {
    try {
      const auth = getAuth();
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
      return true;
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-verification-code':
            throw new Error('Código inválido');
          case 'auth/code-expired':
            throw new Error('Código expirado');
          default:
            throw new Error('Erro ao verificar o código');
        }
      }
      throw error;
    }
  }
}; 