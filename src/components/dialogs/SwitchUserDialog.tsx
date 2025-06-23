import React, { useState , useEffect} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import SetupDialog from './SetupDialog';

interface SwitchUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SwitchUserDialog: React.FC<SwitchUserDialogProps> = ({ isOpen, onClose }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const { loginWithGoogle , pendingRedirectAuth} = useAuth();
  const {t} = useTranslation();

  // Handle redirect auth result
  useEffect(() => {
    if (isOpen && pendingRedirectAuth?.needsSetup && pendingRedirectAuth?.email) {
      setSetupEmail(pendingRedirectAuth.email);
      setShowSetup(true);
    }
  }, [pendingRedirectAuth, isOpen]);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await loginWithGoogle();
      if (result.success) {
        // User logged in successfully
        onClose();
      } else if (result.needsSetup && result.email) {
        // User needs to set up account
        setSetupEmail(result.email);
        setShowSetup(true);
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } catch (error) {
      setError('An error occurred during sign in. Please try again.');
    } finally {
      // Don't set loading to false immediately for mobile redirect
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError('');
  //   setIsLoading(true);

  //   try {
  //     const success = await login(username.trim());
  //     if (success) {
  //       setUsername('');
  //       onClose();
  //     } else {
  //       setError('User not found. Please check the username and try again.');
  //     }
  //   } catch (error) {
  //     setError('An error occurred. Please try again.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleClose = () => {
    setIsLoading(false);
    setShowSetup(false);
    setSetupEmail('');
    setError('');
    onClose();
  };

  const handleSetupClose = () => {
    setShowSetup(false);
    setSetupEmail('');
    handleClose();    // For switch user dialog, if setup is cancelled, close the main dialog too
  };

  const handleSetupSuccess = () => {
    setShowSetup(false);
    setSetupEmail('');
    // Close the main dialog when setup is successful
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 max-w-sm mx-4">
        <h2 className="text-xl font-bold mb-4">{t('header.switchUser')}</h2>
 
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              {t('login.googleSignIn')}
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoading ? t('login.signing') : t('login.continueWithGoogle')}
            </button>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
               {t('buttons.cancel')}
            </button>
          </div>
      </div>
    </div>
          <SetupDialog
          isOpen={showSetup}
          onClose={handleSetupClose}
          email={setupEmail}
          onSuccess={handleSetupSuccess}
        />
      </>
  );
};

export default SwitchUserDialog;