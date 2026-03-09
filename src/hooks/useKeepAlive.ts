import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../utils/constants';

const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes (Render sleeps after 15 min inactivity)

/**
 * Keeps the Render.com free-tier backend alive by pinging it every 4 minutes.
 * Only pings while the app is in the foreground to save battery.
 */
export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = () => {
      fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(() => {});
    };

    const startPinging = () => {
      if (intervalRef.current) return;
      ping(); // immediate ping on start
      intervalRef.current = setInterval(ping, PING_INTERVAL);
    };

    const stopPinging = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        startPinging();
      } else {
        stopPinging();
      }
    };

    // Start immediately
    startPinging();

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      stopPinging();
      subscription.remove();
    };
  }, []);
}
