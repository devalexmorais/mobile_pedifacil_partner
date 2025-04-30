import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export function useEstablishmentStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    console.log('Iniciando listener do status da loja para usuário:', user.uid);

    const unsubscribe = onSnapshot(doc(db, 'partners', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('Status da loja atualizado:', data.isOpen);
        setIsOpen(data.isOpen === true);
      }
      setLoading(false);
    });

    return () => {
      console.log('Parando listener do status da loja');
      unsubscribe();
    };
  }, []);

  return { isOpen, loading };
} 