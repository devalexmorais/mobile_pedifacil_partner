import React, { createContext, useContext, useState } from 'react';

type EstablishmentContextData = {
  isOpen: boolean;
  toggleEstablishment: () => void;
};

const EstablishmentContext = createContext<EstablishmentContextData>({} as EstablishmentContextData);

export function EstablishmentProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleEstablishment = () => {
    setIsOpen(!isOpen);
  };

  return (
    <EstablishmentContext.Provider value={{ isOpen, toggleEstablishment }}>
      {children}
    </EstablishmentContext.Provider>
  );
}

export function useEstablishment() {
  const context = useContext(EstablishmentContext);

  if (!context) {
    throw new Error('useEstablishment must be used within an EstablishmentProvider');
  }

  return context;
} 