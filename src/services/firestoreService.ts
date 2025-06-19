import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  updateDoc,
  addDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Family, User } from '../types/Users';
import type { Item } from '../types/Item';

const FAMILIES_COLLECTION = 'families';
const USERS_COLLECTION = 'users';
const ITEMS_COLLECTION = 'items';

// Generic function to get all documents from a collection
export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
  try {
    console.log ('getCollection', collectionName)

    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: T[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as T);
    });
    return data;
  } catch (error) {
    console.error(`Error getting ${collectionName} collection:`, error);
    throw error;
  }
};

// Get user by username from users collection
export const getUserByUsername = async (username: string): Promise<User | null> => {
  console.log ('getUserByusername', username)
  try {
    const q = query(collection(db, USERS_COLLECTION), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return {
        username: userData.username,
        email: userData.email,
        familyID: userData.familyID,
        userID: userData.userID
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
};

// Get all users in a family
export const getUsersByFamilyId = async (familyId: string): Promise<User[]> => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where('familyID', '==', familyId));
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        username: userData.username,
        email: userData.email,
        familyID: userData.familyID,
        userID: userData.userID
      } as User);
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users by family ID:', error);
    throw error;
  }
};

export const getFamilyNameByFamilyId = async (familyId: string): Promise<string | undefined> => {
  try {
    const q = query(collection(db, FAMILIES_COLLECTION), where('familyID', '==', familyId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().familyname as string;
    } else {
      console.log(`No family found with id: ${familyId}`);
      return undefined;
    }
  } catch (error) {
    console.error('Error getting family name by familyId:', error);
    throw error;
  }
};

// Initialize admin user (simplified since you already have the data in Firestore)
export const initializeAdminUser = async (): Promise<User> => {
  console.log ('in initializeAdminUser')
  try {
    const adminUser = await getUserByUsername('admin');
    if (adminUser) {
      return adminUser;
    } else {
      throw new Error('Admin user not found in database');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
    throw error;
  }
};

// Keep the original function for backward compatibility but mark as deprecated
export const initializeAdminFamilyAndUser = async (): Promise<{ family: Family; user: User }> => {
  console.warn('initializeAdminFamilyAndUser is deprecated. Use initializeAdminUser instead.');
  
  try {
    const adminUser = await initializeAdminUser();
    
    // Get family data
    const q = query(collection(db, FAMILIES_COLLECTION), where('familyID', '==', adminUser.familyID));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const familyData = querySnapshot.docs[0].data();
      const family: Family = {
        familyname: familyData.familyname,
        familyID: familyData.familyID,
        users: await getUsersByFamilyId(familyData.familyID)
      };
      
      return { family, user: adminUser };
    } else {
      throw new Error('Admin family not found');
    }
  } catch (error) {
    console.error('Error in initializeAdminFamilyAndUser:', error);
    throw error;
  }
};

// Function to add an item to a specific family's document in the 'items' collection
export const addItemToFamily = async (familyId: string, item: Item): Promise<void> => {
  try {
    const familyItemsDocRef = doc(db, ITEMS_COLLECTION, familyId);
    const familyItemsDocSnap = await getDoc(familyItemsDocRef);

    if (familyItemsDocSnap.exists()) {
      // Update existing document
      await updateDoc(familyItemsDocRef, {
        [item.id]: item
      });
    } else {
      // Create new document for the family's items
      await setDoc(familyItemsDocRef, {
        [item.id]: item
      });
    }
  } catch (error) {
    console.error(`Error adding item to family ${familyId}:`, error);
    throw error;
  }
};

// Function to update an item in a specific family's document in the 'items' collection
export const updateItemInFamily = async (familyId: string, item: Item): Promise<void> => {
  try {
    const familyItemsDocRef = doc(db, ITEMS_COLLECTION, familyId);
    await updateDoc(familyItemsDocRef, {
      [item.id]: item
    });
  } catch (error) {
    console.error(`Error updating item in family ${familyId}:`, error);
    throw error;
  }
};

// Function to delete an item from a specific family's document in the 'items' collection
export const deleteItemFromFamily = async (familyId: string, itemId: string): Promise<void> => {
  try {
    const familyItemsDocRef = doc(db, ITEMS_COLLECTION, familyId);
    const familyItemsDocSnap = await getDoc(familyItemsDocRef);

    if (familyItemsDocSnap.exists()) {
      const currentItems = familyItemsDocSnap.data();
      delete currentItems[itemId];
      await setDoc(familyItemsDocRef, currentItems); // Overwrite with updated map
    }
  } catch (error) {
    console.error(`Error deleting item ${itemId} from family ${familyId}:`, error);
    throw error;
  }
};

// Function to get all items for a specific family
export const getFamilyItems = async (familyId: string): Promise<Item[]> => {
  try {
    const familyItemsDocRef = doc(db, ITEMS_COLLECTION, familyId);
    const familyItemsDocSnap = await getDoc(familyItemsDocRef);

    if (familyItemsDocSnap.exists()) {
      const itemsMap = familyItemsDocSnap.data();
      return Object.values(itemsMap) as Item[];
    }
    return [];
  } catch (error) {
    console.error(`Error getting items for family ${familyId}:`, error);
    throw error;
  }
};

// Generic functions (keeping them for other potential collections)
export const addDocument = async <T extends { id?: string }>(
  collectionName: string,
  data: T
): Promise<string> => {
  try {
    let docRef;
    if (data.id) {
      docRef = doc(db, collectionName, data.id);
      await setDoc(docRef, data);
      return data.id;
    } else {
      docRef = await addDoc(collection(db, collectionName), data);
      return docRef.id;
    }
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as any);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

export const deleteDocument = async (
  collectionName: string, 
  id: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

export const batchUpdate = async <T extends { id: string }>(
  collectionName: string,
  documents: T[]
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    documents.forEach((document) => {
      const docRef = doc(db, collectionName, document.id);
      batch.set(docRef, document);
    });
    
    await batch.commit();
  } catch (error) {
    console.error(`Error batch updating documents in ${collectionName}:`, error);
    throw error;
  }
};