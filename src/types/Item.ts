export interface Item {
    barcode: string;
    name: string;
    icon: string;
    category: string;
    brand: string;
    amountInStock: number;
  }
  
  export type FilterType = 'all' | 'inStock' | 'outOfStock';