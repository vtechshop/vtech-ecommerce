// FILE: apps/web/src/hooks/useConsent.js
import { useSelector, useDispatch } from 'react-redux';
import { setConsent, acceptAll, rejectNonEssential } from '@/store/slices/consentSlice';

const useConsent = () => {
  const dispatch = useDispatch();
  const { preferences, bannerVisible } = useSelector((state) => state.consent);

  const updateConsent = (newPreferences) => {
    dispatch(setConsent(newPreferences));
  };

  const acceptAllConsent = () => {
    dispatch(acceptAll());
  };

  const rejectAll = () => {
    dispatch(rejectNonEssential());
  };

  const hasConsent = (type) => {
    return preferences[type] === true;
  };

  return {
    preferences,
    bannerVisible,
    hasConsent,
    updateConsent,
    acceptAllConsent,
    rejectAll,
  };
};

export default useConsent;