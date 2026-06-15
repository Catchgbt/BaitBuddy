import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/**
 * Multi-stack Navigation Context
 *
 * Maintains separate navigation stacks for each bottom tab (Dashboard, Map, Logbook, Profile).
 * When switching tabs, the context saves the current stack and restores the target tab's stack.
 * This provides native mobile tab behavior: each tab preserves its own back-stack.
 */

export const ROOT_SEGMENTS = new Set([
  '', 'Dashboard', 'Map', 'Logbook', 'Profile', 'Home', 'Start',
]);

const TAB_ROOT_NAMES = ['Dashboard', 'Map', 'Logbook', 'Profile'];

const NavigationContext = createContext({
  stack: [],
  direction: 1,
  canGoBack: false,
  isRootTab: true,
  currentTab: 'Dashboard',
  pushRoute: () => {},
  popRoute: () => {},
  resetStack: () => {},
  switchTab: () => {},
  getTabStack: () => [],
});

export function NavigationProvider({ children }) {
  // Map of tab name -> stack array
  const [tabStacks, setTabStacks] = useState({
    Dashboard: [],
    Map: [],
    Logbook: [],
    Profile: [],
  });

  // Currently active tab
  const [currentTab, setCurrentTab] = useState('Dashboard');

  // Direction for animations
  const [direction, setDirection] = useState(1);

  // Stable refs for event handlers
  const tabStacksRef = useRef(tabStacks);
  const currentTabRef = useRef(currentTab);
  const directionRef = useRef(direction);

  // Update refs whenever state changes
  useEffect(() => {
    tabStacksRef.current = tabStacks;
  }, [tabStacks]);

  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Get the stack for the current tab
  const currentStack = tabStacks[currentTab] || [];

  const pushRoute = useCallback((pathname) => {
    setTabStacks(prev => {
      const tab = currentTabRef.current;
      const stack = prev[tab] || [];

      // Avoid duplicates at the top of the stack
      if (stack[stack.length - 1] === pathname) return prev;

      const newStack = [...stack, pathname];
      directionRef.current = 1;
      setDirection(1);

      return {
        ...prev,
        [tab]: newStack,
      };
    });
  }, []);

  const popRoute = useCallback(() => {
    setTabStacks(prev => {
      const tab = currentTabRef.current;
      const stack = prev[tab] || [];

      // Don't pop below 1 item (can't pop the root)
      if (stack.length <= 1) return prev;

      const newStack = stack.slice(0, -1);
      directionRef.current = -1;
      setDirection(-1);

      return {
        ...prev,
        [tab]: newStack,
      };
    });
  }, []);

  // Switch to a different tab
  const switchTab = useCallback((tabName) => {
    if (!TAB_ROOT_NAMES.includes(tabName)) return;

    setCurrentTab(tabName);
    // Switching tabs resets direction to forward
    directionRef.current = 1;
    setDirection(1);
  }, []);

  // Hard-reset the stack for the current tab (e.g. on logout or explicit reset)
  const resetStack = useCallback(() => {
    setTabStacks(prev => ({
      ...prev,
      [currentTabRef.current]: [],
    }));
    directionRef.current = 1;
    setDirection(1);
  }, []);

  // Get the stack for a specific tab (for external querying)
  const getTabStack = useCallback((tabName) => {
    return tabStacks[tabName] || [];
  }, [tabStacks]);

  const currentPathname = currentStack[currentStack.length - 1] ?? '/';
  const currentSegment = currentPathname.replace(/^\//, '').split('/')[0];
  const isRootTab = ROOT_SEGMENTS.has(currentSegment);
  const canGoBack = currentStack.length > 1 && !isRootTab;

  return (
    <NavigationContext.Provider
      value={{
        stack: currentStack,
        direction,
        canGoBack,
        isRootTab,
        currentTab,
        pushRoute,
        popRoute,
        resetStack,
        switchTab,
        getTabStack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  return useContext(NavigationContext);
}