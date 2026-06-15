import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * MobileStackManager - Single Source of Truth for Navigation
 *
 * Responsibilities:
 * - Manage page stacks for tabbed navigation
 * - Track current page and navigation direction
 * - Handle back-button logic
 * - NO direct history API usage (React Router handles UI)
 * - Publish state changes to subscribers (NavigationTracker)
 */
class StackManager {
  constructor() {
    this.stacks = {
      home: ['Dashboard'],
      logbook: ['Logbook'],
      map: ['Map'],
      analysis: ['Analysis'],
      settings: ['Settings'],
      other: []
    };
    this.currentTab = 'home';
    this.direction = 'push';
    this.listeners = [];
  }

  getTabForPage(pageName) {
    const tabMap = {
      'Dashboard': 'home', 'Home': 'home',
      'Logbook': 'logbook', 'Log': 'logbook',
      'Map': 'map', 'MapPage': 'map',
      'Analysis': 'analysis', 'WaterAnalysis': 'analysis',
      'Settings': 'settings', 'Profile': 'settings'
    };
    return tabMap[pageName] || 'other';
  }

  /**
   * Push a page onto the current tab's stack
   * Called by MobileLink or programmatic navigation
   */
  push(pageName) {
    const tab = this.getTabForPage(pageName);
    const stack = this.stacks[tab];
    if (stack[stack.length - 1] !== pageName) {
      stack.push(pageName);
      this.currentTab = tab;
      this.direction = 'push';
      this.notifyListeners();
    }
  }

  /**
   * Pop current page from stack (back navigation)
   * Returns the new top page name or null if at root
   */
  pop() {
    const stack = this.stacks[this.currentTab];
    if (stack.length > 1) {
      stack.pop();
      this.direction = 'pop';
      this.notifyListeners();
      return stack[stack.length - 1];
    }
    return null;
  }

  /**
   * Handle Android/hardware back button
   * Returns true if navigation occurred, false if at root
   */
  handleAndroidBack() {
    const prevPage = this.pop();
    return prevPage !== null;
  }

  /**
   * Switch to a different tab
   * Returns the top page of that tab or null if empty
   */
  switchTab(tabName) {
    if (this.stacks[tabName] && this.stacks[tabName].length > 0) {
      this.currentTab = tabName;
      this.direction = 'tab-switch';
      this.notifyListeners();
      return this.stacks[tabName][this.stacks[tabName].length - 1];
    }
    return null;
  }

  /**
   * Get the current page name at the top of current tab's stack
   */
  getCurrentPage() {
    const stack = this.stacks[this.currentTab];
    return stack[stack.length - 1] || null;
  }

  /**
   * Check if back navigation is possible
   */
  canGoBack() {
    return this.stacks[this.currentTab].length > 1;
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all subscribers of state change
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.getState()));
  }

  /**
   * Get current navigation state
   */
  getState() {
    return {
      currentTab: this.currentTab,
      currentPage: this.getCurrentPage(),
      direction: this.direction,
      canGoBack: this.canGoBack(),
      stacks: this.stacks
    };
  }
}

const stackManager = new StackManager();
const StackContext = createContext(null);

export function MobileStackProvider({ children }) {
  const [state, setState] = useState(stackManager.getState());

  useEffect(() => {
    const unsubscribe = stackManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return (
    <StackContext.Provider value={{ stackManager, state }}>
      {children}
    </StackContext.Provider>
  );
}

export function useMobileStack() {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error('useMobileStack must be used within MobileStackProvider');
  }
  return context;
}

export { stackManager };