// FILE: apps/web/src/components/common/SoundToggle.jsx
// Simple sound toggle button for header/dashboard
import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getSoundEnabled, toggleSound, playClick } from '@/utils/sounds';

const SoundToggle = ({ className = '' }) => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getSoundEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    toggleSound(newValue);
    // Play a click sound to confirm sounds are on
    if (newValue) {
      setTimeout(() => playClick(), 50);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-colors ${
        enabled
          ? 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-gray-800'
          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${className}`}
      title={enabled ? 'Sound On - Click to mute' : 'Sound Off - Click to unmute'}
      aria-label={enabled ? 'Mute sounds' : 'Unmute sounds'}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
    </button>
  );
};

export default SoundToggle;
