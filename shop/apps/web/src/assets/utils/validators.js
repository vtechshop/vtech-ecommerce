// FILE: apps/web/src/utils/validators.js
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
};

export const validatePhone = (phone) => {
  const re = /^\+?[1-9]\d{1,14}$/;
  return re.test(phone.replace(/[\s-]/g, ''));
};

export const validateZipCode = (zipCode, country = 'US') => {
  if (country === 'US') {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
  }
  return zipCode.length > 0;
};

export const validateCreditCard = (cardNumber) => {
  // Luhn algorithm
  const num = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};