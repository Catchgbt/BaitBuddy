import { useEffect, useState } from 'react';
import { navigationStack } from '@/lib/NavigationStackV2';

/**
 * React hook for NavigationStackV2
 * 
 * Provides seamless integration between the standardized navigation API
 * and React components. Maintains backward compatibility with existing code.
 */
export function useNavigationStackV2() {
  const [state, setState] = useState({
    stack: navigationStack.getCurrentStack(),
    pathname: navigationStack.getCurrentPathname(),
    canGoBack: navigationStack.getCanGoBack(),
    direction: navigationStack.getDirection(),
    currentTab: navigationStack.currentTab,
  });

  useEffect(() => {
    const unsubscribe = navigationStack.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
    push: (pathname) => navigationStack.push(pathname),
    pop: () => navigationStack.pop(),
    switchTab: (tabName) => navigationStack.switchTab(tabName),
    handleAndroidBack: () => navigationStack.handleAndroidBack(),
  };
}