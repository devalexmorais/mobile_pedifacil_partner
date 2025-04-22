import React, { createContext, useContext, useState } from 'react';

interface DeliverySettings {
  maxTime: string;
  minTime: string;
  minimumOrderAmount: string;
}

interface PickupSettings {
  enabled: boolean;
  estimatedTime: string;
}

interface PaymentOption {
  type: string;
  enabled: boolean;
  brands?: { [key: string]: boolean };
}

interface PaymentOptions {
  dinheiro: PaymentOption;
  pix: PaymentOption;
  cartao: PaymentOption;
}

interface ScheduleDay {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface ScheduleSettings {
  domingo: ScheduleDay;
  segunda: ScheduleDay;
  terca: ScheduleDay;
  quarta: ScheduleDay;
  quinta: ScheduleDay;
  sexta: ScheduleDay;
  sabado: ScheduleDay;
}

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
  neighborhoodName: string;
  city: string;
  cityName: string;
  state: string;
  stateName: string;
  
  // Configurações
  delivery: DeliverySettings;
  pickup: PickupSettings;
  paymentOptions: PaymentOptions;
  schedule: ScheduleSettings;
  
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
  neighborhoodName: '',
  city: '',
  cityName: '',
  state: '',
  stateName: '',
  delivery: {
    maxTime: '45',
    minTime: '20',
    minimumOrderAmount: '20',
  },
  pickup: {
    enabled: true,
    estimatedTime: '15',
  },
  paymentOptions: {
    dinheiro: { type: 'Dinheiro', enabled: true },
    pix: { type: 'PIX', enabled: true },
    cartao: { 
      type: 'Cartão', 
      enabled: true,
      brands: {
        visa: true,
        mastercard: true,
        elo: true,
        amex: false,
        hipercard: false,
      }
    },
  },
  schedule: {
    domingo: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    segunda: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    terca: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    quarta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    quinta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sexta: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sabado: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  },
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