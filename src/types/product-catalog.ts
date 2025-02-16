import { ImagePickerResponse } from 'react-native-image-picker';

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

export interface Category {
  id: string;
  name: string;
  description: string;
  products: Product[];
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

export interface DropdownItem {
  label: string;
  value: 'simple' | 'additional' | 'combo';
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

export interface CategoryOption {
  id: string;
  name: string;
  value: string;
} 