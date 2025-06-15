import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface RemoveItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RemoveItemDialog: React.FC<RemoveItemDialogProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
          <h2 className="text-lg font-semibold">Remove Item</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to remove this item from your inventory? This action cannot be undone.
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveItemDialog;