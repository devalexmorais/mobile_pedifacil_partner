import React, { createContext, useContext, useState } from 'react';

interface RegisterFormData {
  // Dados básicos
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Telefone
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
}

interface RegisterFormContextType {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  resetForm: () => void;
}

const initialFormData: RegisterFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  storeName: '',
  category: '',
  subcategory: '',
  cnpj_or_cpf: '',
};

const RegisterFormContext = createContext<RegisterFormContextType | undefined>(undefined);

export function RegisterFormProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);

  const updateFormData = (newData: Partial<RegisterFormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  return (
    <RegisterFormContext.Provider value={{ formData, updateFormData, resetForm }}>
      {children}
    </RegisterFormContext.Provider>
  );
}

export function useRegisterForm() {
  const context = useContext(RegisterFormContext);
  if (context === undefined) {
    throw new Error('useRegisterForm deve ser usado dentro de um RegisterFormProvider');
  }
  return context;
} 