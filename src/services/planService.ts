import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const defaultPlans = [
  {
    name: "Plano Mensal",
    price: 49.90,
    days: 30,
    features: [
      "Acesso a todas as funcionalidades premium",
      "Suporte prioritário",
      "Relatórios avançados",
      "Sem limite de pedidos"
    ],
    isActive: true
  },
  {
    name: "Plano Trimestral",
    price: 129.90,
    days: 90,
    features: [
      "Todas as funcionalidades do plano mensal",
      "15% de desconto",
      "Consultoria personalizada",
      "Dashboard avançado"
    ],
    isActive: true
  },
  {
    name: "Plano Anual",
    price: 449.90,
    days: 365,
    features: [
      "Todas as funcionalidades do plano trimestral",
      "25% de desconto",
      "Acesso antecipado a novos recursos",
      "Suporte VIP 24/7"
    ],
    isActive: true
  }
];

export const createDefaultPlans = async () => {
  try {
    const plansRef = collection(db, 'plans');
    
    for (const plan of defaultPlans) {
      await addDoc(plansRef, plan);
    }
    
    console.log('Planos padrão criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar planos:', error);
  }
}; 