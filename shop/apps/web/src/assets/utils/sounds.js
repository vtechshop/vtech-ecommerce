// FILE: apps/web/src/assets/utils/sounds.js
// Notification Sound System using Web Audio API
// Lightweight, no external files needed

// Audio context (created on first user interaction)
let audioContext = null;

// Initialize audio context (must be called after user interaction)
const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Check if sounds are enabled (user preference)
const isSoundEnabled = () => {
  const pref = localStorage.getItem('soundEnabled');
  return pref === null ? true : pref === 'true';
};

// Toggle sound on/off
export const toggleSound = (enabled) => {
  localStorage.setItem('soundEnabled', enabled.toString());
};

// Get sound preference
export const getSoundEnabled = () => isSoundEnabled();

// Base function to play a tone
const playTone = (frequency, duration, type = 'sine', volume = 0.3) => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = initAudio();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
};

// Play multiple notes in sequence
const playMelody = (notes, volume = 0.3) => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = initAudio();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    let startTime = ctx.currentTime;

    notes.forEach(({ frequency, duration, type = 'sine' }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);

      startTime += duration;
    });
  } catch (e) {
    console.warn('Melody playback failed:', e);
  }
};

// ============================================
// CUSTOMER SOUNDS
// ============================================

// Add to Cart - Soft pop/ding
export const playAddToCart = () => {
  playMelody([
    { frequency: 800, duration: 0.08, type: 'sine' },
    { frequency: 1200, duration: 0.12, type: 'sine' },
  ], 0.2);
};

// Wishlist Add - Soft heart beat
export const playWishlistAdd = () => {
  playMelody([
    { frequency: 600, duration: 0.1, type: 'sine' },
    { frequency: 800, duration: 0.15, type: 'sine' },
  ], 0.15);
};

// Checkout Success - Happy chime
export const playCheckoutSuccess = () => {
  playMelody([
    { frequency: 523, duration: 0.15, type: 'sine' },  // C5
    { frequency: 659, duration: 0.15, type: 'sine' },  // E5
    { frequency: 784, duration: 0.15, type: 'sine' },  // G5
    { frequency: 1047, duration: 0.3, type: 'sine' },  // C6
  ], 0.25);
};

// Error Sound - Subtle warning
export const playError = () => {
  playMelody([
    { frequency: 300, duration: 0.15, type: 'square' },
    { frequency: 200, duration: 0.2, type: 'square' },
  ], 0.15);
};

// Button Click - Subtle feedback
export const playClick = () => {
  playTone(600, 0.05, 'sine', 0.1);
};

// ============================================
// VENDOR/ADMIN SOUNDS
// ============================================

// New Order Alert - Cash register "ka-ching"
export const playNewOrder = () => {
  playMelody([
    { frequency: 1318, duration: 0.08, type: 'sine' },  // E6
    { frequency: 1568, duration: 0.08, type: 'sine' },  // G6
    { frequency: 2093, duration: 0.15, type: 'sine' },  // C7
    { frequency: 2637, duration: 0.25, type: 'sine' },  // E7
  ], 0.3);
};

// Low Stock Warning - Alert beep
export const playLowStockWarning = () => {
  playMelody([
    { frequency: 880, duration: 0.1, type: 'square' },
    { frequency: 0, duration: 0.05, type: 'sine' },
    { frequency: 880, duration: 0.1, type: 'square' },
    { frequency: 0, duration: 0.05, type: 'sine' },
    { frequency: 880, duration: 0.15, type: 'square' },
  ], 0.2);
};

// New Message/Notification - Messenger style
export const playNewMessage = () => {
  playMelody([
    { frequency: 587, duration: 0.1, type: 'sine' },   // D5
    { frequency: 880, duration: 0.15, type: 'sine' },  // A5
  ], 0.25);
};

// Payout Received - Money transfer success
export const playPayoutReceived = () => {
  playMelody([
    { frequency: 392, duration: 0.1, type: 'sine' },   // G4
    { frequency: 523, duration: 0.1, type: 'sine' },   // C5
    { frequency: 659, duration: 0.1, type: 'sine' },   // E5
    { frequency: 784, duration: 0.2, type: 'sine' },   // G5
  ], 0.25);
};

// Status Update - Confirmation ding
export const playStatusUpdate = () => {
  playTone(1000, 0.15, 'sine', 0.2);
};

// Delete/Remove - Soft thud
export const playDelete = () => {
  playTone(200, 0.15, 'sine', 0.15);
};

// ============================================
// NOTIFICATION BADGE UPDATE
// ============================================

// Badge count increase
export const playBadgeUpdate = () => {
  playTone(1200, 0.08, 'sine', 0.15);
};

// Export all sounds as object for easy access
export const sounds = {
  // Customer
  addToCart: playAddToCart,
  wishlistAdd: playWishlistAdd,
  checkoutSuccess: playCheckoutSuccess,
  error: playError,
  click: playClick,

  // Vendor/Admin
  newOrder: playNewOrder,
  lowStockWarning: playLowStockWarning,
  newMessage: playNewMessage,
  payoutReceived: playPayoutReceived,
  statusUpdate: playStatusUpdate,
  delete: playDelete,
  badgeUpdate: playBadgeUpdate,

  // Settings
  toggle: toggleSound,
  isEnabled: getSoundEnabled,
};

export default sounds;
