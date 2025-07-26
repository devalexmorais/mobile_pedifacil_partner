import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export function useEstablishmentStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'partners', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsOpen(data.isOpen === true);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOpen, loading };
} 