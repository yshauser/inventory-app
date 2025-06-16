import React, { useState } from 'react';
import type { Item, FilterType } from './types/Item';
import BarcodeInput from './components/BarcodeInput';
import SearchAndFilter from './components/SearchAndFilter';
import ItemList from './components/ItemList';
import AddItemDialog from './components/AddItemDialog';
import RemoveItemDialog from './components/RemoveItemDialog';
import Header from './components/Header';


const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showRemoveDialog, setShowRemoveDialog] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);


  const handleBarcodeSubmit = (barcode: string) => {
    const existingItem = items.find(item => item.barcode === barcode);
    
    if (existingItem) {
      // Increase amount by 1
      setItems(items.map(item => 
        item.barcode === barcode 
          ? { ...item, amountInStock: Math.min(20, item.amountInStock + 1) }
          : item
      ));
    } else {
      // Show dialog to add new item
      setPendingBarcode(barcode);
      setShowAddDialog(true);
    }
  };

  const handleAddNewItem = (name: string, icon: string, category: string, brand: string) => {
    const newItem: Item = {
      barcode: pendingBarcode,
      name,
      icon,
      category,
      brand,
      amountInStock: 1
    };

    setItems([...items, newItem]);
    setShowAddDialog(false);
    setPendingBarcode('');
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setPendingBarcode('');
  };

    // Open dialog for editing item
    const openEditDialog = (barcode: string) => {
      const itemToEdit = items.find(item => item.barcode === barcode);
      if (itemToEdit) {
        setEditingItem(itemToEdit);
        setPendingBarcode(barcode);
        setShowAddDialog(true);
      }
    };


  const handleEditItem = (barcode: string, name: string, icon: string, category: string, brand: string) => {
    setItems(prev => prev.map(item => 
      item.barcode === barcode 
        ? { ...item, name, icon, category, brand }
        : item
    ));
    setShowAddDialog(false);
    setEditingItem(null);
  };

  const increaseAmount = (barcode: string) => {
    setItems(items.map(item =>
      item.barcode === barcode
        ? { ...item, amountInStock: Math.min(20, item.amountInStock + 1) }
        : item
    ));
  };

  const decreaseAmount = (barcode: string) => {
    setItems(items.map(item =>
      item.barcode === barcode
        ? { ...item, amountInStock: Math.max(0, item.amountInStock - 1) }
        : item
    ));
  };

  const handleRemoveItem = (barcode: string) => {
    setShowRemoveDialog(barcode);
  };

  const confirmRemoveItem = () => {
    if (showRemoveDialog) {
      setItems(items.filter(item => item.barcode !== showRemoveDialog));
      setShowRemoveDialog(null);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <Header/>
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
        onEdit={handleEditItem} // Pass the edit handler
        barcode={pendingBarcode}
        editItem={editingItem} // Pass the item being edited
      />

      <RemoveItemDialog
        isOpen={!!showRemoveDialog}
        onClose={() => setShowRemoveDialog(null)}
        onConfirm={confirmRemoveItem}
      />
    </div>
  );
};

export default App;