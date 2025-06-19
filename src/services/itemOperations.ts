// services/itemOperations.ts
import type { Item } from '../types/Item';
import { 
  addItemToFamily, 
  updateItemInFamily, 
  deleteItemFromFamily, 
  getFamilyItems 
} from './firestoreService';
import { v4 as uuidv4 } from 'uuid';

export class ItemOperationsService {
  private familyID: string;

  constructor(familyID: string) {
    this.familyID = familyID;
  }

  /**
   * Fetch all items for the family
   */
  async fetchItems(): Promise<Item[]> {
    try {
      return await getFamilyItems(this.familyID);
    } catch (error) {
      console.error('Error fetching items:', error);
      throw new Error('Failed to load items. Please try again.');
    }
  }

  /**
   * Process a scanned barcode - either increment existing item or prepare for new item creation
   */
  async processBarcodeSubmit(barcode: string, existingItems: Item[]): Promise<{
    type: 'updated' | 'new_item_needed';
    updatedItem?: Item;
    barcode?: string;
  }> {
    try {
      const existingItem = existingItems.find(item => item.barcode === barcode);
      
      if (existingItem) {
        const updatedItem = { 
          ...existingItem, 
          amountInStock: Math.min(20, existingItem.amountInStock + 1) 
        };
        
        await updateItemInFamily(this.familyID, updatedItem);
        
        return {
          type: 'updated',
          updatedItem
        };
      } else {
        return {
          type: 'new_item_needed',
          barcode
        };
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      throw new Error('Failed to process barcode. Please try again.');
    }
  }

  /**
   * Add a new item to the family inventory
   */
  async addNewItem(
    barcode: string, 
    name: string, 
    icon: string, 
    category: string, 
    brand: string
  ): Promise<Item> {
    try {
      // Validate familyID
      if (!this.familyID || typeof this.familyID !== 'string') {
        throw new Error(`Invalid familyID: ${this.familyID} (type: ${typeof this.familyID})`);
      }

      const newItem: Item = {
        id: uuidv4(),
        barcode,
        name,
        icon,
        category,
        brand,
        amountInStock: 1
      };

      console.log('About to call addItemToFamily with:', {
        familyID: this.familyID,
        newItem
      });

      await addItemToFamily(this.familyID, newItem);
      
      return newItem;
    } catch (error) {
      console.error('Error adding item:', error);
      throw new Error('Failed to add item. Please try again.');
    }
  }

  /**
   * Update an existing item's details
   */
  async updateItem(
    existingItem: Item,
    barcode: string,
    name: string,
    icon: string,
    category: string,
    brand: string
  ): Promise<Item> {
    try {
      const updatedItem: Item = { 
        ...existingItem,
        barcode, 
        name, 
        icon, 
        category, 
        brand 
      };
      
      await updateItemInFamily(this.familyID, updatedItem);
      
      return updatedItem;
    } catch (error) {
      console.error('Error editing item:', error);
      throw new Error('Failed to update item. Please try again.');
    }
  }

  /**
   * Increase the stock amount of an item
   */
  async increaseItemStock(item: Item): Promise<Item> {
    try {
      const updatedItem = { 
        ...item, 
        amountInStock: Math.min(20, item.amountInStock + 1) 
      };
      console.log ('increase',{item})
      await updateItemInFamily(this.familyID, updatedItem);
      
      return updatedItem;
    } catch (error) {
      console.error('Error increasing amount:', error);
      throw new Error('Failed to update item quantity. Please try again.');
    }
  }

  /**
   * Decrease the stock amount of an item
   */
  async decreaseItemStock(item: Item): Promise<Item> {
    try {
      const updatedItem = { 
        ...item, 
        amountInStock: Math.max(0, item.amountInStock - 1) 
      };
      console.log ('decrease',{item})
      await updateItemInFamily(this.familyID, updatedItem);
      
      return updatedItem;
    } catch (error) {
      console.error('Error decreasing amount:', error);
      throw new Error('Failed to update item quantity. Please try again.');
    }
  }

  /**
   * Remove an item from the family inventory
   */
  async removeItem(itemId: string): Promise<void> {
    try {
      await deleteItemFromFamily(this.familyID, itemId);
    } catch (error) {
      console.error('Error removing item:', error);
      throw new Error('Failed to remove item. Please try again.');
    }
  }

  /**
   * Update the familyID if needed (e.g., when user changes)
   */
  updateFamilyID(newFamilyID: string): void {
    this.familyID = newFamilyID;
  }
}