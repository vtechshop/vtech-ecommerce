// FILE: apps/web/src/components/common/CancelOrderModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

const CANCEL_REASONS = [
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'found_better_price', label: 'Found a better price elsewhere' },
  { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { value: 'delivery_too_long', label: 'Delivery time too long' },
  { value: 'product_not_needed', label: 'Product no longer needed' },
  { value: 'payment_issue', label: 'Payment/billing issue' },
  { value: 'wrong_item', label: 'Ordered wrong item/variant' },
  { value: 'other', label: 'Other reason' },
];

const CancelOrderModal = ({ isOpen, onClose, onConfirm, isLoading, orderId }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedReason) {
      setError('Please select a reason for cancellation');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    const reason = selectedReason === 'other' ? otherReason.trim() : selectedReason;
    onConfirm(reason);
  };

  const handleClose = () => {
    setSelectedReason('');
    setOtherReason('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancel Order" size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Warning message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">
                Are you sure you want to cancel order {orderId}?
              </h4>
              <p className="text-sm text-yellow-800">
                This action cannot be undone. The order will be cancelled and any payment will be refunded according to our refund policy.
              </p>
            </div>
          </div>

          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Please select a reason for cancellation <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedReason === reason.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  <span className="ml-3 text-sm text-gray-700">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other reason text field */}
          {selectedReason === 'other' && (
            <div>
              <label htmlFor="otherReason" className="block text-sm font-medium text-gray-700 mb-2">
                Please specify your reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="otherReason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Please provide details for cancellation..."
                rows={3}
                disabled={isLoading}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {otherReason.length}/500 characters
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Keep Order
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Cancelling Order...' : 'Cancel Order'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CancelOrderModal;
