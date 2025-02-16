import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, doc, updateDoc, onSnapshot, orderBy, getDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

type Address = {
  city: string;
  complement?: string;
  neighborhood: string;
  number: string;
  state: string;
  street: string;
};

export type OrderItem = {
  name: string;
  price: number;
  productId: string;
  quantity: number;
  totalPrice: number;
};

type Payment = {
  method: string;
  status: string;
};

export type Pedido = {
  id: string;
  address: {
    city: string;
    complement?: string;
    neighborhood: string;
    number: string;
    state: string;
    street: string;
  };
  createdAt: string;
  deliveryFee: number;
  finalPrice: number;
  items: OrderItem[];
  payment: {
    method: string;
    status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  };
  storeId: string;
  totalPrice: number;
  updatedAt: string;
  userId: string;
};

type PedidosContextData = {
  pedidosPendentes: Pedido[];
  pedidosCozinha: Pedido[];
  pedidosProntos: Pedido[];
  pedidosEmEntrega: Pedido[];
  aceitarPedido: (pedido: Pedido) => void;
  recusarPedido: (pedidoId: string) => void;
  marcarComoPronto: (pedidoId: string) => void;
  marcarComoEmEntrega: (pedidoId: string) => void;
  marcarComoEntregue: (pedidoId: string) => void;
};

const PedidosContext = createContext<PedidosContextData>({} as PedidosContextData);

