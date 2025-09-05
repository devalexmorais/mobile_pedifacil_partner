import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, doc, updateDoc, onSnapshot, orderBy, getDoc, getDocs, DocumentData, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { establishmentService } from '../services/establishmentService';
import { notificationService } from '../services/notificationService';

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
  options?: {
    id: string;
    name: string;
    price: number;
  }[];
  requiredSelections?: {
    name: string;
    options: string[];
  }[];
};

type Payment = {
  method: string;
  status: string;
  cardFee?: {
    value: number;
    percentage: string;
    flag: string;
    flagName: string;
  };
  troco?: number;
  changeFor?: string;
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
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  deliveryFee: number;
  deliveryMode: 'pickup' | 'delivery';
  finalPrice: number;
  items: OrderItem[];
  payment: {
    method: string;
    status: string;
    cardFee?: {
      value: number;
      percentage: string;
      flag: string;
      flagName: string;
    };
    troco?: number;
    changeFor?: string;
  };
  storeId: string;
  totalPrice: number;
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
  userId: string;
  userName?: string;
  customerPhone?: string;
  status?: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'inactivity';
  observations?: string;
  coupon?: string;
  hasCoupon: boolean;
  couponCode: string;
  couponApplied?: {
    validUntil: string;
    validUntilTime: string;
    value: number;
  };
  inactivityMessage?: string;
};

type PedidosContextData = {
  pedidosPendentes: Pedido[];
  pedidosCozinha: Pedido[];
  pedidosProntos: Pedido[];
  pedidosEmEntrega: Pedido[];
  aceitarPedido: (pedido: Pedido) => void;
  recusarPedido: (pedidoId: string) => void;
  cancelarPedido: (pedidoId: string, userId: string) => void;
  marcarComoPronto: (pedidoId: string) => void;
  marcarComoEmEntrega: (pedidoId: string) => void;
  marcarComoEntregue: (pedidoId: string) => void;
};

const PedidosContext = createContext<PedidosContextData>({} as PedidosContextData);

interface UserData extends DocumentData {
  name: string;
}

