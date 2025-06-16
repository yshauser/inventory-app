import React from 'react';
import { Package } from 'lucide-react';
import type { Item } from '../types/Item';
import ItemRow from './ItemRow';

interface ItemListProps {
  items: Item[];
  totalItems: number;
  onIncrease: (barcode: string) => void;
  onDecrease: (barcode: string) => void;
  onRemove: (barcode: string) => void;
}

const ItemList: React.FC<ItemListProps> = ({
  items,
  totalItems,
  onIncrease,
  onDecrease,
  onRemove
}) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">
          {totalItems === 0 ? 'No items yet. Add your first item!' : 'No items match your search.'}
        </p>
      </div>
    );
  }
  console.log ('items list', {items})

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemRow
          key={item.barcode}
          item={item}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default ItemList;