export function PedidosProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pedidosPendentes, setPedidosPendentes] = useState<Pedido[]>([]);
  const [pedidosCozinha, setPedidosCozinha] = useState<Pedido[]>([]);
  const [pedidosProntos, setPedidosProntos] = useState<Pedido[]>([]);
  const [pedidosEmEntrega, setPedidosEmEntrega] = useState<Pedido[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    console.log('Iniciando busca de pedidos...');
    
    // 1. Primeiro, vamos verificar se conseguimos acessar a coleção orders
    const ordersRef = collection(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders');
    
    // 2. Vamos tentar buscar o documento específico que sabemos que existe
    const pedidoRef = doc(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders', 'J2SXsffaiR0y42Z5Tl5M');
    
    getDoc(pedidoRef).then(docSnap => {
      console.log('Documento específico existe?', docSnap.exists());
      if (docSnap.exists()) {
        console.log('Dados do documento:', docSnap.data());
        console.log('Status do pagamento:', docSnap.data().payment?.status);
      }
    });

    // 3. Vamos buscar todos os documentos da coleção primeiro
    getDocs(ordersRef).then(snapshot => {
      console.log('Total de documentos na coleção:', snapshot.docs.length);
      snapshot.docs.forEach(doc => {
        console.log('ID do documento:', doc.id);
        console.log('Dados completos:', doc.data());
        console.log('Status do pagamento:', doc.data().payment?.status);
      });
    });

    // 4. Agora vamos criar a query com mais logs
    const pendentesQuery = query(
      ordersRef,
      where('status', '==', 'pending')
    );

    // 5. Listener com verificações adicionais
    const unsubPendentes = onSnapshot(pendentesQuery, (snapshot) => {
      console.log('Query executada');
      console.log('Documentos encontrados:', snapshot.docs.length);
      
      if (snapshot.empty) {
        console.log('Nenhum documento encontrado com status = pending');
      }

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Documento encontrado:', {
          id: doc.id,
          status: data.status,
          paymentMethod: data.payment?.method,
          rawData: data
        });
      });

      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            complement: data.address?.complement || '',
            neighborhood: data.address?.neighborhood || '',
            number: data.address?.number || '',
            state: data.address?.state || '',
            street: data.address?.street || ''
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: Number(data.deliveryFee) || 0,
          finalPrice: Number(data.finalPrice) || 0,
          items: data.items?.map((item: any) => ({
            name: item.name || '',
            price: Number(item.price) || 0,
            productId: item.productId || '',
            quantity: Number(item.quantity) || 0,
            totalPrice: Number(item.totalPrice) || 0
          })) || [],
          payment: {
            method: data.payment?.method || '',
            status: data.status || 'pending'
          },
          storeId: data.storeId || '',
          totalPrice: Number(data.totalPrice) || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || ''
        } as Pedido;
      });

      console.log('Pedidos processados:', pedidos);
      setPedidosPendentes(pedidos);
    }, (error) => {
      console.error('Erro no listener:', error);
    });

    // Query para pedidos na cozinha
    const cozinhaQuery = query(
      ordersRef,
      where('status', '==', 'preparing')
    );

    // Query para pedidos prontos
    const prontosQuery = query(
      ordersRef,
      where('status', 'in', ['ready', 'out_for_delivery'])
    );

    // Query para pedidos em entrega
    const emEntregaQuery = query(
      ordersRef,
      where('status', '==', 'out_for_delivery')
    );

    // Listener para pedidos na cozinha
    const unsubCozinha = onSnapshot(cozinhaQuery, (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            complement: data.address?.complement || '',
            neighborhood: data.address?.neighborhood || '',
            number: data.address?.number || '',
            state: data.address?.state || '',
            street: data.address?.street || ''
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: Number(data.deliveryFee) || 0,
          finalPrice: Number(data.finalPrice) || 0,
          items: data.items?.map((item: any) => ({
            name: item.name || '',
            options: item.options || [],
            price: Number(item.price) || 0,
            productId: item.productId || '',
            quantity: Number(item.quantity) || 0,
            totalPrice: Number(item.totalPrice) || 0
          })) || [],
          payment: {
            method: data.payment?.method || '',
            status: data.status || ''
          },
          storeId: data.storeId || '',
          totalPrice: Number(data.totalPrice) || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          status: data.status || 'pending'
        } as Pedido;
      });
      setPedidosCozinha(pedidos);
    });

    // Listener para pedidos prontos
    const unsubProntos = onSnapshot(prontosQuery, (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            complement: data.address?.complement || '',
            neighborhood: data.address?.neighborhood || '',
            number: data.address?.number || '',
            state: data.address?.state || '',
            street: data.address?.street || ''
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: Number(data.deliveryFee) || 0,
          finalPrice: Number(data.finalPrice) || 0,
          items: data.items?.map((item: any) => ({
            name: item.name || '',
            options: item.options || [],
            price: Number(item.price) || 0,
            productId: item.productId || '',
            quantity: Number(item.quantity) || 0,
            totalPrice: Number(item.totalPrice) || 0
          })) || [],
          payment: {
            method: data.payment?.method || '',
            status: data.status || ''
          },
          storeId: data.storeId || '',
          totalPrice: Number(data.totalPrice) || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          status: data.status || 'pending'
        } as Pedido;
      });
      setPedidosProntos(pedidos);
    });

    // Listener para pedidos em entrega
    const unsubEmEntrega = onSnapshot(emEntregaQuery, (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            complement: data.address?.complement || '',
            neighborhood: data.address?.neighborhood || '',
            number: data.address?.number || '',
            state: data.address?.state || '',
            street: data.address?.street || ''
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: Number(data.deliveryFee) || 0,
          finalPrice: Number(data.finalPrice) || 0,
          items: data.items?.map((item: any) => ({
            name: item.name || '',
            options: item.options || [],
            price: Number(item.price) || 0,
            productId: item.productId || '',
            quantity: Number(item.quantity) || 0,
            totalPrice: Number(item.totalPrice) || 0
          })) || [],
          payment: {
            method: data.payment?.method || '',
            status: data.status || ''
          },
          storeId: data.storeId || '',
          totalPrice: Number(data.totalPrice) || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          status: data.status || 'pending'
        } as Pedido;
      });
      setPedidosEmEntrega(pedidos);
    });

    return () => {
      unsubPendentes();
      unsubCozinha();
      unsubProntos();
      unsubEmEntrega();
    };
  }, [user]);

  const aceitarPedido = async (pedido: Pedido) => {
    if (!user?.uid) return;
    
    try {
      const pedidoRef = doc(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders', pedido.id);
      await updateDoc(pedidoRef, {
        status: 'preparing',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
    }
  };

  const recusarPedido = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao recusar pedido:', error);
    }
  };

  const marcarComoPronto = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'ready',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao marcar pedido como pronto:', error);
    }
  };

  const marcarComoEmEntrega = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'out_for_delivery',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao marcar pedido como em entrega:', error);
    }
  };

  const marcarComoEntregue = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', 'dkU6rAoQ8fWXJKYwQx6BQM1dYwy2', 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'delivered',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao marcar pedido como entregue:', error);
    }
  };

  return (
    <PedidosContext.Provider value={{
      pedidosPendentes,
      pedidosCozinha,
      pedidosProntos,
      pedidosEmEntrega,
      aceitarPedido,
      recusarPedido,
      marcarComoPronto,
      marcarComoEmEntrega,
      marcarComoEntregue,
    }}>
      {children}
    </PedidosContext.Provider>
  );
}

export function usePedidos() {
  const context = useContext(PedidosContext);

  if (!context) {
    throw new Error('usePedidos must be used within a PedidosProvider');
  }

  return context;
} 