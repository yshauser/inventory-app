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
  browserPopupRedirectResolver,
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
  pendingRedirectAuth: { needsSetup?: boolean; email?: string } | null;
  createNewFamily: (email: string, familyName: string, username: string) => Promise<boolean>;
  joinExistingFamily: (email: string, familyID: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticating: boolean;
  isProcessingRedirect: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// console.log('Startup:', {
//   search: window.location.search,
//   hash: window.location.hash,
//   localStorageRedirect: localStorage.getItem('firebaseAuthRedirect'),
//   sessionRedirect: sessionStorage.getItem('firebase:redirectUser')
// });

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

// Helper function to detect if device is mobile
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         ((navigator.maxTouchPoints !== undefined) && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
};

// Helper function to check if this is likely a redirect result
const isLikelyRedirectResult = (): boolean => {
  // Check URL parameters that Firebase adds after redirect
  const urlParams = new URLSearchParams(window.location.search);
  console.log ('is likely', {urlParams},'window:',window.location.search)
  const hasFirebaseParams = urlParams.has('state') || urlParams.has('code') || urlParams.has('authuser')|| urlParams.has('prompt')||
                           window.location.hash.includes('access_token') ||
                           window.location.search.includes('authuser') ||
                           window.location.search.includes('oauth_token');
  
  // Check if we have a stored redirect state
  const hasStoredRedirectState = localStorage.getItem('firebaseAuthRedirect') === 'true';
  
  // Check session storage (Firebase sometimes uses this)
  const hasSessionRedirectState = sessionStorage.getItem('firebase:redirectUser') !== null;
  
  console.log('Redirect detection:', { hasFirebaseParams, hasStoredRedirectState, hasSessionRedirectState, url: window.location.href });
  
  return hasFirebaseParams || hasStoredRedirectState || hasSessionRedirectState;
};

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
  const storeLastUser = (email: string) => {localStorage.setItem('lastLoggedInUser', email);};
  const getLastUser = (): string | null => {return localStorage.getItem('lastLoggedInUser');};
  const clearLastUser = () => {localStorage.removeItem('lastLoggedInUser');};

  // Store redirect auth state
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
    localStorage.removeItem('firebaseAuthRedirectTime');
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

// Initialize auth state listener
useEffect(() => {
  let redirectProcessed = false;
  let initializationComplete = false;
  
  const initializeAuth = async () => {
    console.log('Initializing auth...');

    // Check if this looks like a redirect scenario
    const isRedirectScenario = isLikelyRedirectResult();
    console.log('Is likely redirect scenario:', isRedirectScenario);

    const redirectResult = await getRedirectResult(auth, browserPopupRedirectResolver);
if (redirectResult?.user) {
    
    // if (isRedirectScenario) {
      setIsProcessingRedirect(true);
      
      // Wait a bit for Firebase to process the redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        console.log ('going to redeirect', {browserPopupRedirectResolver})
        const redirectResult = await getRedirectResult(auth, browserPopupRedirectResolver);
        console.log('Initial redirect result check:', redirectResult);
        
        if (redirectResult?.user) {
          console.log('Found redirect result with user:', redirectResult.user.email);
          redirectProcessed = true;
          
          // Clear the redirect flag
          clearRedirectAuthState();
          
          setFirebaseUser(redirectResult.user);
          const authResult = await handleGoogleAuthResult(redirectResult.user);
          
          if (authResult.success) {
            console.log('Redirect login successful');
            setPendingRedirectAuth(null);
          } else if (authResult.needsSetup) {
            console.log('Redirect login needs setup');
            setPendingRedirectAuth({ needsSetup: true, email: authResult.email });
            storeRedirectAuthState({ needsSetup: true, email: authResult.email });
          }
        } else {
          console.log('No redirect result found despite redirect indicators');
          // Sometimes Firebase needs more time, let the auth state listener handle it
        }
      } catch (error) {
        console.log ('CATCH')
        console.error('Error checking redirect result:', error);
      } finally {
        console.log ('FINALLY')
        setIsProcessingRedirect(false);
      }
    }
    
    initializationComplete = true;
  };

  // Initialize auth check
  initializeAuth();

  // Set up auth state listener
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('Auth state changed:', firebaseUser?.email);
    setFirebaseUser(firebaseUser);
    
    // Wait for initialization to complete
    if (!initializationComplete) {
      console.log('Waiting for initialization to complete...');
      return;
    }
    
    // Skip processing if we already handled a redirect
    if (redirectProcessed) {
      console.log('Redirect already processed, skipping auth state change');
      setIsLoading(false);
      return;
    }

    if (firebaseUser?.email) {
      console.log('Firebase user authenticated:', firebaseUser.email);
      
      try {
        // Check if this might be from a redirect that we missed
        const isRedirectScenario = isLikelyRedirectResult();
        
        if (isRedirectScenario && !redirectProcessed) {
          console.log('Processing missed redirect in auth state change');
          redirectProcessed = true;
          clearRedirectAuthState();
          
          const authResult = await handleGoogleAuthResult(firebaseUser);
          
          if (authResult.success) {
            setPendingRedirectAuth(null);
          } else if (authResult.needsSetup) {
            setPendingRedirectAuth({ needsSetup: true, email: authResult.email });
            storeRedirectAuthState({ needsSetup: true, email: authResult.email });
          }
        } else {
          // Regular auth state change (not from redirect)
          console.log('Regular auth state change, checking database for user');
          const existingUser = await getUserByEmail(firebaseUser.email);
          
          if (existingUser) {
            console.log('Found existing user:', existingUser.username);
            setUser(existingUser);
            updateFamilyContext(existingUser);
            storeLastUser(firebaseUser.email);
            setPendingRedirectAuth(null);
            clearRedirectAuthState();
          } else {
            console.log('User not found in database, checking for pending redirect auth');
            const pendingState = getRedirectAuthState();
            if (pendingState && pendingState.email === firebaseUser.email) {
              console.log('Found matching pending redirect auth state');
              setPendingRedirectAuth(pendingState);
            } else {
              console.log('Firebase user exists but no database user');
              setPendingRedirectAuth({ needsSetup: true, email: firebaseUser.email });
            }
          }
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
      }
    } else {
      // No Firebase user
      console.log('No Firebase user, checking for last logged in user');
      
      setPendingRedirectAuth(null);
      clearRedirectAuthState();
      
      // Only check for last user if this isn't a redirect scenario
      if (!isLikelyRedirectResult()) {
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

  // Google authentication with mobile/desktop detection
  const loginWithGoogle = async (): Promise<{ success: boolean; needsSetup?: boolean; email?: string }> => {
    try {
      console.log('Starting Google login');
      setIsAuthenticating(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const isMobile = isMobileDevice();
      console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');
  
      if (isMobile) {
        // Use redirect for mobile devices
        console.log('Using signInWithRedirect for mobile');
        
        // Store flag to indicate we're starting a redirect
        localStorage.setItem('firebaseAuthRedirect', 'true');
        // Also store timestamp to help with debugging
        localStorage.setItem('firebaseAuthRedirectTime', Date.now().toString());
        console.log ('local storage', localStorage.getItem('firebaseAuthRedirect'));
        
        // Clear any existing states before starting new flow
        setPendingRedirectAuth(null);
        clearRedirectAuthState();
        
        await signInWithRedirect(auth, provider,browserPopupRedirectResolver);
        
        // For redirect, we return a pending state since the result will come later
        return { success: false, needsSetup: false };
      } else {
        // Use popup for desktop devices
        console.log('Using signInWithPopup for desktop');
        const result = await signInWithPopup(auth, provider);
        console.log('Popup result:', result);
        
        const authResult = await handleGoogleAuthResult(result.user);
        return authResult;
      }      
    } catch (error) {
      console.error('Error during Google login:', error);
      clearRedirectAuthState();
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
      // Clear any pending redirect state
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
      // Clear any pending redirect state
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

  // Effect to handle pending redirect auth state
  useEffect(() => {
    if (pendingRedirectAuth?.needsSetup && pendingRedirectAuth?.email && !user) {
      // This will trigger the setup dialog in components that check for this state
      console.log('Pending redirect auth setup needed for:', pendingRedirectAuth.email);
    }
  }, [pendingRedirectAuth, user]);

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