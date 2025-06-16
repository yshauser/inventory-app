import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { Item } from '../types/Item';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { useTranslation } from 'react-i18next';


interface ItemRowProps {
  item: Item;
  onIncrease: (barcode: string) => void;
  onDecrease: (barcode: string) => void;
  onRemove: (barcode: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove
}) => {
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getRowStyle,
    getBackgroundStyle,
    getActionIcon,
    showBackground,
    isDragging
  } = useSwipeGestures(
    () => onDecrease(item.barcode), // Swipe left to decrease
    () => onIncrease(item.barcode)  // Swipe right to increase
  );
  console.log ('item row', {item})
  
  const {t} = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-lg shadow-sm mb-2">
      {/* Background layer with action indicators */}
      {showBackground && (
        <div 
          className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl rounded-lg"
          style={getBackgroundStyle()}
        >
          <div className="flex items-center space-x-2">
            {getActionIcon() === '+1' ? (
              <>
                <Plus className="w-6 h-6" />
                <span className="drop-shadow-lg">+1</span>
              </>
            ) : (
              <>
                <Minus className="w-6 h-6" />
                <span className="drop-shadow-lg">-1</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Main content row */}
      <div
        className={`relative bg-white rounded-lg p-4 touch-manipulation ${
          isDragging ? 'shadow-lg' : ''
        }`}
        style={getRowStyle()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
          <img src={item.icon} alt="icon" className="w-8 h-8 inline-block" />
          <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
              <p className="text-sm text-gray-500">#{item.barcode}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onDecrease(item.barcode)}
                disabled={item.amountInStock === 0}
                className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className={`w-8 text-center font-semibold ${
                item.amountInStock === 0 ? 'text-red-500' : 'text-green-600'
              }`}>
                {item.amountInStock}
              </span>
              
              <button
                onClick={() => onIncrease(item.barcode)}
                disabled={item.amountInStock === 20}
                className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={() => onRemove(item.barcode)}
              className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className={`mt-2 text-xs text-center transition-opacity ${
          isDragging ? 'opacity-50' : 'text-gray-400'
        }`}>
          {isDragging ? t('itemRow.releaseSwipeText') : t('itemRow.swipeText')}
        </div>
      </div>
    </div>
  );
};

export default ItemRow;