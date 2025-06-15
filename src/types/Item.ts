export interface Item {
    barcode: string;
    name: string;
    icon: string;
    amountInStock: number;
  }
  
  export type FilterType = 'all' | 'inStock' | 'outOfStock';