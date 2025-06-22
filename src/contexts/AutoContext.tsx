import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Family } from '../types/Users';
import { 
  getUserByEmail, 
  createFamily, 
  createUser, 
  getFamilyById,
  getUserByUsername 
} from '../services/firestoreService';
import { ItemOperationsService } from '../services/itemOperations';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged, 
} from 'firebase/auth';
import type {User as FirebaseUser}  from 'firebase/auth';
import { auth } from '../firebase'; // Assuming you have Firebase config

interface AuthContextType {
  user: User | null;
  familyID: string | null;
  itemOperationsService: ItemOperationsService | null;
  firebaseUser: FirebaseUser | null;
  login: (username: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<{ success: boolean; needsSetup?: boolean; email?: string }>;
  createNewFamily: (email: string, familyName: string, username: string) => Promise<boolean>;
  joinExistingFamily: (email: string, familyID: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyID, setFamilyID] = useState<string | null>(null);
  const [itemOperationsService, setItemOperationsService] = useState<ItemOperationsService | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Helper function to update family-related state
  const updateFamilyContext = (newUser: User | null) => {
    if (newUser?.familyID) {
      console.log(`Setting family context for user ${newUser.username}, familyID: ${newUser.familyID}`);
      setFamilyID(newUser.familyID);
      
      // Create or update ItemOperationsService with the new familyID
      if (itemOperationsService) {
        itemOperationsService.updateFamilyID(newUser.familyID);
      } else {
        setItemOperationsService(new ItemOperationsService(newUser.familyID));
      }
    } else {
      console.log('Clearing family context - no user or familyID');
      setFamilyID(null);
      setItemOperationsService(null);
    }
  };

  // Store last logged in user email in localStorage
  const storeLastUser = (email: string) => {
    localStorage.setItem('lastLoggedInUser', email);
  };

  const getLastUser = (): string | null => {
    return localStorage.getItem('lastLoggedInUser');
  };

  const clearLastUser = () => {
    localStorage.removeItem('lastLoggedInUser');
  };

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser?.email) {
        try {
          // Try to find user in our database
          const existingUser = await getUserByEmail(firebaseUser.email);
          if (existingUser) {
            setUser(existingUser);
            updateFamilyContext(existingUser);
            storeLastUser(firebaseUser.email);
          }
        } catch (error) {
          console.error('Error loading user from database:', error);
        }
      } else {
        // No Firebase user, check for last logged in user
        const lastUserEmail = getLastUser();
        if (lastUserEmail) {
          try {
            const lastUser = await getUserByEmail(lastUserEmail);
            if (lastUser) {
              setUser(lastUser);
              updateFamilyContext(lastUser);
            }
          } catch (error) {
            console.error('Error loading last user:', error);
            clearLastUser();
          }
        }
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Legacy username-based login (keeping for backward compatibility)
  const login = async (username: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const foundUser = await getUserByUsername(username);
      if (foundUser?.familyID) {
        console.log(`User ${username} logged in successfully with familyID: ${foundUser.familyID}`);
        setUser(foundUser);
        updateFamilyContext(foundUser);
        if (foundUser.email) {
          storeLastUser(foundUser.email);
        }
        return true;
      } else if (foundUser) {
        console.error(`User ${username} found but has no familyID`);
        return false;
      } else {
        console.log(`Login failed: User ${username} not found`);
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Google authentication
  const loginWithGoogle = async (): Promise<{ success: boolean; needsSetup?: boolean; email?: string }> => {
    try {
      console.log ('google login')
      setIsAuthenticating(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      console.log ('google login data', {provider})

      const result = await signInWithPopup(auth, provider);
      console.log('User info:', {result});
      const email = result.user.email;
      
      if (!email) {
        throw new Error('No email found in Google account');
      }

      // Check if user exists in our database
      const existingUser = await getUserByEmail(email);
      
      if (existingUser) {
        // User exists, log them in
        setUser(existingUser);
        updateFamilyContext(existingUser);
        storeLastUser(email);
        return { success: true };
      } else {
        // User doesn't exist, needs setup
        return { success: false, needsSetup: true, email };
      }
    } catch (error) {
      console.error('Error during Google login:', error);
      return { success: false };
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Create new family and user
  const createNewFamily = async (email: string, familyName: string, username: string): Promise<boolean> => {
    try {
      setIsAuthenticating(true);
      
      // Create new family
      const newFamily: Family = await createFamily(familyName);
      
      // Create new user for this family
      const newUser: User = await createUser(username, email, newFamily.familyID);
      
      // Log in the user
      setUser(newUser);
      updateFamilyContext(newUser);
      storeLastUser(email);
      
      return true;
    } catch (error) {
      console.error('Error creating new family:', error);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Join existing family
  const joinExistingFamily = async (email: string, familyID: string, username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsAuthenticating(true);
      
      // Check if family exists
      const family = await getFamilyById(familyID);
      if (!family) {
        return { success: false, error: 'Family not found. Please check the Family ID.' };
      }
      
      // Create new user for this family
      const newUser: User = await createUser(username, email, familyID);
      
      // Log in the user
      setUser(newUser);
      updateFamilyContext(newUser);
      storeLastUser(email);
      
      return { success: true };
    } catch (error) {
      console.error('Error joining family:', error);
      return { success: false, error: 'Failed to join family. Please try again.' };
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      updateFamilyContext(null);
      clearLastUser();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value = {
    user,
    familyID,
    itemOperationsService,
    firebaseUser,
    login,
    loginWithGoogle,
    createNewFamily,
    joinExistingFamily,
    logout,
    isLoading,
    isAuthenticating
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};