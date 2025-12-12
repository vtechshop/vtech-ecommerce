// FILE: apps/web/src/utils/razorpay.js
/**
 * Load Razorpay script dynamically
 * @returns {Promise<boolean>} Whether script was loaded successfully
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Create Razorpay order from backend
 * @param {string} orderId - Order ID from your database
 * @param {number} amount - Amount in INR
 * @returns {Promise<object>} Razorpay order details
 */
export const createRazorpayOrder = async (orderId, amount) => {
  try {
    const response = await fetch('/api/payment/razorpay/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ orderId, amount }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to create order');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

/**
 * Verify payment on backend
 * @param {object} paymentData - Payment verification data
 * @returns {Promise<object>} Verification result
 */
export const verifyRazorpayPayment = async (paymentData) => {
  try {
    const response = await fetch('/api/payment/razorpay/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Payment verification failed');
    }

    return data.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Record payment failure
 * @param {string} orderId - Order ID
 * @param {object} error - Error details
 * @returns {Promise<void>}
 */
export const recordPaymentFailure = async (orderId, error) => {
  try {
    await fetch('/api/payment/razorpay/failure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ orderId, error }),
    });
  } catch (err) {
    console.error('Error recording payment failure:', err);
  }
};

/**
 * Initialize and display Razorpay payment
 * @param {object} options - Payment options
 * @param {string} options.orderId - Your order ID
 * @param {number} options.amount - Amount in INR
 * @param {object} options.customer - Customer details
 * @param {function} options.onSuccess - Success callback
 * @param {function} options.onFailure - Failure callback
 * @returns {Promise<void>}
 */
export const initiateRazorpayPayment = async ({
  orderId,
  amount,
  customer,
  onSuccess,
  onFailure,
}) => {
  try {
    // Load Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Failed to load Razorpay SDK');
    }

    // Create order on backend
    const orderData = await createRazorpayOrder(orderId, amount);

    // Razorpay options
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Vtech',
      description: `Order #${orderId}`,
      image: '/logo.png', // Your logo URL
      order_id: orderData.orderId,
      prefill: {
        name: customer.name || '',
        email: customer.email || '',
        contact: customer.phone || '',
      },
      notes: {
        orderId: orderId,
      },
      theme: {
        color: '#3b82f6', // Primary color
      },
      handler: async function (response) {
        try {
          // Verify payment on backend
          const verificationData = {
            orderId: orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          };

          const result = await verifyRazorpayPayment(verificationData);

          if (onSuccess) {
            onSuccess(result);
          }
        } catch (error) {
          console.error('Payment verification failed:', error);
          if (onFailure) {
            onFailure(error);
          }
        }
      },
      modal: {
        ondismiss: function () {
          console.log('Payment modal dismissed');
          if (onFailure) {
            onFailure({ message: 'Payment cancelled by user' });
          }
        },
      },
    };

    // Create Razorpay instance and open payment modal
    const razorpay = new window.Razorpay(options);

    razorpay.on('payment.failed', async function (response) {
      console.error('Payment failed:', response.error);

      // Record failure on backend
      await recordPaymentFailure(orderId, {
        code: response.error.code,
        description: response.error.description,
        source: response.error.source,
        step: response.error.step,
        reason: response.error.reason,
        metadata: response.error.metadata,
      });

      if (onFailure) {
        onFailure(response.error);
      }
    });

    razorpay.open();
  } catch (error) {
    console.error('Error initiating payment:', error);
    if (onFailure) {
      onFailure(error);
    }
  }
};

/**
 * Get Razorpay key from backend
 * @returns {Promise<string>} Razorpay key ID
 */
export const getRazorpayKey = async () => {
  try {
    const response = await fetch('/api/payment/razorpay/key');
    const data = await response.json();
    return data.keyId;
  } catch (error) {
    console.error('Error fetching Razorpay key:', error);
    throw error;
  }
};
