/**
 * NavigationStackV2 - Standardized stack-based navigation API
 * 
 * Provides a clean interface for managing Android back-button behavior
 * and integrates seamlessly with the existing multi-stack architecture.
 * 
 * Gradual migration approach: New code uses this API, old code continues to work.
 */

export class NavigationStackManager {
  constructor() {
    this.stacks = {
      Dashboard: [],
      Map: [],
      Logbook: [],
      Profile: [],
    };
    this.currentTab = 'Dashboard';
    this.direction = 1; // 1 for forward, -1 for back
    this.listeners = new Set();
  }

  // Core stack operations
  push(pathname) {
    const stack = this.stacks[this.currentTab];
    if (stack[stack.length - 1] === pathname) return; // Avoid duplicates
    stack.push(pathname);
    this.direction = 1;
    this.notifyListeners();
  }

  pop() {
    const stack = this.stacks[this.currentTab];
    if (stack.length <= 1) return false; // Can't pop root
    stack.pop();
    this.direction = -1;
    this.notifyListeners();
    return true;
  }

  // Android back-button handler
  handleAndroidBack() {
    const stack = this.stacks[this.currentTab];
    
    // If we're deeper than root, go back
    if (stack.length > 1) {
      return this.pop();
    }
    
    // At root, let system handle (exit or home)
    return false;
  }

  // Tab switching
  switchTab(tabName) {
    const validTabs = ['Dashboard', 'Map', 'Logbook', 'Profile'];
    if (!validTabs.includes(tabName)) return;
    
    this.currentTab = tabName;
    this.direction = 1; // Reset to forward
    this.notifyListeners();
  }

  // Query current state
  getCurrentStack() {
    return this.stacks[this.currentTab];
  }

  getCurrentPathname() {
    const stack = this.stacks[this.currentTab];
    return stack[stack.length - 1] ?? '/';
  }

  getCanGoBack() {
    const stack = this.stacks[this.currentTab];
    return stack.length > 1;
  }

  getDirection() {
    return this.direction;
  }

  // Listener pattern for React integration
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({
      stack: this.getCurrentStack(),
      pathname: this.getCurrentPathname(),
      canGoBack: this.getCanGoBack(),
      direction: this.direction,
      currentTab: this.currentTab,
    }));
  }

  // Debugging
  getDebugState() {
    return {
      stacks: this.stacks,
      currentTab: this.currentTab,
      direction: this.direction,
    };
  }
}

// Singleton instance
export const navigationStack = new NavigationStackManager();