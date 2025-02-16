export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  productType: 'simple' | 'additional' | 'combo';
  isActive: boolean;
  optionGroups: OptionGroup[];
}

export interface Promotion {
  id: string;
  productId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
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