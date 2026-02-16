// FILE: apps/web/src/components/common/ReturnOrderModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { RotateCcw, Check } from 'lucide-react';

const RETURN_REASONS = [
  { value: 'defective', label: 'Defective or damaged product' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Product not as described' },
  { value: 'quality_issue', label: 'Quality not satisfactory' },
  { value: 'missing_parts', label: 'Missing parts or accessories' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other reason' },
];

const ReturnOrderModal = ({ isOpen, onClose, onConfirm, isLoading, order, successData }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [error, setError] = useState('');

  const items = order?.items || [];

  const handleToggleItem = (index) => {
    setSelectedItems(prev => {
      const updated = { ...prev };
      if (updated[index]) {
        delete updated[index];
      } else {
        updated[index] = items[index].qty; // Default to full qty
      }
      return updated;
    });
  };

  const handleQtyChange = (index, qty) => {
    const maxQty = items[index].qty;
    const clamped = Math.max(1, Math.min(qty, maxQty));
    setSelectedItems(prev => ({ ...prev, [index]: clamped }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const selectedIndices = Object.keys(selectedItems);
    if (selectedIndices.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    if (!selectedReason) {
      setError('Please select a reason for return');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      setError('Please provide a reason for return');
      return;
    }

    const reason = selectedReason === 'other' ? otherReason.trim() : selectedReason;

    const returnItems = selectedIndices.map(idx => ({
      productId: items[idx].productId || items[idx]._id,
      qty: selectedItems[idx],
      reason,
    }));

    onConfirm({ items: returnItems, reason });
  };

  const handleClose = () => {
    setSelectedReason('');
    setOtherReason('');
    setSelectedItems({});
    setError('');
    onClose();
  };

  // Success state — show RMA number
  if (successData) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Return Requested" size="md">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Return Request Submitted</h3>
          <p className="text-gray-600 mb-4">Your return request has been submitted successfully.</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500">RMA Number</p>
            <p className="text-xl font-bold text-primary-600">{successData.rma}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Keep this RMA number for tracking. We'll review your request and get back to you within 2-3 business days.
          </p>
          <Button variant="primary" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Return" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <RotateCcw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Return Policy</h4>
              <p className="text-sm text-blue-800">
                Items must be in original condition. Refund will be processed after we receive and inspect the returned items.
              </p>
            </div>
          </div>

          {/* Item selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select items to return <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {items.map((item, index) => {
                const isSelected = index in selectedItems;
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleToggleItem(index)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(index)}
                      className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                      onClick={e => e.stopPropagation()}
                    />
                    <img
                      src={item.image || '/placeholder.png'}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Ordered qty: {item.qty}</p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <label className="text-xs text-gray-500 mr-1">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          max={item.qty}
                          value={selectedItems[index]}
                          onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for return <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {RETURN_REASONS.map((reason) => (
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
                    name="returnReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  <span className="ml-3 text-sm text-gray-700">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other reason text */}
          {selectedReason === 'other' && (
            <div>
              <label htmlFor="otherReason" className="block text-sm font-medium text-gray-700 mb-2">
                Please describe the issue <span className="text-red-500">*</span>
              </label>
              <textarea
                id="otherReason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Please provide details..."
                rows={3}
                disabled={isLoading}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{otherReason.length}/500 characters</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isLoading} disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Return Request'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ReturnOrderModal;
