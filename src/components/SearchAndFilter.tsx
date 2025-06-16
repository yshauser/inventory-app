import React from 'react';
import { Search } from 'lucide-react';
import type { FilterType, Item } from '../types/Item';
import { useTranslation } from 'react-i18next';


interface SearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  items: Item[];
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  items
}) => {
  const inStockCount = items.filter(item => item.amountInStock > 0).length;
  const outOfStockCount = items.filter(item => item.amountInStock === 0).length;

  const {t} = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search.searchPlaceholder')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {t('search.all')} ({items.length})
          </button>
          <button
            onClick={() => setFilter('inStock')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'inStock' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {t('search.inStock')} ({inStockCount})
          </button>
          <button
            onClick={() => setFilter('outOfStock')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'outOfStock' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {t('search.outOfStock')} ({outOfStockCount})
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilter;