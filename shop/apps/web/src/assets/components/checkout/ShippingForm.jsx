// FILE: apps/web/src/components/checkout/ShippingForm.jsx
import { useState } from 'react';
import Input from '@/components/common/Input';

const ShippingForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    fullName: initialData.fullName || '',
    phone: initialData.phone || '',
    addressLine1: initialData.addressLine1 || '',
    addressLine2: initialData.addressLine2 || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zipCode || '',
    country: initialData.country || 'US',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Full Name *</label>
          <Input
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Phone Number *</label>
          <Input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
          <Input
            name="addressLine1"
            value={formData.addressLine1}
            onChange={handleChange}
            placeholder="Street address, P.O. box"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Address Line 2</label>
          <Input
            name="addressLine2"
            value={formData.addressLine2}
            onChange={handleChange}
            placeholder="Apartment, suite, unit, building, floor, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">City *</label>
          <Input
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">State / Province *</label>
          <Input
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">ZIP / Postal Code *</label>
          <Input
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Country *</label>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
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

      <button type="submit" className="hidden">Submit</button>
    </form>
  );
};

export default ShippingForm;