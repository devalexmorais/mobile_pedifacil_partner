import { db } from '@/config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

export interface Coupon {
  id?: string;
  code: string;
  storeId: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  validUntil: string;
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
    return {
      ...newCoupon,
      id: docRef.id
    };
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
  }
}; 