// FILE: apps/web/src/components/checkout/SmartAddressForm.jsx
import { useState, useEffect, useCallback } from 'react';
import { Loader2, MapPin, CheckCircle, AlertCircle, LocateFixed } from 'lucide-react';
import Input from '@/components/common/Input';

const INDIA_CODE = 'IN';

// States with restricted delivery — customer must contact office
const RESTRICTED_STATES = [
  'andaman and nicobar islands',
  'andaman and nicobar',
  'andaman & nicobar islands',
  'andaman & nicobar',
  'lakshadweep',
];
// Pincode prefixes: 744xxx = A&N Islands, 68255x = Lakshadweep
const isRestrictedPincode = (pin = '') => /^744\d{3}$/.test(pin) || /^68255[5-9]$/.test(pin);
const isRestrictedState = (state = '') => RESTRICTED_STATES.includes(state.trim().toLowerCase());
export const isRestrictedArea = (state = '', pincode = '') =>
  isRestrictedState(state) || isRestrictedPincode(pincode);

// Tiny spinner for inline loading
const InlineSpinner = () => (
  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
);

const SmartAddressForm = ({ address, onChange, guestEmail, onGuestEmailChange, user }) => {
  // Country list from REST Countries API
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  // India pincode lookup
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeSuccess, setPincodeSuccess] = useState('');
  const [postOffices, setPostOffices] = useState([]); // Multiple areas from pincode
  const [restrictedArea, setRestrictedArea] = useState(false);

  // GPS location detection
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');

  // International cascading dropdowns
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const isIndia = address.country === INDIA_CODE;

  // ─── Load all countries on mount ────────────────────────────
  useEffect(() => {
    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const data = await res.json();
        const sorted = data
          .map((c) => ({ value: c.cca2, label: c.name.common }))
          .sort((a, b) => a.label.localeCompare(b.label));
        // Put India at top
        const india = sorted.find((c) => c.value === 'IN');
        const rest = sorted.filter((c) => c.value !== 'IN');
        setCountries(india ? [india, ...rest] : sorted);
      } catch {
        // Fallback to basic list
        setCountries([
          { value: 'IN', label: 'India' },
          { value: 'US', label: 'United States' },
          { value: 'GB', label: 'United Kingdom' },
          { value: 'CA', label: 'Canada' },
          { value: 'AU', label: 'Australia' },
          { value: 'AE', label: 'United Arab Emirates' },
          { value: 'SG', label: 'Singapore' },
        ]);
      } finally {
        setCountriesLoading(false);
      }
    };
    loadCountries();
  }, []);

  // ─── India: Pincode lookup ──────────────────────────────────
  const lookupPincode = useCallback(async (pincode, currentAddress) => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setPincodeError(pincode.length === 6 ? 'Enter a valid 6-digit pincode' : '');
      setPincodeSuccess('');
      setPostOffices([]);
      return;
    }

    setPincodeLoading(true);
    setPincodeError('');
    setPincodeSuccess('');
    setPostOffices([]);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();

      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const offices = data[0].PostOffice;
        const first = offices[0];
        setPostOffices(offices);
        setPincodeSuccess(`${first.District}, ${first.State}`);

        // Auto-fill state, district, city - use currentAddress to avoid stale closure
        onChange({
          ...currentAddress,
          zipCode: pincode, // Ensure pincode is preserved
          state: first.State,
          city: first.District,
          district: first.District,
          area: first.Name, // First post office name as area
        });
        setRestrictedArea(isRestrictedArea(first.State, pincode));
      } else {
        setPincodeError('Invalid pincode. Please check and try again.');
      }
    } catch {
      setPincodeError('Could not verify pincode. Please fill details manually.');
    } finally {
      setPincodeLoading(false);
    }
  }, [onChange]);

  // ─── International: Load states when country changes ────────
  useEffect(() => {
    if (isIndia || !address.country) {
      setStates([]);
      setCities([]);
      return;
    }

    const countryName = countries.find((c) => c.value === address.country)?.label;
    if (!countryName) return;

    const loadStates = async () => {
      setStatesLoading(true);
      setStates([]);
      setCities([]);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: countryName }),
        });
        const data = await res.json();
        if (!data.error && data.data?.states) {
          setStates(data.data.states.map((s) => ({ value: s.name, label: s.name })));
        }
      } catch {
        setStates([]);
      } finally {
        setStatesLoading(false);
      }
    };
    loadStates();
  }, [address.country, isIndia, countries]);

  // ─── International: Load cities when state changes ──────────
  useEffect(() => {
    if (isIndia || !address.country || !address.state) {
      setCities([]);
      return;
    }

    const countryName = countries.find((c) => c.value === address.country)?.label;
    if (!countryName) return;

    const loadCities = async () => {
      setCitiesLoading(true);
      setCities([]);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: countryName, state: address.state }),
        });
        const data = await res.json();
        if (!data.error && data.data?.length > 0) {
          setCities(data.data.map((c) => ({ value: c, label: c })));
        }
      } catch {
        setCities([]);
      } finally {
        setCitiesLoading(false);
      }
    };
    loadCities();
  }, [address.country, address.state, isIndia, countries]);

  // ─── Handle country change ──────────────────────────────────
  const handleCountryChange = (countryCode) => {
    onChange({
      ...address,
      country: countryCode,
      state: '',
      city: '',
      district: '',
      area: '',
      zipCode: '',
    });
    setPincodeError('');
    setPincodeSuccess('');
    setPostOffices([]);
  };

  // ─── Handle pincode input ───────────────────────────────────
  const handlePincodeChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    const updatedAddress = { ...address, zipCode: cleaned };
    onChange(updatedAddress);
    if (cleaned.length === 6) {
      lookupPincode(cleaned, updatedAddress);
    } else {
      setPincodeError('');
      setPincodeSuccess('');
      setPostOffices([]);
    }
  };

  // ─── GPS: Detect location using browser + Nominatim ────────
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setLocationError('');
    setLocationSuccess('');

    try {
      // Get GPS coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 min cache
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=en`
      );
      const data = await res.json();

      if (data.address) {
        const addr = data.address;
        const countryCode = (addr.country_code || '').toUpperCase();
        const pincode = addr.postcode || '';
        const state = addr.state || '';
        const district = addr.state_district || addr.county || '';
        const city = addr.city || addr.town || addr.village || district;
        const area = addr.suburb || addr.neighbourhood || '';
        const road = addr.road || '';

        const updatedAddress = {
          ...address,
          country: countryCode || address.country,
          zipCode: pincode,
          state,
          district: countryCode === INDIA_CODE ? (district || city) : address.district,
          city: countryCode === INDIA_CODE ? (district || city) : city,
          area: area || road,
          addressLine2: area ? `${area}${road ? ', ' + road : ''}` : road,
        };

        onChange(updatedAddress);
        setLocationSuccess(
          countryCode === INDIA_CODE
            ? `${area || city}, ${district || city}, ${state} - ${pincode}`
            : `${city}, ${state} ${pincode}`
        );

        // For India: trigger pincode lookup for post office list
        if (countryCode === INDIA_CODE && pincode && /^\d{6}$/.test(pincode)) {
          lookupPincode(pincode, updatedAddress);
        }
      } else {
        setLocationError('Could not determine address from your location');
      }
    } catch (err) {
      if (err.code === 1) {
        setLocationError('Location access denied. Please allow location access in your browser settings.');
      } else if (err.code === 2) {
        setLocationError('Location unavailable. Please try again or enter manually.');
      } else if (err.code === 3) {
        setLocationError('Location request timed out. Please try again.');
      } else {
        setLocationError('Failed to detect location. Please enter address manually.');
      }
    } finally {
      setLocationLoading(false);
    }
  }, [address, onChange, lookupPincode]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Guest Email */}
      {!user && (
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="For order confirmation"
          className="md:col-span-2"
          value={guestEmail}
          onChange={(e) => onGuestEmailChange(e.target.value)}
        />
      )}

      {/* Full Name & Phone */}
      <Input
        label="Full Name"
        name="fullName"
        required
        value={address.fullName}
        onChange={(e) => onChange({ ...address, fullName: e.target.value })}
      />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        required
        value={address.phone}
        onChange={(e) => onChange({ ...address, phone: e.target.value })}
      />

      {/* ═══════════ DETECT LOCATION BUTTON ═══════════ */}
      <div className="md:col-span-2">
        <button
          type="button"
          onClick={detectLocation}
          disabled={locationLoading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 border-2 border-dashed border-blue-300 rounded-xl text-blue-700 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {locationLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Detecting your location...</span>
            </>
          ) : (
            <>
              <LocateFixed className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Use my current location</span>
            </>
          )}
        </button>
        {locationError && (
          <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {locationError}
          </p>
        )}
        {locationSuccess && (
          <p className="text-sm text-green-600 mt-1.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {locationSuccess}
          </p>
        )}
      </div>

      {/* Country Selector */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-red-500">*</span>
          {countriesLoading && <InlineSpinner />}
        </label>
        <select
          required
          value={address.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          disabled={countriesLoading}
        >
          <option value="">{countriesLoading ? 'Loading countries...' : 'Select Country'}</option>
          {countries.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* ═══════════ INDIA FLOW ═══════════ */}
      {isIndia && (
        <>
          {/* Pincode */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincode <span className="text-red-500">*</span>
              {pincodeLoading && <span className="ml-2 inline-flex"><InlineSpinner /></span>}
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={address.zipCode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  pincodeError ? 'border-red-400' : pincodeSuccess ? 'border-green-400' : 'border-gray-300'
                }`}
                placeholder="Enter 6-digit pincode"
                disabled={pincodeLoading}
              />
              {pincodeSuccess && (
                <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
              )}
              {pincodeError && (
                <AlertCircle className="absolute right-3 top-2.5 w-5 h-5 text-red-500" />
              )}
            </div>
            {pincodeError && (
              <p className="text-sm text-red-600 mt-1">{pincodeError}</p>
            )}
            {pincodeSuccess && !restrictedArea && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {pincodeSuccess}
              </p>
            )}
            {restrictedArea && (
              <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">
                  Delivery not available for <strong>{address.state || 'this area'}</strong>. Please{' '}
                  <a href="https://wa.me/919944556683" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    contact our office
                  </a>{' '}
                  for shipping arrangements.
                </p>
              </div>
            )}
          </div>

          {/* Area (from post offices) */}
          {postOffices.length > 1 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area / Locality <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={address.area}
                onChange={(e) => {
                  const selectedPO = postOffices.find(po => po.Name === e.target.value);
                  onChange({
                    ...address,
                    area: e.target.value,
                    district: selectedPO?.District || address.district,
                    city: selectedPO?.District || address.city,
                    state: selectedPO?.State || address.state,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {postOffices.map((po) => (
                  <option key={po.Name} value={po.Name}>{po.Name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Address Lines */}
          <Input
            label="Address Line 1"
            name="addressLine1"
            required
            className="md:col-span-2"
            value={address.addressLine1}
            onChange={(e) => onChange({ ...address, addressLine1: e.target.value })}
            placeholder="House/Flat No., Street, Landmark"
          />
          <Input
            label="Address Line 2 (Optional)"
            name="addressLine2"
            className="md:col-span-2"
            value={address.addressLine2}
            onChange={(e) => onChange({ ...address, addressLine2: e.target.value })}
            placeholder="Area, Colony (optional)"
          />

          {/* District, City, State - auto-filled from pincode/GPS but always editable */}
          {(pincodeSuccess || locationSuccess) && (
            <p className="md:col-span-2 text-xs text-gray-500 -mb-2">
              Auto-filled from {locationSuccess ? 'your location' : 'pincode'}. You can edit if incorrect.
            </p>
          )}
          <Input
            label="District"
            name="district"
            required
            value={address.district || ''}
            onChange={(e) => onChange({ ...address, district: e.target.value })}
            placeholder="Type your district"
          />
          <Input
            label="City"
            name="city"
            required
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            placeholder="Type your city"
          />
          <div className="md:col-span-2">
            <Input
              label="State"
              name="state"
              required
              value={address.state}
              onChange={(e) => onChange({ ...address, state: e.target.value })}
              placeholder="Type your state"
            />
          </div>
        </>
      )}

      {/* ═══════════ INTERNATIONAL FLOW ═══════════ */}
      {!isIndia && address.country && (
        <>
          {/* Address Lines */}
          <Input
            label="Address Line 1"
            name="addressLine1"
            required
            className="md:col-span-2"
            value={address.addressLine1}
            onChange={(e) => onChange({ ...address, addressLine1: e.target.value })}
            placeholder="Street address"
          />
          <Input
            label="Address Line 2 (Optional)"
            name="addressLine2"
            className="md:col-span-2"
            value={address.addressLine2}
            onChange={(e) => onChange({ ...address, addressLine2: e.target.value })}
          />

          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State / Province <span className="text-red-500">*</span>
              {statesLoading && <span className="ml-2 inline-flex"><InlineSpinner /></span>}
            </label>
            {states.length > 0 ? (
              <select
                required
                value={address.state}
                onChange={(e) => onChange({ ...address, state: e.target.value, city: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={statesLoading}
              >
                <option value="">{statesLoading ? 'Loading states...' : 'Select State'}</option>
                {states.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={address.state}
                onChange={(e) => onChange({ ...address, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={statesLoading ? 'Loading...' : 'Enter state/province'}
                disabled={statesLoading}
              />
            )}
          </div>

          {/* City Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City / District <span className="text-red-500">*</span>
              {citiesLoading && <span className="ml-2 inline-flex"><InlineSpinner /></span>}
            </label>
            {cities.length > 0 ? (
              <select
                required
                value={address.city}
                onChange={(e) => onChange({ ...address, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={citiesLoading || !address.state}
              >
                <option value="">{citiesLoading ? 'Loading cities...' : 'Select City'}</option>
                {cities.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={address.city}
                onChange={(e) => onChange({ ...address, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={citiesLoading ? 'Loading...' : !address.state ? 'Select state first' : 'Enter city'}
                disabled={citiesLoading || !address.state}
              />
            )}
          </div>

          {/* ZIP/Postal Code */}
          <Input
            label="ZIP / Postal Code"
            name="zipCode"
            required
            value={address.zipCode}
            onChange={(e) => onChange({ ...address, zipCode: e.target.value })}
            placeholder="Postal code"
          />
        </>
      )}
    </div>
  );
};

export default SmartAddressForm;