export function PedidosProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pedidosPendentes, setPedidosPendentes] = useState<Pedido[]>([]);
  const [pedidosCozinha, setPedidosCozinha] = useState<Pedido[]>([]);
  const [pedidosProntos, setPedidosProntos] = useState<Pedido[]>([]);
  const [pedidosEmEntrega, setPedidosEmEntrega] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para ordenar pedidos por data de criação (mais antigos primeiro)
  const sortPedidosByDate = (pedidos: Pedido[]) => {
    return pedidos.sort((a, b) => {
      const dateA = new Date(a.createdAt.seconds * 1000 + a.createdAt.nanoseconds / 1000000);
      const dateB = new Date(b.createdAt.seconds * 1000 + b.createdAt.nanoseconds / 1000000);
      return dateA.getTime() - dateB.getTime(); // Mais antigos primeiro
    });
  };

  const fetchPedidos = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      const ordersRef = collection(db, 'partners', user.uid, 'orders');
      const q = query(
        ordersRef,
        where('status', 'in', ['pending', 'preparing', 'ready', 'out_for_delivery']),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const pedidos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pedido[];

      setPedidosPendentes(sortPedidosByDate(pedidos.filter(p => p.status === 'pending')));
      setPedidosCozinha(sortPedidosByDate(pedidos.filter(p => p.status === 'preparing')));
      setPedidosProntos(sortPedidosByDate(pedidos.filter(p => p.status === 'ready')));
      setPedidosEmEntrega(sortPedidosByDate(pedidos.filter(p => p.status === 'out_for_delivery')));
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    
    fetchPedidos();
    const unsubPendentes = onSnapshot(collection(db, 'partners', user.uid, 'orders'), (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            neighborhood: data.address?.neighborhood || '',
            street: data.address?.street || '',
            number: data.address?.number || '',
            complement: data.address?.complement || '',
            zipCode: data.address?.zipCode || '',
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: data.deliveryFee || 0,
          items: data.items || [],
          paymentMethod: data.paymentMethod || 'cash',
          status: data.status || 'pending',
          total: data.total || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          userName: data.userName || '',
          observations: data.observations || '',
          deliveryTime: data.deliveryTime || '',
          pickupTime: data.pickupTime || '',
        } as Pedido;
      });
      setPedidosPendentes(sortPedidosByDate(pedidos.filter(p => p.status === 'pending')));
      setPedidosCozinha(sortPedidosByDate(pedidos.filter(p => p.status === 'preparing')));
      setPedidosProntos(sortPedidosByDate(pedidos.filter(p => p.status === 'ready')));
      setPedidosEmEntrega(sortPedidosByDate(pedidos.filter(p => p.status === 'out_for_delivery')));
    });

    const unsubCozinha = onSnapshot(collection(db, 'partners', user.uid, 'orders'), (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            neighborhood: data.address?.neighborhood || '',
            street: data.address?.street || '',
            number: data.address?.number || '',
            complement: data.address?.complement || '',
            zipCode: data.address?.zipCode || '',
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: data.deliveryFee || 0,
          items: data.items || [],
          paymentMethod: data.paymentMethod || 'cash',
          status: data.status || 'pending',
          total: data.total || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          userName: data.userName || '',
          observations: data.observations || '',
          deliveryTime: data.deliveryTime || '',
          pickupTime: data.pickupTime || '',
        } as Pedido;
      });
      setPedidosCozinha(sortPedidosByDate(pedidos.filter(p => p.status === 'preparing')));
    });

    const unsubProntos = onSnapshot(collection(db, 'partners', user.uid, 'orders'), (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            neighborhood: data.address?.neighborhood || '',
            street: data.address?.street || '',
            number: data.address?.number || '',
            complement: data.address?.complement || '',
            zipCode: data.address?.zipCode || '',
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: data.deliveryFee || 0,
          items: data.items || [],
          paymentMethod: data.paymentMethod || 'cash',
          status: data.status || 'pending',
          total: data.total || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          userName: data.userName || '',
          observations: data.observations || '',
          deliveryTime: data.deliveryTime || '',
          pickupTime: data.pickupTime || '',
        } as Pedido;
      });
      setPedidosProntos(sortPedidosByDate(pedidos.filter(p => p.status === 'ready')));
    });

    const unsubEmEntrega = onSnapshot(collection(db, 'partners', user.uid, 'orders'), (snapshot) => {
      const pedidos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: {
            city: data.address?.city || '',
            neighborhood: data.address?.neighborhood || '',
            street: data.address?.street || '',
            number: data.address?.number || '',
            complement: data.address?.complement || '',
            zipCode: data.address?.zipCode || '',
          },
          createdAt: data.createdAt || new Date().toISOString(),
          deliveryFee: data.deliveryFee || 0,
          items: data.items || [],
          paymentMethod: data.paymentMethod || 'cash',
          status: data.status || 'pending',
          total: data.total || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
          userId: data.userId || '',
          userName: data.userName || '',
          observations: data.observations || '',
          deliveryTime: data.deliveryTime || '',
          pickupTime: data.pickupTime || '',
        } as Pedido;
      });
      setPedidosEmEntrega(sortPedidosByDate(pedidos.filter(p => p.status === 'out_for_delivery')));
    });

    return () => {
      unsubPendentes();
      unsubCozinha();
      unsubProntos();
      unsubEmEntrega();
    };
  }, [user?.uid, fetchPedidos]);

  const aceitarPedido = async (pedido: Pedido) => {
    if (!user?.uid) return;
    
    try {
      const pedidoRef = doc(db, 'partners', user.uid, 'orders', pedido.id);
      await updateDoc(pedidoRef, {
        status: 'preparing',
        updatedAt: new Date().toISOString()
      });
      
      // Registra atividade para evitar fechamento por inatividade
      establishmentService.registerOrderActivity();
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
    }
  };

  const recusarPedido = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', user.uid, 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      
      // Registra atividade para evitar fechamento por inatividade
      establishmentService.registerOrderActivity();
    } catch (error) {
      console.error('Erro ao recusar pedido:', error);
    }
  };

  const cancelarPedido = async (pedidoId: string, userId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', user.uid, 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      
      // Enviar notificação de cancelamento para o usuário
      await notificationService.sendOrderStatusNotificationToUser(
        userId,
        pedidoId,
        'cancelled',
        user.uid
      );
      
      // Registra atividade para evitar fechamento por inatividade
      establishmentService.registerOrderActivity();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
    }
  };

  const marcarComoPronto = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', user.uid, 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'ready',
        updatedAt: new Date().toISOString()
      });
      
      // Registra atividade para evitar fechamento por inatividade
      establishmentService.registerOrderActivity();
    } catch (error) {
      console.error('Erro ao marcar pedido como pronto:', error);
    }
  };

  const marcarComoEmEntrega = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      const pedidoRef = doc(db, 'partners', user.uid, 'orders', pedidoId);
      await updateDoc(pedidoRef, {
        status: 'out_for_delivery',
        updatedAt: new Date().toISOString()
      });
      
      // Registra atividade para evitar fechamento por inatividade
      establishmentService.registerOrderActivity();
    } catch (error) {
      console.error('Erro ao marcar pedido como em entrega:', error);
    }
  };

  const marcarComoEntregue = async (pedidoId: string) => {
    if (!user?.uid) return;

    try {
      console.log('🚀 INICIANDO PROCESSO DE ENTREGA E CÁLCULO DE TAXA');
      console.log(`📦 Pedido ID: ${pedidoId}`);
      console.log(`🏪 Parceiro ID: ${user.uid}`);
      
      // Referência para o pedido original
      const pedidoRef = doc(db, 'partners', user.uid, 'orders', pedidoId);
      console.log(`📄 Buscando dados do pedido em: ${pedidoRef.path}`);
      
      // Buscar dados do pedido
      const pedidoDoc = await getDoc(pedidoRef);
      if (!pedidoDoc.exists()) {
        console.error('❌ Pedido não encontrado');
        return;
      }
      const pedidoData = pedidoDoc.data();
      console.log('✅ Dados do pedido obtidos:', {
        totalPrice: pedidoData.totalPrice,
        deliveryFee: pedidoData.deliveryFee,
        paymentMethod: pedidoData.payment?.method,
        hasCoupon: pedidoData.hasCoupon,
        couponApplied: pedidoData.couponApplied
      });
      
      // Buscar informações do estabelecimento para verificar se é premium
      const partnerRef = doc(db, 'partners', user.uid);
      console.log(`🏢 Buscando dados do parceiro em: ${partnerRef.path}`);
      const partnerDoc = await getDoc(partnerRef);
      
      if (!partnerDoc.exists()) {
        console.error('❌ Parceiro não encontrado');
        return;
      }
      
      const partnerData = partnerDoc.data();
      const isPremium = partnerData.store?.isPremium || false;
      console.log('✅ Dados do parceiro obtidos:', {
        isPremium: isPremium,
        storeName: partnerData.name,
        email: partnerData.email
      });
      
      // Calcular a taxa com base no status premium
      // Taxa menor para estabelecimentos premium (5%) e maior para não premium (8%)
      const appFeePercentage = isPremium ? 0.05 : 0.08;
      console.log(`💰 TAXA APLICADA: ${(appFeePercentage * 100)}% (${isPremium ? 'PREMIUM' : 'NORMAL'})`);
      
      // Calcular o valor base para aplicação da taxa
      // O totalPrice já é o valor sem a taxa de entrega
      const totalPrice = Number(pedidoData.totalPrice || 0);
      const deliveryFee = Number(pedidoData.deliveryFee || 0);
      
      console.log('📊 VALORES DO PEDIDO:');
      console.log(`   💵 Total do pedido (sem entrega): R$ ${totalPrice.toFixed(2)}`);
      console.log(`   🚚 Taxa de entrega: R$ ${deliveryFee.toFixed(2)}`);
      
      // Calcular o valor base para a taxa (usar o totalPrice diretamente)
      const baseValue = Number(totalPrice.toFixed(2));
      console.log(`📈 VALOR BASE PARA TAXA: R$ ${baseValue.toFixed(2)}`);
      console.log(`   (Total do pedido = ${totalPrice})`);
      
      // Aplicar a porcentagem da taxa sobre o valor base e arredondar para 2 casas decimais
      const appFeeValue = Number((baseValue * appFeePercentage).toFixed(2));
      console.log(`💸 TAXA CALCULADA: R$ ${appFeeValue.toFixed(2)}`);
      console.log(`   (Base ${baseValue} × ${(appFeePercentage * 100)}% = ${appFeeValue})`);
      
      // Preparar os dados de taxas
      const now = Timestamp.now();

      // Converter createdAt do pedido para Timestamp
      let orderDate = now;
      if (pedidoData.createdAt) {
        if (pedidoData.createdAt instanceof Timestamp) {
          orderDate = pedidoData.createdAt;
        } else if (typeof pedidoData.createdAt === 'object' && 'seconds' in pedidoData.createdAt) {
          orderDate = new Timestamp(
            pedidoData.createdAt.seconds,
            pedidoData.createdAt.nanoseconds || 0
          );
        }
      }

      console.log('📋 PREPARANDO DADOS DA TAXA PARA SALVAMENTO');
      const appFeeData = {
        orderId: pedidoId,
        orderDate: orderDate,
        completedAt: now,
        storeId: pedidoData.storeId || user.uid,
        customerId: pedidoData.userId,
        paymentMethod: pedidoData.payment?.method || 'unknown',
        orderBaseValue: baseValue,
        orderTotalPrice: Number(totalPrice.toFixed(2)),
        orderDeliveryFee: Number(deliveryFee.toFixed(2)),
        orderCardFee: 0, // Não utilizado mais
        appFee: {
          percentage: appFeePercentage,
          value: appFeeValue,
          isPremiumRate: isPremium
        },
        settled: false,
        invoiceId: null
      };
      
      console.log('💾 DADOS DA TAXA PREPARADOS:', {
        orderId: appFeeData.orderId,
        storeId: appFeeData.storeId,
        customerId: appFeeData.customerId,
        paymentMethod: appFeeData.paymentMethod,
        orderBaseValue: appFeeData.orderBaseValue,
        orderTotalPrice: appFeeData.orderTotalPrice,
        orderDeliveryFee: appFeeData.orderDeliveryFee,
        appFee: appFeeData.appFee,
        settled: appFeeData.settled,
        invoiceId: appFeeData.invoiceId
      });
      
      // Atualizar o pedido original para marcar como entregue
      await updateDoc(pedidoRef, {
        status: 'delivered',
        updatedAt: now
      });
      
      // Registra atividade para evitar fechamento por inatividade
      establishmentService.registerOrderActivity();
      
      // Se o pedido tiver um cupom, adicionar à lista de cupons usados pelo usuário
      if (pedidoData.hasCoupon && pedidoData.couponCode && pedidoData.userId) {
        console.log('🎫 Dados do cupom encontrados:', {
          hasCoupon: pedidoData.hasCoupon,
          couponCode: pedidoData.couponCode,
          userId: pedidoData.userId,
          couponApplied: pedidoData.couponApplied
        });

        const userRef = doc(db, 'users', pedidoData.userId);
        console.log('👤 Referência do usuário criada:', userRef.path);
        
        // Criar referência para a subcoleção usedCoupons
        const usedCouponsRef = collection(userRef, 'usedCoupons');
        
        // Verificar se o cupom já existe na subcoleção
        const usedCouponsQuery = query(usedCouponsRef, where('code', '==', pedidoData.couponCode));
        const existingCoupons = await getDocs(usedCouponsQuery);
        
        if (existingCoupons.empty) {
          try {
            // Extrair dados do cupom do objeto couponApplied
            const couponData = {
              validUntil: pedidoData.couponApplied?.validUntil || '',
              validUntilTime: pedidoData.couponApplied?.validUntilTime || '',
              value: Number(pedidoData.couponApplied?.value) || 0
            };

            // Adicionar novo cupom à subcoleção com as informações adicionais
            await addDoc(usedCouponsRef, {
              code: pedidoData.couponCode,
              usedAt: new Date().toISOString(),
              orderId: pedidoId,
              usedBy: pedidoData.userId,
              validUntil: couponData.validUntil,
              validUntilTime: couponData.validUntilTime,
              value: couponData.value
            });
            console.log('✅ Cupom adicionado à subcoleção usedCoupons com sucesso:', {
              code: pedidoData.couponCode,
              validUntil: couponData.validUntil,
              validUntilTime: couponData.validUntilTime,
              value: couponData.value
            });
          } catch (error) {
            console.error('❌ Erro ao adicionar cupom à subcoleção:', error);
          }
        } else {
          console.log('ℹ️ Cupom já existe na subcoleção usedCoupons');
        }
      } else {
        console.log('ℹ️ Pedido não possui cupom ou dados necessários:', {
          hasCoupon: pedidoData.hasCoupon,
          couponCode: pedidoData.couponCode,
          userId: pedidoData.userId
        });
      }
      
      // Se o cupom for global (isGlobal: true), salvar na subcoleção credits do parceiro
      if (pedidoData.hasCoupon && pedidoData.couponApplied?.isGlobal === true) {
        console.log('🌍 Cupom global detectado, salvando na subcoleção credits do parceiro');
        
        try {
          const creditsRef = collection(db, 'partners', user.uid, 'credits');
          const creditData = {
            orderId: pedidoId,
            partnerId: user.uid,
            storeId: pedidoData.storeId || user.uid,
            couponCode: pedidoData.couponCode,
            couponIsGlobal: true,
            value: Number(pedidoData.couponApplied.discountValue || 0), // valor que a plataforma cobriu
            status: 'pending',
            createdAt: now
          };
          
          console.log('💳 Dados do crédito para salvar:', creditData);
          
          const creditDoc = await addDoc(creditsRef, creditData);
          console.log(`✅ Crédito global registrado com ID: ${creditDoc.id}`);
          console.log(`💰 Valor do crédito: R$ ${creditData.value.toFixed(2)}`);
        } catch (error) {
          console.error('❌ Erro ao salvar crédito global:', error);
        }
      } else if (pedidoData.hasCoupon) {
        console.log('🏪 Cupom não é global, não será salvo na subcoleção credits');
      }
      
      // Salvar na coleção app_fees
      const appFeesRef = collection(db, 'partners', user.uid, 'app_fees');
      console.log('📝 Salvando taxa na coleção app_fees:', appFeesRef.path);
      const appFeeDoc = await addDoc(appFeesRef, appFeeData);
      console.log(`✅ Taxa registrada com ID: ${appFeeDoc.id}`);
      
      console.log(`🎉 Pedido ${pedidoId} marcado como entregue com sucesso`);
      console.log(`💸 Taxa aplicada: ${(appFeePercentage * 100)}% (${isPremium ? 'Premium' : 'Normal'}) - Valor: R$ ${appFeeValue.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Erro ao marcar pedido como entregue:', error);
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
      cancelarPedido,
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