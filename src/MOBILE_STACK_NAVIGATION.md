Mobile Stack Navigation System

Overview
The MobileStackManager provides a robust navigation system that maintains per-tab history stacks, handles Android back-button behavior, and supports directional page transitions with state-based animations.

Architecture

1. MobileStackManager (components/navigation/MobileStackManager.jsx)
   - Centralized stack management with per-tab histories
   - Maintains separate stacks for home, logbook, map, analysis, settings, other tabs
   - Tracks navigation direction (push, pop, tab-switch)
   - Subscribes components to navigation state changes

2. BackButtonHandler (components/navigation/BackButtonHandler.jsx)
   - Listens to popstate and keyboard events
   - Handles Android back-button and Escape key
   - Automatically navigates to previous page in stack

3. MobileLink (components/navigation/MobileLink.jsx)
   - Drop-in replacement for React Router Link
   - Automatically pushes page to stack on click
   - Preserves React Router functionality

4. useMobileNavigation Hook (hooks/useMobileNavigation.js)
   - Provides goToPage, goBack, switchTab methods
   - Programmatic navigation with stack management
   - Maintains history integrity

5. PageTransitionWithDirection (components/layout/PageTransitionWithDirection.jsx)
   - Directional animations based on navigation type
   - Push: slide left entry, exit right
   - Pop: slide right entry, exit left  
   - Tab-switch: fade up/down transitions

Usage Examples

Replacing Links:
   import MobileLink from '@/components/navigation/MobileLink';
   
   <MobileLink to="/Logbook" className="text-blue-500">
     View Logbook
   </MobileLink>

Programmatic Navigation:
   import { useMobileNavigation } from '@/hooks/useMobileNavigation';
   
   function MyComponent() {
     const { goToPage, goBack } = useMobileNavigation();
     
     return (
       <>
         <button onClick={() => goToPage('Map')}>Go to Map</button>
         <button onClick={goBack}>Go Back</button>
       </>
     );
   }

Tab Switching:
   import { useMobileNavigation } from '@/hooks/useMobileNavigation';
   
   const { switchTab } = useMobileNavigation();
   switchTab('logbook');

Stack Management:
   import { useMobileStack } from '@/components/navigation/MobileStackManager';
   
   const { stackManager, state } = useMobileStack();
   
   console.log(state.currentPage);     // Current page
   console.log(state.direction);       // 'push', 'pop', 'tab-switch'
   console.log(state.canGoBack);       // boolean
   console.log(state.stacks);          // All tab stacks
   
   stackManager.push('Analysis');
   stackManager.pop();
   stackManager.handleAndroidBack();

Integration Checklist

   [x] MobileStackProvider wraps layout
   [x] BackButtonHandler registered in layout
   [x] Replace Link components with MobileLink
   [x] Update programmatic navigation to use useMobileNavigation
   [x] Update PageTransition to use PageTransitionWithDirection
   [x] Test back-button behavior
   [x] Verify tab history preservation
   [x] Confirm directional animations

Per-Tab Stack Preservation

Each tab maintains its own history stack:
- home: [Dashboard, Home, etc.]
- logbook: [Logbook, Log, Analysis, etc.]
- map: [Map, MapPage, etc.]
- analysis: [Analysis, WaterAnalysis, etc.]
- settings: [Settings, Profile, etc.]
- other: [Other pages]

When switching tabs, the system navigates to the top page of that tab's stack.

Android Back Button Handling

The system intercepts:
- Hardware back button (via popstate event)
- Escape key (keyboard fallback)

If stack has > 1 page, navigates to previous. Otherwise, lets browser handle default behavior.

Direction-Based Animations

Navigation direction is tracked and used for smooth page transitions:

Push (entering new page):
- Initial: x: -100, opacity: 0
- Animate: x: 0, opacity: 1  
- Creates "forward" movement illusion

Pop (returning to previous):
- Initial: x: 100, opacity: 0
- Animate: x: 0, opacity: 1
- Creates "backward" movement illusion

Tab-Switch (changing tabs):
- Initial: y: 20, opacity: 0
- Animate: y: 0, opacity: 1
- Creates "vertical transition" between tabs