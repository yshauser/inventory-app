// src/components/dialogs/SettingsDialog.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getFamilyNameByFamilyId, getUsersByFamilyId } from '../../services/firestoreService';
import type { User } from '../../types/Users';
import './SettingsDialog.css';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [familyName, setFamilyName] = useState<string>('');
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load family data when dialog opens
  useEffect(() => {
    if (isOpen && user?.familyID) {
      loadFamilyData();
    }
  }, [isOpen, user?.familyID]);

  const loadFamilyData = async () => {
    if (!user?.familyID) return;

    setIsLoading(true);
    setError('');

    try {
      // Load family name and members concurrently
      const [familyNameResult, familyMembersResult] = await Promise.all([
        getFamilyNameByFamilyId(user.familyID),
        getUsersByFamilyId(user.familyID)
      ]);

      setFamilyName(familyNameResult || 'Unknown Family');
      setFamilyMembers(familyMembersResult || []);
    } catch (err) {
      console.error('Error loading family data:', err);
      setError('Failed to load family information');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t('settings.title', 'הגדרות')}</h2>
          <button 
            className="settings-close-button-x" 
            onClick={onClose}
            aria-label={t('buttons.close', 'Close')}
          >
            ×
          </button>
        </div>

        <div className="settings-content">
          {isLoading ? (
            <div className="settings-loading">
              <div className="loading-spinner"></div>
              <p>{t('settings.loading', 'Loading...')}</p>
            </div>
          ) : error ? (
            <div className="settings-error">
              <p>{error}</p>
              <button onClick={loadFamilyData} className="retry-button">
                {t('buttons.retry', 'Retry')}
              </button>
            </div>
          ) : (
            <>
              <div className="settings-section">
                <h3>{t('settings.userInfo', 'User Information')}</h3>
                <div className="settings-item">
                  <label>{t('settings.username', 'Username')}:</label>
                  <span>{user?.username || 'N/A'}</span>
                </div>
                <div className="settings-item">
                  <label>{t('settings.email', 'Email')}:</label>
                  <span>{user?.email || 'N/A'}</span>
                </div>
              </div>

              <div className="settings-section">
                <h3>{t('settings.familyInfo', 'Family Information')}</h3>
                <div className="settings-item">
                  <label>{t('settings.familyName', 'Family Name')}:</label>
                  <span>{familyName}</span>
                </div>
                <div className="settings-item">
                  <label>{t('settings.familyId', 'Family ID')}:</label>
                  <span className="family-id">{user?.familyID || 'N/A'}</span>
                </div>
              </div>

              <div className="settings-section">
                <h3>{t('settings.familyMembers', 'Family Members')}</h3>
                {familyMembers.length > 0 ? (
                  <div className="family-members-list">
                    {familyMembers.map((member) => (
                      <div key={member.userID} className="family-member-item">
                        <div className="member-info">
                          <strong>{member.username}</strong>
                          {member.userID === user?.userID && (
                            <span className="current-user-badge">
                              {t('settings.currentUser', '(You)')}
                            </span>
                          )}
                        <div className="member-email">{member.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-members">
                    {t('settings.noMembers', 'No family members found')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="settings-close-button">
            {t('buttons.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;