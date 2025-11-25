// FILE: apps/web/src/components/checkout/AddressStep.jsx
import { useState } from 'react';
import { useSelector } from 'react-redux';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { Plus } from 'lucide-react';

const AddressStep = ({ onNext, onAddressSelect }) => {
  const { user } = useSelector((state) => state.auth);
  const [selectedAddress, setSelectedAddress] = useState(
    user?.addresses?.find((a) => a.isDefault)?._id || null
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState(!user?.addresses?.length);
  const [newAddress, setNewAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const handleSelectAddress = (addressId) => {
    setSelectedAddress(addressId);
    const address = user.addresses.find((a) => a._id === addressId);
    onAddressSelect(address);
  };

  const handleNewAddressChange = (e) => {
    const { name, value } = e.target;
    setNewAddress({ ...newAddress, [name]: value });
  };

  const handleSubmitNewAddress = (e) => {
    e.preventDefault();
    onAddressSelect(newAddress);
    onNext();
  };

  const handleContinue = () => {
    if (selectedAddress) {
      const address = user.addresses.find((a) => a._id === selectedAddress);
      onAddressSelect(address);
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Shipping Address</h2>

      {/* Existing Addresses */}
      {user?.addresses?.length > 0 && !showNewAddressForm && (
        <div className="space-y-3">
          {user.addresses.map((address) => (
            <label
              key={address._id}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedAddress === address._id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="address"
                value={address._id}
                checked={selectedAddress === address._id}
                onChange={() => handleSelectAddress(address._id)}
                className="sr-only"
              />
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{address.fullName}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                  </p>
                  <p className="text-sm text-gray-700">
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  <p className="text-sm text-gray-700">{address.country}</p>
                  <p className="text-sm text-gray-700 mt-1">{address.phone}</p>
                </div>
                {address.isDefault && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>
            </label>
          ))}

          <button
            onClick={() => setShowNewAddressForm(true)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mt-4"
          >
            <Plus className="w-4 h-4" />
            Add New Address
          </button>

          <Button
            onClick={handleContinue}
            variant="primary"
            className="w-full mt-6"
            disabled={!selectedAddress}
          >
            Continue to Payment
          </Button>
        </div>
      )}

      {/* New Address Form */}
      {showNewAddressForm && (
        <form onSubmit={handleSubmitNewAddress} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <Input
                name="fullName"
                value={newAddress.fullName}
                onChange={handleNewAddressChange}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Phone Number *</label>
              <Input
                name="phone"
                type="tel"
                value={newAddress.phone}
                onChange={handleNewAddressChange}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
              <Input
                name="addressLine1"
                value={newAddress.addressLine1}
                onChange={handleNewAddressChange}
                placeholder="Street address, P.O. box"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Address Line 2</label>
              <Input
                name="addressLine2"
                value={newAddress.addressLine2}
                onChange={handleNewAddressChange}
                placeholder="Apartment, suite, unit, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">City *</label>
              <Input
                name="city"
                value={newAddress.city}
                onChange={handleNewAddressChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State *</label>
              <Input
                name="state"
                value={newAddress.state}
                onChange={handleNewAddressChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ZIP Code *</label>
              <Input
                name="zipCode"
                value={newAddress.zipCode}
                onChange={handleNewAddressChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Country *</label>
              <select
                name="country"
                value={newAddress.country}
                onChange={handleNewAddressChange}
                className="input w-full"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="IN">India</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            {user?.addresses?.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewAddressForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" className="flex-1">
              Continue to Payment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddressStep;