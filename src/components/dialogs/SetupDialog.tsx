import React, { useState } from 'react';
import { useAuth } from '../../contexts/AutoContext';
import { useTranslation } from 'react-i18next';

interface SetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

const SetupDialog: React.FC<SetupDialogProps> = ({ isOpen, onClose, email }) => {
  const [step, setStep] = useState<'choice' | 'createFamily' | 'joinFamily'>('choice');
  const [familyName, setFamilyName] = useState('');
  const [familyID, setFamilyID] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createNewFamily, joinExistingFamily } = useAuth();
  const { t } = useTranslation();

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await createNewFamily(email, familyName.trim(), username.trim());
      if (success) {
        handleClose();
      } else {
        setError('Failed to create family. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await joinExistingFamily(email, familyID.trim(), username.trim());
      if (result.success) {
        handleClose();
      } else {
        setError(result.error || 'Failed to join family. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('choice');
    setFamilyName('');
    setFamilyID('');
    setUsername('');
    setError('');
    setIsLoading(false);
    onClose();
  };

  const handleBack = () => {
    setStep('choice');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-sm mx-4">
        {step === 'choice' && (
          <>
            <h2 className="text-xl font-bold mb-4">{t('login.welcome')}</h2>
            <p className="text-gray-600 mb-6">
              {t('login.noAccount', {email:email})}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => setStep('createFamily')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                {t('login.createFamily')}
              </button>
              <button
                onClick={() => setStep('joinFamily')}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                {t('login.joinFamily')}
              </button>
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('buttons.cancel')}
              </button>
            </div>
          </>
        )}

        {step === 'createFamily' && (
          <>
            <div className="flex items-center mb-4">
              <button
                onClick={handleBack}
                className="mr-3 text-gray-500 hover:text-gray-700"
              >
                {t('buttons.backIcon')}
              </button>
              <h2 className="text-xl font-bold">{t('login.createFamily')}</h2>
            </div>
            
            <form onSubmit={handleCreateFamily}>
              <div className="mb-4">
                <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login.familyName')}
                </label>
                <input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder={t('login.familyNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login.yourUsername')}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('header.enterUsername')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('buttons.back')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !familyName.trim() || !username.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('login.creating') : t('buttons.create')}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'joinFamily' && (
          <>
            <div className="flex items-center mb-4">
              <button
                onClick={handleBack}
                className="mr-3 text-gray-500 hover:text-gray-700"
              >
                {t('buttons.backIcon')}
              </button>
              <h2 className="text-xl font-bold">{t('login.joinFamily')}</h2>
            </div>
            
            <form onSubmit={handleJoinFamily}>
              <div className="mb-4">
                <label htmlFor="familyID" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login.familyID')}
                </label>
                <input
                  id="familyID"
                  type="text"
                  value={familyID}
                  onChange={(e) => setFamilyID(e.target.value)}
                  placeholder={t('login.enterFamilyID')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login.yourUsername')}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('header.enterUsername')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('buttons.back')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !familyID.trim() || !username.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('login.joining') : t('buttons.join')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SetupDialog;