import React, { useState, useEffect } from 'react';
import type { Item, FilterType } from './types/Item';
import BarcodeInput from './components/BarcodeInput';
import SearchAndFilter from './components/SearchAndFilter';
import ItemList from './components/ItemList';
import AddItemDialog from './components/AddItemDialog';
import RemoveItemDialog from './components/RemoveItemDialog';
import Header from './components/Header';
import { AuthProvider, useAuth } from './contexts/AutoContext';
import { 
  addItemToFamily, 
  updateItemInFamily, 
  deleteItemFromFamily, 
  getFamilyItems 
} from './services/firestoreService';
import { v4 as uuidv4 } from 'uuid';

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

  // Fetch items when user is available
  useEffect(() => {
    const fetchItems = async () => {
      if (user) {
        try {
          setIsLoading(true);
          setError(null);
          const familyItems = await getFamilyItems(user.familyID);
          setItems(familyItems);
        } catch (error) {
          console.error('Error fetching items:', error);
          setError('Failed to load items. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchItems();
  }, [user]);

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!user) return;

    try {
      setError(null);
      const existingItem = items.find(item => item.barcode === barcode);
      
      if (existingItem) {
        const updatedItem = { 
          ...existingItem, 
          amountInStock: Math.min(20, existingItem.amountInStock + 1) 
        };
        
        // Update in Firestore
        await updateItemInFamily(user.familyID, updatedItem);
        
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
      } else {
        setPendingBarcode(barcode);
        setShowAddDialog(true);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setError('Failed to process barcode. Please try again.');
    }
  };

  const handleAddNewItem = async (name: string, icon: string, category: string, brand: string) => {
    if (!user) return;

    try {
      setError(null);

      // Debug logging
      console.log('handleAddNewItem called with user:', {
        user,
        familyID: user.familyID,
        familyIDType: typeof user.familyID
      });

      const newItem: Item = {
        id: uuidv4(),
        barcode: pendingBarcode,
        name,
        icon,
        category,
        brand,
        amountInStock: 1
      };

            // Validate familyID
            if (!user.familyID || typeof user.familyID !== 'string') {
              throw new Error(`Invalid familyID: ${user.familyID} (type: ${typeof user.familyID})`);
            }
      
            console.log('About to call addItemToFamily with:', {
              familyID: user.familyID,
              newItem
            });

      // Add to Firestore
      await addItemToFamily(user.familyID, newItem);
      
      // Update local state
      setItems(prev => [...prev, newItem]);
      setShowAddDialog(false);
      setPendingBarcode('');
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Failed to add item. Please try again.');
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
    if (!user || !editingItem) return;

    try {
      setError(null);
      const updatedItem: Item = { 
        ...editingItem,
        barcode, 
        name, 
        icon, 
        category, 
        brand 
      };
      
      // Update in Firestore
      await updateItemInFamily(user.familyID, updatedItem);
      
      // Update local state
      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
      setShowAddDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error editing item:', error);
      setError('Failed to update item. Please try again.');
    }
  };

  const increaseAmount = async (itemId: string) => {
    if (!user) return;
    
    try {
      setError(null);
      const itemToUpdate = items.find(item => item.id === itemId);
      if (itemToUpdate) {
        const updatedItem = { 
          ...itemToUpdate, 
          amountInStock: Math.min(20, itemToUpdate.amountInStock + 1) 
        };
        
        // Update in Firestore
        await updateItemInFamily(user.familyID, updatedItem);
        
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
      }
    } catch (error) {
      console.error('Error increasing amount:', error);
      setError('Failed to update item quantity. Please try again.');
    }
  };

  const decreaseAmount = async (itemId: string) => {
    if (!user) return;
    
    try {
      setError(null);
      const itemToUpdate = items.find(item => item.id === itemId);
      if (itemToUpdate) {
        const updatedItem = { 
          ...itemToUpdate, 
          amountInStock: Math.max(0, itemToUpdate.amountInStock - 1) 
        };
        
        // Update in Firestore
        await updateItemInFamily(user.familyID, updatedItem);
        
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
      }
    } catch (error) {
      console.error('Error decreasing amount:', error);
      setError('Failed to update item quantity. Please try again.');
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setShowRemoveDialog(itemId);
  };

  const confirmRemoveItem = async () => {
    if (!user || !showRemoveDialog) return;
    
    try {
      setError(null);
      
      // Delete from Firestore
      await deleteItemFromFamily(user.familyID, showRemoveDialog);
      
      // Update local state
      setItems(prev => prev.filter(item => item.id !== showRemoveDialog));
      setShowRemoveDialog(null);
    } catch (error) {
      console.error('Error removing item:', error);
      setError('Failed to remove item. Please try again.');
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No user logged in</p>
        </div>
      </div>
    );
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