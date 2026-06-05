/**
 * MobileStackManager - Exclusive Navigation State Authority
 *
 * Single source of truth for all navigation state. Eliminates window.history API
 * dependencies and manages per-tab page stacks with back-button integration.
 *
 * Core principles:
 *   - All navigation flows through mobileStack (no React Router history manipulation)
 *   - Stack state persisted to localStorage for offline navigation
 *   - Android back button exclusive handler
 *   - Subscriber pattern for UI synchronization
 *   - No window.history.pushState/replaceState calls
 */

export class MobileStackManager {
  constructor() {
    this.stacks = {
      main: ['/']
    };
    this.currentTab = 'main';
    this.direction = 1; // 1=forward, -1=back
    this.listeners = new Set();
    
    // Load persisted state
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('mobileStack');
      if (stored) {
        const data = JSON.parse(stored);
        this.stacks = data.stacks || { main: ['/'] };
        this.currentTab = data.currentTab || 'main';
      }
    } catch (e) {
      console.warn('[MobileStack] Failed to load persisted state:', e);
      this.stacks = { main: ['/'] };
      this.currentTab = 'main';
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('mobileStack', JSON.stringify({
        stacks: this.stacks,
        currentTab: this.currentTab
      }));
    } catch (e) {
      console.warn('[MobileStack] Failed to persist state:', e);
    }
  }

  normalizePath(pathname) {
    if (!pathname) return '/';
    if (!pathname.startsWith('/')) return `/${pathname}`;
    return pathname;
  }

  /**
   * Push new path onto current tab's stack (forward navigation)
   */
  push(pathname) {
    const normalized = this.normalizePath(pathname);
    const stack = this.getOrCreateStack(this.currentTab);
    
    // Avoid duplicate at top
    if (stack[stack.length - 1] === normalized) return;
    
    stack.push(normalized);
    this.direction = 1;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Pop from current tab's stack (backward navigation)
   */
  pop() {
    const stack = this.stacks[this.currentTab];
    if (!stack || stack.length <= 1) return false;
    
    stack.pop();
    this.direction = -1;
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Replace current pathname without adding to history
   */
  replace(pathname) {
    const normalized = this.normalizePath(pathname);
    const stack = this.getOrCreateStack(this.currentTab);
    
    if (stack.length === 0) {
      stack.push(normalized);
    } else {
      stack[stack.length - 1] = normalized;
    }
    
    this.direction = 0; // No direction change for replace
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Switch to different tab, initializing if needed
   */
  switchTab(tabName) {
    if (this.currentTab !== tabName) {
      this.getOrCreateStack(tabName);
      this.currentTab = tabName;
      this.direction = 1;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Reset stack for current tab
   */
  resetStack() {
    const stack = this.stacks[this.currentTab];
    if (stack) {
      stack.length = 0;
      stack.push('/');
      this.direction = 1;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Clear all navigation history (e.g., on logout)
   */
  clearAllHistory() {
    this.stacks = { main: ['/'] };
    this.currentTab = 'main';
    this.direction = 1;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Exclusive handler for Android/hardware back button
   * Returns true if navigation succeeded, false if at root
   */
  handleAndroidBack() {
    const stack = this.stacks[this.currentTab];
    
    if (!stack || stack.length <= 1) {
      // At root - cannot go back, app should exit
      return false;
    }
    
    return this.pop();
  }

  /**
   * Get or create stack for tab
   */
  getOrCreateStack(tabName) {
    if (!this.stacks[tabName]) {
      this.stacks[tabName] = ['/'];
      this.saveToStorage();
    }
    return this.stacks[tabName];
  }

  /**
   * Query methods
   */
  getCurrentStack() {
    return this.stacks[this.currentTab] || ['/'];
  }

  getCurrentPathname() {
    const stack = this.getCurrentStack();
    return stack[stack.length - 1] ?? '/';
  }

  canGoBack() {
    return this.getCurrentStack().length > 1;
  }

  getStackLength() {
    return this.getCurrentStack().length;
  }

  getFullStack() {
    return [...this.getCurrentStack()];
  }

  /**
   * Get complete state snapshot
   */
  getState() {
    return {
      stack: this.getCurrentStack(),
      pathname: this.getCurrentPathname(),
      canGoBack: this.canGoBack(),
      direction: this.direction,
      currentTab: this.currentTab,
      stackLength: this.getStackLength(),
    };
  }

  /**
   * Event system - subscribe to navigation changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getState());
      } catch (e) {
        console.error('[MobileStack] Subscriber error:', e);
      }
    });
  }

  /**
   * Debugging
   */
  getDebugInfo() {
    return {
      stacks: this.stacks,
      currentTab: this.currentTab,
      direction: this.direction,
      listenerCount: this.listeners.size,
    };
  }
}

// Singleton - external to React, single source of truth
export const mobileStack = new MobileStackManager();