import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAppSelector } from '../store';
import { UserRole } from '../utils/constants';

export function useAuthGuard(allowedRoles?: UserRole[]) {
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace('/(tabs)');
      return;
    }

    setIsReady(true);
  }, [isAuthenticated, isLoading, user]);

  return { isReady, user };
}
