import { db } from '@/config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { notificationService } from './notificationService';

export interface Coupon {
  id?: string;
  code: string;
  storeId: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  validUntil: string;
  validUntilTime: string;
  isActive: boolean;
  usedBy: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponWithStatus extends Omit<Coupon, 'id'> {
  id: string;
  isExpired: boolean;
  validity: string;
}

// Função para buscar todos os usuários
const getAllUsers = async (): Promise<string[]> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    console.log(`Encontrados ${userIds.length} usuários para notificação`);
    return userIds;
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
};

// Função para enviar notificação de cupom para todos os usuários
const sendCouponNotificationToUsers = async (
  coupon: Coupon, 
  action: 'created' | 'activated',
  storeName?: string
) => {
  try {
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('Nenhum usuário encontrado para enviar notificação');
      return;
    }

    const discountText = coupon.discountType === 'percentage' 
      ? `${coupon.value}% de desconto`
      : `R$ ${coupon.value.toFixed(2)} de desconto`;

    const title = '🎉 Novo Cupom Disponível!';

    const body = `${storeName || 'Estabelecimento'} criou um novo cupom: ${coupon.code} - ${discountText}`;

    // Limitar o número de usuários para evitar sobrecarga (máximo 100)
    const limitedUsers = users.slice(0, 100);
    console.log(`Enviando notificação para ${limitedUsers.length} usuários (limitado de ${users.length})`);

    // Enviar notificação para cada usuário em lotes
    const batchSize = 10;
    for (let i = 0; i < limitedUsers.length; i += batchSize) {
      const batch = limitedUsers.slice(i, i + batchSize);
      
      const notificationPromises = batch.map(userId => 
        notificationService.sendOrderNotification(userId, {
          id: '',
          title,
          body,
          createdAt: new Date(),
          read: false,
          data: {
            type: 'coupon',
            action,
            couponCode: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.value,
            storeId: coupon.storeId,
            storeName
          }
        }).catch(error => {
          console.error(`Erro ao enviar notificação para usuário ${userId}:`, error);
          return null; // Continuar com outros usuários mesmo se um falhar
        })
      );

      await Promise.all(notificationPromises);
      console.log(`Lote ${Math.floor(i / batchSize) + 1} processado (${batch.length} usuários)`);
      
      // Pequena pausa entre lotes para evitar sobrecarga
      if (i + batchSize < limitedUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Notificação de cupom enviada com sucesso para ${limitedUsers.length} usuários`);

    // Também enviar notificação push local para o parceiro
    try {
      await notificationService.sendPushNotification(title, body, {
        type: 'coupon',
        action,
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.value,
        storeId: coupon.storeId,
        storeName
      });
      console.log('✅ Notificação push local enviada para o parceiro');
    } catch (pushError) {
      console.error('❌ Erro ao enviar notificação push:', pushError);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de cupom:', error);
  }
};

// Função para buscar nome do estabelecimento
const getStoreName = async (storeId: string): Promise<string | undefined> => {
  try {
    const partnerRef = doc(db, 'partners', storeId);
    const partnerDoc = await getDoc(partnerRef);
    if (partnerDoc.exists()) {
      const data = partnerDoc.data();
      // Buscar o nome da loja no objeto store
      return data.store?.name || data.storeName || data.name;
    }
    return undefined;
  } catch (error) {
    console.error('Erro ao buscar nome do estabelecimento:', error);
    return undefined;
  }
};

export const couponService = {
  // Criar um novo cupom
  async createCoupon(coupon: Omit<Coupon, 'createdAt' | 'updatedAt'>): Promise<Coupon> {
    const partnersRef = collection(db, 'partners');
    const partnerDoc = doc(partnersRef, coupon.storeId);
    const couponsRef = collection(partnerDoc, 'coupons');
    
    const newCoupon = {
      ...coupon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(couponsRef, newCoupon);
    const createdCoupon = {
      ...newCoupon,
      id: docRef.id
    };

    // Enviar notificação para usuários se o cupom estiver ativo
    if (coupon.isActive) {
      const storeName = await getStoreName(coupon.storeId);
      await sendCouponNotificationToUsers(createdCoupon, 'created', storeName);
    }

    return createdCoupon;
  },

  // Buscar todos os cupons de um estabelecimento
  async getCouponsByStore(storeId: string): Promise<Coupon[]> {
    const partnersRef = collection(db, 'partners');
    const partnerDoc = doc(partnersRef, storeId);
    const couponsRef = collection(partnerDoc, 'coupons');
    const querySnapshot = await getDocs(couponsRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Coupon));
  },

  // Atualizar um cupom existente
  async updateCoupon(storeId: string, couponId: string, updates: Partial<Coupon>): Promise<void> {
    const partnersRef = collection(db, 'partners');
    const partnerDoc = doc(partnersRef, storeId);
    const couponRef = doc(partnerDoc, 'coupons', couponId);
    
    await updateDoc(couponRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  // Deletar um cupom
  async deleteCoupon(storeId: string, couponId: string): Promise<void> {
    const partnersRef = collection(db, 'partners');
    const partnerDoc = doc(partnersRef, storeId);
    const couponRef = doc(partnerDoc, 'coupons', couponId);
    await deleteDoc(couponRef);
  },

  // Atualizar o status ativo de um cupom
  async toggleCouponActive(storeId: string, couponId: string, isActive: boolean): Promise<void> {
    const partnersRef = collection(db, 'partners');
    const partnerDoc = doc(partnersRef, storeId);
    const couponRef = doc(partnerDoc, 'coupons', couponId);
    
    await updateDoc(couponRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });

    // Se o cupom foi ativado, enviar notificação para usuários
    if (isActive) {
      try {
        // Buscar dados do cupom para enviar na notificação
        const couponDoc = await getDoc(couponRef);
        if (couponDoc.exists()) {
          const couponData = couponDoc.data() as Coupon;
          const storeName = await getStoreName(storeId);
          await sendCouponNotificationToUsers(
            { ...couponData, id: couponId },
            'activated',
            storeName
          );
        }
      } catch (error) {
        console.error('Erro ao enviar notificação de ativação do cupom:', error);
      }
    }
  }
}; 