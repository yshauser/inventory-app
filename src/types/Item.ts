export interface Item {
    id: string; // Added for Firestore document ID
    barcode: string;
    name: string;
    icon: string;
    category: string;
    brand: string;
    amountInStock: number;
  }
  
  export type FilterType = 'all' | 'inStock' | 'outOfStock';
