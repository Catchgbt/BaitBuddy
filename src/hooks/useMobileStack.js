import { useEffect, useState } from 'react';
import { mobileStack } from '@/lib/MobileStackManager';

/**
 * useMobileStack - React integration for MobileStackManager
 */
export function useMobileStack() {
  const [state, setState] = useState(mobileStack.getState());

  useEffect(() => {
    const unsubscribe = mobileStack.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    push: (pathname) => mobileStack.push(pathname),
    pop: () => mobileStack.pop(),
    switchTab: (tabName) => mobileStack.switchTab(tabName),
    resetStack: () => mobileStack.resetStack(),
    handleAndroidBack: () => mobileStack.handleAndroidBack(),
  };
}