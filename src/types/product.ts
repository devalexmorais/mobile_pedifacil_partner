export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId: string;
  image?: string;
  isActive: boolean;
  isPromotion: boolean;
  promotion?: Promotion;
  createdAt: Date;
  updatedAt: Date;
  sellerId: string;
  variations: {
    name: string;
    minRequired?: number;
    options: {
      name: string;
      price?: number;
    }[];
  }[];
  requiredSelections: {
    name: string;
    minRequired: number;
    maxRequired: number;
    options: {
      name: string;
      price?: number;
      isActive?: boolean;
    }[];
  }[];
  extras: {
    name: string;
    extraPrice: number;
    minRequired: number;
    maxRequired: number;
  }[];
}

export interface Promotion {
  id: string;
  productId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  finalPrice: number;
}

export interface ProductWithPromotion extends Product {
  promotion?: Promotion;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'extra' | 'required';
  minItems: number;
  maxItems: number;
  items: OptionItem[];
}

export interface OptionItem {
  id: string;
  name: string;
  additionalPrice: number;
} 