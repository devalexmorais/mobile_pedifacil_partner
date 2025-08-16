import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

type EstablishmentContextData = {
  isOpen: boolean;
  isActive: boolean;
  isBlocked: boolean;
  toggleEstablishment: () => void;
};

const EstablishmentContext = createContext<EstablishmentContextData>({} as EstablishmentContextData);

export function EstablishmentProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listener para mudanças no documento do parceiro
    const partnerRef = doc(db, 'partners', user.uid);
    const unsubscribe = onSnapshot(partnerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsOpen(data.isOpen || false);
        setIsActive(data.isActive !== false); // true se não for false
        setIsBlocked(data.isActive === false); // true se isActive for false
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleEstablishment = () => {
    setIsOpen(!isOpen);
  };

  return (
    <EstablishmentContext.Provider value={{ 
      isOpen, 
      isActive, 
      isBlocked, 
      toggleEstablishment 
    }}>
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