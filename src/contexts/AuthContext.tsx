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
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged, 
} from 'firebase/auth';
import type {User as FirebaseUser}  from 'firebase/auth'; //UserCredential
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  familyID: string | null;
  itemOperationsService: ItemOperationsService | null;
  firebaseUser: FirebaseUser | null;
  login: (username: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<{ success: boolean; needsSetup?: boolean; email?: string }>;
  pendingRedirectAuth: { needsSetup?: boolean; email?: string } | null;
  createNewFamily: (email: string, familyName: string, username: string) => Promise<boolean>;
  joinExistingFamily: (email: string, familyID: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticating: boolean;
  isProcessingRedirect: boolean;
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

// Improved mobile detection
// const isMobileDevice = (): boolean => {
//   return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
//          (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
// };
const isMobileDevice = (): boolean => {return false; };


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyID, setFamilyID] = useState<string | null>(null);
  const [itemOperationsService, setItemOperationsService] = useState<ItemOperationsService | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pendingRedirectAuth, setPendingRedirectAuth] = useState<{ needsSetup?: boolean; email?: string } | null>(null);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);

  // Helper function to update family-related state
  const updateFamilyContext = (newUser: User | null) => {
    if (newUser?.familyID) {
      console.log(`Setting family context for user ${newUser.username}, familyID: ${newUser.familyID}`);
      setFamilyID(newUser.familyID);
      
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

  // localStorage helpers
  const storeLastUser = (email: string) => localStorage.setItem('lastLoggedInUser', email);
  const getLastUser = (): string | null => localStorage.getItem('lastLoggedInUser');
  const clearLastUser = () => localStorage.removeItem('lastLoggedInUser');

  // Redirect state helpers
  const storeRedirectAuthState = (state: { needsSetup?: boolean; email?: string }) => {
    localStorage.setItem('pendingRedirectAuth', JSON.stringify(state));
  };

  const getRedirectAuthState = (): { needsSetup?: boolean; email?: string } | null => {
    const stored = localStorage.getItem('pendingRedirectAuth');
    return stored ? JSON.parse(stored) : null;
  };

  const clearRedirectAuthState = () => {
    localStorage.removeItem('pendingRedirectAuth');
    localStorage.removeItem('firebaseAuthRedirect');
  };

  // Handle Google authentication result
  const handleGoogleAuthResult = async (firebaseUser: FirebaseUser): Promise<{ success: boolean; needsSetup?: boolean; email?: string }> => {
    const email = firebaseUser.email;
    
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
  };

  // Handle redirect result on app initialization
  const handleRedirectSignInResult = async () => {
    try {
      console.log('Checking for redirect result...');
      const result = await getRedirectResult(auth);
      
      if (result) {
        console.log('Found redirect result:', result.user.email);
        setIsProcessingRedirect(true);
        setFirebaseUser(result.user);
        
        // Clear redirect flag
        clearRedirectAuthState();
        
        const authResult = await handleGoogleAuthResult(result.user);
        
        if (authResult.success) {
          console.log('Redirect sign-in successful');
          setPendingRedirectAuth(null);
        } else if (authResult.needsSetup) {
          console.log('Redirect sign-in needs setup');
          setPendingRedirectAuth({ needsSetup: true, email: authResult.email });
          storeRedirectAuthState({ needsSetup: true, email: authResult.email });
        }
        
        setIsProcessingRedirect(false);
        return true; // Redirect was processed
      }
      
      return false; // No redirect result
    } catch (error) {
      console.error('Error handling redirect result:', error);
      setIsProcessingRedirect(false);
      clearRedirectAuthState();
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let redirectProcessed = false;

    const initializeAuth = async () => {
      console.log('Initializing auth...');
      
      // First, check for redirect result
      redirectProcessed = await handleRedirectSignInResult();
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser?.email || 'No user');
        setFirebaseUser(firebaseUser);
        
        // If we just processed a redirect, don't handle this auth state change
        if (redirectProcessed) {
          console.log('Skipping auth state change - redirect was just processed');
          setIsLoading(false);
          return;
        }

        if (firebaseUser?.email) {
          console.log('Firebase user found, checking database...');
          try {
            const existingUser = await getUserByEmail(firebaseUser.email);
            
            if (existingUser) {
              console.log('Found existing user:', existingUser.username);
              setUser(existingUser);
              updateFamilyContext(existingUser);
              storeLastUser(firebaseUser.email);
              setPendingRedirectAuth(null);
              clearRedirectAuthState();
            } else {
              console.log('User not found in database');
              // Check if we have stored pending auth state
              const pendingState = getRedirectAuthState();
              if (pendingState && pendingState.email === firebaseUser.email) {
                console.log('Found matching pending redirect auth state');
                setPendingRedirectAuth(pendingState);
              } else {
                // Firebase user exists but no database user - needs setup
                setPendingRedirectAuth({ needsSetup: true, email: firebaseUser.email });
              }
            }
          } catch (error) {
            console.error('Error checking user in database:', error);
          }
        } else {
          console.log('No Firebase user - checking for last logged in user');
          setPendingRedirectAuth(null);
          clearRedirectAuthState();
          
          // Try to auto-login with last user (for legacy username-based login)
          const lastUserEmail = getLastUser();
          if (lastUserEmail) {
            try {
              const lastUser = await getUserByEmail(lastUserEmail);
              if (lastUser) {
                console.log('Auto-logging in last user:', lastUser.username);
                setUser(lastUser);
                updateFamilyContext(lastUser);
              } else {
                clearLastUser();
              }
            } catch (error) {
              console.error('Error loading last user:', error);
              clearLastUser();
            }
          }
        }
        
        setIsLoading(false);
      });

      return unsubscribe;
    };

    const cleanup = initializeAuth();
    
    return () => {
      cleanup.then(unsubscribe => unsubscribe?.());
    };
  }, []);

  // Legacy username-based login
  const login = async (username: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const foundUser = await getUserByUsername(username);
      if (foundUser?.familyID) {
        console.log(`User ${username} logged in successfully`);
        setUser(foundUser);
        updateFamilyContext(foundUser);
        if (foundUser.email) {
          storeLastUser(foundUser.email);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Google authentication
  const provider = new GoogleAuthProvider();
  const loginWithGoogle = async (): Promise<{ success: boolean; needsSetup?: boolean; email?: string }> => {
    try {
      console.log('Starting Google login...');
      setIsAuthenticating(true);
      
      // Configure provider
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const isMobile = isMobileDevice();
      console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');

      // Clear any existing pending states
      setPendingRedirectAuth(null);
      clearRedirectAuthState();

      if (isMobile) {
        console.log('Using signInWithRedirect for mobile');
        
        // Set flag to indicate redirect is starting
        localStorage.setItem('firebaseAuthRedirect', 'true');
        
        await signInWithRedirect(auth, provider);
        
        // This return won't actually be reached due to redirect
        // The result will be handled when the page loads back
        return { success: false };
      } else {
        console.log('Using signInWithPopup for desktop');
        const result = await signInWithPopup(auth, provider);
        console.log('Popup result received');
        
        const authResult = await handleGoogleAuthResult(result.user);
        setIsAuthenticating(false);
        return authResult;
      }
    } catch (error) {
      console.error('Error during Google login:', error);
      setIsAuthenticating(false);
      clearRedirectAuthState();
      return { success: false };
    }
  };

  // Create new family and user
  const createNewFamily = async (email: string, familyName: string, username: string): Promise<boolean> => {
    try {
      setIsAuthenticating(true);
      
      const newFamily: Family = await createFamily(familyName);
      const newUser: User = await createUser(username, email, newFamily.familyID);
      
      setUser(newUser);
      updateFamilyContext(newUser);
      storeLastUser(email);
      setPendingRedirectAuth(null);
      clearRedirectAuthState();
      
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
      
      const family = await getFamilyById(familyID);
      if (!family) {
        return { success: false, error: 'Family not found. Please check the Family ID.' };
      }
      
      const newUser: User = await createUser(username, email, familyID);
      
      setUser(newUser);
      updateFamilyContext(newUser);
      storeLastUser(email);
      setPendingRedirectAuth(null);
      clearRedirectAuthState();

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
      setPendingRedirectAuth(null);
      clearRedirectAuthState();
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
    isAuthenticating,
    pendingRedirectAuth,
    isProcessingRedirect
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};