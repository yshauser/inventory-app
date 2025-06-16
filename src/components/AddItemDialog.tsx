import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchProductInfo } from '../api/productLookup';
import type { ProductInfo } from '../api/productLookup';
import type {Item} from '../types/Item';
import { useTranslation } from 'react-i18next';
import '../i18n/i18n';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, icon: string, category: string, brand: string) => void;
  onEdit?: (barcode: string, name: string, icon: string, category: string, brand: string) => void;
  barcode: string;
  editItem?: Item | null; //null for 'add' mode
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  barcode,
  editItem = null
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📦');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [useProductImage, setUseProductImage] = useState(false);

  const iconOptions = ['📦', '🍎', '🥛', '🍞', '🧴', '📱', '👕', '📚', '🔧', '💊'];
  const {t} = useTranslation();

  const isEditMode = editItem !== null;

  useEffect(() => {
    if (isEditMode && editItem) {
      // Pre-populate form with existing item data
      setName(editItem.name || '');
      setCategory(editItem.category || '');
      setBrand(editItem.brand || '');
      setSelectedIcon(editItem.icon || '📦');
      
      // Check if current icon is a URL (product image)
      if (editItem.icon && (editItem.icon.startsWith('http') || editItem.icon.startsWith('data:'))) {
        setUseProductImage(true);
      }
    } else if (barcode && !isEditMode) {
      // Only fetch product info for new items (add mode)
      fetchProductInfo(barcode).then((productInfo) => {
        setProduct(productInfo);
        
        // Auto-populate form fields if product info is available
        if (productInfo) {
          setName(productInfo.name || '');
          setCategory(productInfo.category || '');
          setBrand(productInfo.brand || '');
          
          // Use product image if available
          if (productInfo.imageUrl) {
            setUseProductImage(true);
            setSelectedIcon(productInfo.imageUrl);
          }
        }
      });
    }
  }, [barcode, editItem, isEditMode]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    if (isEditMode && onEdit && editItem) {
      onEdit(editItem.barcode, name.trim(), selectedIcon, category.trim(), brand.trim());
    } else {
      onAdd(name.trim(), selectedIcon, category.trim(), brand.trim());
    }
    
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setSelectedIcon('📦');
    setCategory('');
    setBrand('');
    setProduct(null);
    setUseProductImage(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon);
    setUseProductImage(false);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {isEditMode ? t('general.editItemTitle') : t('general.addItemTitle')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('general.barcode')}: {isEditMode ? editItem?.barcode : barcode}
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('general.itemName')}:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('general.enterItemName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
             {t('general.pic')}:
            </label>
            
             {/* Current selected icon preview */}
             {/* {selectedIcon && (selectedIcon.startsWith('http') || selectedIcon.startsWith('data:')) && ( */}
             {selectedIcon  && (
              <div className="mb-2">
                <div className="w-12 h-12 rounded-md border-2 border-blue-500 bg-blue-50 flex items-center justify-center overflow-hidden">
                  {selectedIcon.startsWith('http') ? (
                    <img src={selectedIcon} alt="icon" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">{selectedIcon}</span>
                  )}          
                </div>
                {/* <p className="text-xs text-gray-500 mt-1">Current image</p> */}
              </div>
            )}
            
            {/* Emoji Icons Grid */}
            <p className="text-xs text-gray-500 mt-1">{t('general.optionalIcon')}</p>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  onClick={() => handleIconSelect(icon)}
                  className={`w-10 h-10 rounded-md border-2 flex items-center justify-center text-xl ${
                    selectedIcon === icon && !useProductImage ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('general.category')}
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('general.enterCategory')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('general.brand')}
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={t('general.enterBrand')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Product Info Display (Optional - can be removed if not needed) */}
          {!isEditMode && product && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                {product ? t('general.productFound') : t('general.productNotFound')}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t('buttons.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isEditMode ? t('buttons.save') : t('buttons.addItem')}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddItemDialog;