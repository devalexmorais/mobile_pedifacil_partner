import { firebaseAuthService } from './firebaseAuth';
import { StoreRegistrationData } from '../types/auth';

interface RegistrationData {
  // Step 1: Basic Info
  email?: string;
  password?: string;
  name?: string;
  
  // Step 2: Store Info
  storeName?: string;
  cnpj_or_cpf?: string;
  category?: string;
  subcategory?: string;
  logoUrl?: string;
  
  // Step 3: Contact Info
  phone?: string;
  
  // Step 4: Address
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

class RegistrationService {
  private registrationData: RegistrationData = {};

  updateRegistrationData(data: Partial<RegistrationData>) {
    this.registrationData = { ...this.registrationData, ...data };
  }

  clearRegistrationData() {
    this.registrationData = {};
  }

  async completeRegistration(): Promise<void> {
    if (!this.validateRegistrationData()) {
      throw new Error('Dados de registro incompletos');
    }

    try {
      // Primeiro passo: registrar usuário básico
      const step1Response = await firebaseAuthService.registerStep1({
        email: this.registrationData.email!,
        password: this.registrationData.password!,
        name: this.registrationData.name!,
        storeName: this.registrationData.storeName!,
        category: this.registrationData.category!,
        subcategory: this.registrationData.subcategory!
      });

      // Segundo passo: completar registro com dados adicionais
      await firebaseAuthService.registerStep2({
        token: step1Response.token,
        phone: this.registrationData.phone!,
        cityId: this.registrationData.address?.city!,
        districtId: this.registrationData.address?.neighborhood!,
        street: this.registrationData.address?.street!,
        number: this.registrationData.address?.number!,
        complement: this.registrationData.address?.complement || '',
        cnpj_or_cpf: this.registrationData.cnpj_or_cpf!
      });

      // Limpar dados após registro bem-sucedido
      this.clearRegistrationData();
    } catch (error) {
      throw error;
    }
  }

  private validateRegistrationData(): boolean {
    const requiredFields: (keyof RegistrationData)[] = [
      'email',
      'password',
      'name',
      'storeName',
      'cnpj_or_cpf',
      'category',
      'subcategory',
      'phone',
      'logoUrl'
    ];

    const requiredAddressFields = [
      'street',
      'number',
      'neighborhood',
      'city',
      'state',
      'zipCode'
    ];

    // Verificar campos principais
    const hasAllRequiredFields = requiredFields.every(
      field => !!this.registrationData[field]
    );

    // Verificar campos de endereço
    const hasAllRequiredAddressFields = requiredAddressFields.every(
      field => !!(this.registrationData.address && this.registrationData.address[field as keyof typeof this.registrationData.address])
    );

    return hasAllRequiredFields && hasAllRequiredAddressFields;
  }
}

const registrationServiceInstance = new RegistrationService();

export const registrationService = {
  registerUser: (data: StoreRegistrationData) => {
    return firebaseAuthService.registerStep1(data);
  },
  updateRegistrationData: (data: Partial<RegistrationData>) => {
    registrationServiceInstance.updateRegistrationData(data);
  },
  clearRegistrationData: () => {
    registrationServiceInstance.clearRegistrationData();
  },
  completeRegistration: () => {
    return registrationServiceInstance.completeRegistration();
  }
};
