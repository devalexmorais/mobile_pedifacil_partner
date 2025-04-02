import { Product, Promotion } from './product';

export interface PromotionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (promotion: Promotion) => void;
  product: Product | null;
} 