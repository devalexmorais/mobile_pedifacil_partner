import React, { createContext, useContext, useState } from 'react';
import { registrationService } from '../../../services/registration';

interface FormData {
  // Dados pessoais
  name: string;
  email: string;
  password: string;
  phone: string;
  
  // Endereço
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  
  // Documentos
  storeName: string;
  category: string;
  subcategory: string;
  cnpj_or_cpf: string;
  logoUrl?: string;
}

interface RegisterContextType {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  clearFormData: () => void;
  completeRegistration: () => Promise<void>;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  storeName: '',
  phone: '',
  cnpj_or_cpf: '',
  category: '',
  subcategory: '',
  logoUrl: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: ''
};

const RegisterContext = createContext<RegisterContextType | undefined>(undefined);

export function RegisterProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      // Atualizar o serviço de registro com os novos dados
      registrationService.updateRegistrationData({
        ...newData,
        address: {
          street: updated.street,
          number: updated.number,
          complement: updated.complement,
          neighborhood: updated.neighborhood,
          city: updated.city,
          state: updated.state,
          zipCode: updated.zipCode
        }
      });
      return updated;
    });
  };

  const clearFormData = () => {
    setFormData(initialFormData);
    registrationService.clearRegistrationData();
  };

  const completeRegistration = async () => {
    try {
      await registrationService.completeRegistration();
    } catch (error: any) {
      throw new Error(`Erro ao completar o registro: ${error.message}`);
    }
  };

  return (
    <RegisterContext.Provider 
      value={{ 
        formData, 
        updateFormData,
        clearFormData,
        completeRegistration
      }}
    >
      {children}
    </RegisterContext.Provider>
  );
}

export function useRegisterForm() {
  const context = useContext(RegisterContext);
  if (!context) {
    throw new Error('useRegisterForm deve ser usado dentro de um RegisterProvider');
  }
  return context;
}

export default RegisterProvider;