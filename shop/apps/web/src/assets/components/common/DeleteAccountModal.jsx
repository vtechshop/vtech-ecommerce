// FILE: apps/web/src/components/common/DeleteAccountModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password to confirm');
      return;
    }

    onConfirm(password);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Account" size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Warning message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                Warning: This action cannot be undone
              </h4>
              <p className="text-sm text-red-800">
                Deleting your account will permanently remove:
              </p>
              <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
                <li>Your profile and personal information</li>
                <li>Your order history</li>
                <li>Your saved addresses</li>
                <li>Your wishlist</li>
                <li>All other account data</li>
              </ul>
            </div>
          </div>

          {/* Password confirmation */}
          <div>
            <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your password to confirm
            </label>
            <input
              type="password"
              id="delete-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter your password"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting Account...' : 'Delete My Account'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DeleteAccountModal;
