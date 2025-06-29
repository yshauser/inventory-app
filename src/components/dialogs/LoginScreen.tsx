import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SetupDialog from './SetupDialog';
import { useTranslation } from 'react-i18next';


const LoginScreen: React.FC = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const { loginWithGoogle,pendingRedirectAuth } = useAuth();
  // const { isProcessingRedirect, firebaseUser } = useAuth();


  const {t} = useTranslation();

  // Handle redirect auth result
  useEffect(() => {
    if (pendingRedirectAuth?.needsSetup && pendingRedirectAuth?.email) {
      setSetupEmail(pendingRedirectAuth.email);
      setShowSetup(true);
    }
  }, [pendingRedirectAuth]);

//   useEffect(() => {
//   console.log('Auth debug:', { 
//     isProcessingRedirect, 
//     pendingRedirectAuth, 
//     firebaseUser: firebaseUser?.email,
//     url: window.location.href 
//   });
// }, [isProcessingRedirect, pendingRedirectAuth, firebaseUser]);
  
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await loginWithGoogle();
         // For mobile redirect, the result might not be meaningful since the page will redirect
      // The actual handling is done in the useEffect above and in the AuthContext
      if (result.success) {
        // User logged in successfully - AuthContext will handle the redirect
        console.log('Login successful');
      } else if (result.needsSetup && result.email) {
        // User needs to set up account
        setSetupEmail(result.email);
        setShowSetup(true);
      } else if (!result.success && !result.needsSetup) {
        // This might be a redirect case, don't show error immediately
        // The redirect will handle the flow
        console.log('Redirect flow initiated or other non-error case');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during sign in. Please try again.');
    } finally {
      // Don't set loading to false immediately for mobile redirect
      // as the page will redirect anyway
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleSetupClose = () => {
    setShowSetup(false);
    setSetupEmail('');
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {t('login.welcomeTo')}{t('header.appTitle')}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t('login.signInText')}
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {t('login.signInFail')}
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {t('login.signingAgreement')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SetupDialog
        isOpen={showSetup}
        onClose={handleSetupClose}
        email={setupEmail}
      />
    </>
  );
};

export default LoginScreen;