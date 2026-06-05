import { useCallback, createContext, useContext } from 'react';

// Detect if we are on an iOS device (iPhone/iPad) with Safari 17.4+
const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  // Basic iOS device detection
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  // Safari 17.4 introduced haptics on switches; older versions ignore haptic()
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return isApple && isSafari;
};

// Embedded ios-haptics implementation (triggers a switch toggle)
const iosHaptic = (() => {
  const haptic = () => {
    try {
      const label = document.createElement('label');
      label.ariaHidden = 'true';
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.head.appendChild(label);
      label.click(); // Toggle the hidden switch to trigger haptic
      document.head.removeChild(label);
    } catch {
      /* ignore errors */
    }
  };
  // Patterns for multiple taps
  haptic.confirm = () => {
    haptic();
    setTimeout(() => haptic(), 120);
  };
  haptic.error = () => {
    haptic();
    setTimeout(() => haptic(), 120);
    setTimeout(() => haptic(), 240);
  };
  return haptic;
})();

// Vibration patterns by type for non-iOS devices
const VibrationMap = {
  light: 10,
  medium: 20,
  heavy: 50,
  selection: [10, 50, 10],
  impact: [20, 100, 20],
  notification: [50, 100, 50],
  success: [10, 50, 10, 50, 10],
  warning: [50, 50, 50],
  error: [100, 50, 100],
};

// Hook that decides which haptic method to call
const useHapticFeedback = () => {
  return useCallback((type = 'light') => {
    if (isIOS()) {
      // Map our generic types to the ios-haptics patterns
      switch (type) {
        case 'success':
        case 'notification':
        case 'medium':
          iosHaptic.confirm();
          break;
        case 'error':
        case 'heavy':
          iosHaptic.error();
          break;
        default:
          iosHaptic();
      }
    } else if (navigator && typeof navigator.vibrate === 'function') {
      const pattern = VibrationMap[type] || VibrationMap.light;
      try {
        navigator.vibrate(pattern);
      } catch {
        /* ignore vibration errors */
      }
    }
    // If neither method exists, do nothing (graceful fallback)
  }, []);
};

// Context for sharing triggerHaptic
const HapticContext = createContext();

export const useHaptic = () => {
  const ctx = useContext(HapticContext);
  if (!ctx) {
    throw new Error('useHaptic must be used within a HapticProvider');
  }
  return ctx;
};

export const HapticProvider = ({ children }) => {
  const triggerHaptic = useHapticFeedback();
  return (
    <HapticContext.Provider value={{ triggerHaptic }}>
      {children}
    </HapticContext.Provider>
  );
};

// Optional higher-order component
export const withHaptic = (Component) => {
  return (props) => {
    const { triggerHaptic } = useHaptic();
    return <Component {...props} triggerHaptic={triggerHaptic} />;
  };
};

// Utility to wrap event handlers
export const createHapticHandler = (triggerHaptic, type = 'light') => {
  return (originalHandler) => {
    return (...args) => {
      triggerHaptic(type);
      if (originalHandler) {
        return originalHandler(...args);
      }
    };
  };
};