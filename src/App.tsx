import React, { useState, useEffect, useRef } from 'react';
import type { Item, FilterType } from './types/Item';
import BarcodeInput from './components/BarcodeInput';
import SearchAndFilter from './components/SearchAndFilter';
import ItemList from './components/ItemList';
import AddItemDialog from './components/dialogs/AddItemDialog';
import RemoveItemDialog from './components/dialogs/RemoveItemDialog';
import Header from './components/Header';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ItemOperationsService } from './services/itemOperations';
import LoginScreen from './components/dialogs/LoginScreen';
import { useTranslation } from 'react-i18next';


const AppContent: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showRemoveDialog, setShowRemoveDialog] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoading: authLoading } = useAuth();
  const itemService = useRef<ItemOperationsService | null>(null);

  const {t} = useTranslation();
  
  // Initialize service when user is available
  useEffect(() => {
    if (user?.familyID) {
      itemService.current = new ItemOperationsService(user.familyID);
    }
  }, [user?.familyID]);

  // Fetch items when user is available
  useEffect(() => {
    console.log('app - fetching items...')
    const fetchItems = async () => {
      if (user && itemService.current) {
        try {
          setIsLoading(true);
          setError(null);
          const familyItems = await itemService.current.fetchItems();
          setItems(familyItems);
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to load items');
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchItems();
  }, [user]);

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!user || !itemService.current) return;

    try {
      setError(null);
      const result = await itemService.current.processBarcodeSubmit(barcode, items);
      
      if (result.type === 'updated' && result.updatedItem) {
        // Update local state with the updated item
        setItems(prev => prev.map(item => 
          item.id === result.updatedItem!.id ? result.updatedItem! : item
        ));
      } else if (result.type === 'new_item_needed' && result.barcode) {
        // Show dialog for new item
        setPendingBarcode(result.barcode);
        setShowAddDialog(true);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process barcode');
    }
  };

  const handleAddNewItem = async (name: string, icon: string, category: string, brand: string) => {
    if (!user || !itemService.current) return;

    try {
      setError(null);
      const newItem = await itemService.current.addNewItem(
        pendingBarcode, 
        name, 
        icon, 
        category, 
        brand
      );
      
      // Update local state
      setItems(prev => [...prev, newItem]);
      setShowAddDialog(false);
      setPendingBarcode('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add item');
    }
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setPendingBarcode('');
    setEditingItem(null);
    setError(null);
  };

  const openEditDialog = (itemId: string) => {
    const itemToEdit = items.find(item => item.id === itemId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setPendingBarcode(itemToEdit.barcode);
      setShowAddDialog(true);
    }
  };

  const handleEditItem = async (barcode: string, name: string, icon: string, category: string, brand: string) => {
    if (!user || !editingItem || !itemService.current) return;

    try {
      setError(null);
      const updatedItem = await itemService.current.updateItem(
        editingItem,
        barcode,
        name,
        icon,
        category,
        brand
      );
      
      // Update local state
      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
      setShowAddDialog(false);
      setEditingItem(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update item');
    }
  };

  const increaseAmount = async (itemId: string) => {
    if (!user || !itemService.current) return;
    
    try {
      setError(null);
      const itemToUpdate = items.find(item => item.id === itemId);
      if (itemToUpdate) {
        console.log ('app increase', {itemToUpdate})
        const updatedItem = await itemService.current.increaseItemStock(itemToUpdate);
        
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update item quantity');
    }
  };

  const decreaseAmount = async (itemId: string) => {
    if (!user || !itemService.current) return;
    
    try {
      setError(null);
      const itemToUpdate = items.find(item => item.id === itemId);
      if (itemToUpdate) {
        const updatedItem = await itemService.current.decreaseItemStock(itemToUpdate);
        
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update item quantity');
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setShowRemoveDialog(itemId);
  };

  const confirmRemoveItem = async () => {
    if (!user || !showRemoveDialog || !itemService.current) return;
    
    try {
      setError(null);
      await itemService.current.removeItem(showRemoveDialog);
      
      // Update local state
      setItems(prev => prev.filter(item => item.id !== showRemoveDialog));
      setShowRemoveDialog(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove item');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.barcode.includes(searchTerm);
    
    const matchesFilter = filter === 'all' ||
                         (filter === 'inStock' && item.amountInStock > 0) ||
                         (filter === 'outOfStock' && item.amountInStock === 0);

    return matchesSearch && matchesFilter;
  });

  if (authLoading || isLoading) {
    console.log('app loading',{authLoading,isLoading})
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('login.loading')}</p>
        </div>
      </div>
    );
  }
console.log ('app user', {user})
  if (!user) {
    // return (
    //   <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    //     <div className="text-center">
    //       <p className="text-gray-600">No user logged in</p>
    //     </div>
    //   </div>
    // );
    return <LoginScreen/>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <Header />
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-900 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
      
      <BarcodeInput onBarcodeSubmit={handleBarcodeSubmit} />
      
      <SearchAndFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filter={filter}
        setFilter={setFilter}
        items={items}
      />

      <ItemList
        items={filteredItems}
        totalItems={items.length}
        onIncrease={increaseAmount}
        onDecrease={decreaseAmount}
        onEdit={openEditDialog}
        onRemove={handleRemoveItem}
      />

      <AddItemDialog
        isOpen={showAddDialog}
        onClose={handleCloseAddDialog}
        onAdd={handleAddNewItem}
        onEdit={handleEditItem}
        barcode={pendingBarcode}
        editItem={editingItem}
      />

      <RemoveItemDialog
        isOpen={!!showRemoveDialog}
        onClose={() => setShowRemoveDialog(null)}
        onConfirm={confirmRemoveItem}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
// const LoadingSpinner: React.FC = () => (
//   <div className="flex flex-col items-center justify-center">
//     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//     <p className="mt-4 text-gray-600">Loading...</p>
//   </div>
// );