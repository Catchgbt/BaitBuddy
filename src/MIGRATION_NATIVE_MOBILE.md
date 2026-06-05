# Native Mobile Migration Guide

## Quick Start Checklist

- [ ] Update NavigationTracker to use `mobileStack` instead of history API
- [ ] Replace all `hover:` classes with `active:` equivalents
- [ ] Add `focus:ring-*` to all interactive elements
- [ ] Replace unstyled form elements with `MobileForm` components
- [ ] Verify all touch targets are 44px+ (44 logical pixels)
- [ ] Add aria-labels to all icon buttons
- [ ] Test on Android with TalkBack enabled
- [ ] Test on iOS with VoiceOver enabled

## Phase 1: Navigation Migration

### Update NavigationTracker

```javascript
// OLD: lib/NavigationTracker.jsx uses browser history
// NEW: Migrate to mobileStack

// File: lib/NavigationTracker.jsx
import { mobileStack } from '@/lib/MobileStackManager';

// In handlePopState:
const handlePopState = () => {
  window.history.pushState({ _navGuard: true }, '');
  
  // NEW: Use pure state manager
  if (!mobileStack.handleAndroidBack()) {
    // At root - can exit app
  } else {
    navigate(-1);
  }
};
```

### Integration with useNavigationContext

```javascript
// Keep existing useNavigationContext for compatibility
// It will sync with mobileStack automatically

import { useMobileStack } from '@/hooks/useMobileStack';

// In components that need navigation:
function MyComponent() {
  const { push, pop, canGoBack } = useMobileStack();
  
  // Use push/pop instead of navigate
  const handleNavigate = () => {
    push('/NewPage');
  };
  
  const handleBack = () => {
    if (!pop()) {
      // At root - cannot go back
    }
  };
}
```

## Phase 2: Remove Hover-Only Effects

### Global Pattern

Before:
```jsx
<button className="hover:bg-blue-500/10 hover:text-blue-300">
  Click me
</button>
```

After:
```jsx
<button className="active:scale-95 active:bg-blue-500/10 focus:ring-2 focus:ring-blue-400">
  Click me
</button>
```

### Common Replacements

| Pattern | Replacement | Reason |
|---------|------------|--------|
| `hover:text-cyan-300` | `active:text-cyan-300` | Touch feedback |
| `hover:bg-cyan-500/20` | `active:bg-cyan-500/20` | Touch feedback |
| `hover:opacity-80` | `active:opacity-80` | Touch feedback |
| `hover:scale-105` | `active:scale-95` | Touch interaction |
| (missing) | `focus:ring-2 focus:ring-offset-2` | Keyboard nav |

### Files to Update

```bash
# Find all hover-only effects
grep -r "hover:" src/ | grep -v "active:" | grep -v "focus:" > hover-to-fix.txt

# Check which files need attention
grep -l "hover:" src/components/ui/*.jsx
grep -l "hover:" src/pages/*.jsx
```

### Example: Button Component

Already updated in `components/ui/button` to include:
- `active:scale-95` - Touch visual feedback
- `focus-visible:ring-2 focus-visible:ring-offset-2` - Keyboard navigation
- Removed all `hover:` classes

## Phase 3: Form Elements

### Audit Form Elements

```bash
# Find all unstyled form elements
grep -r "<input" src/ | grep -v "className"
grep -r "<select" src/ | grep -v "className"
grep -r "<textarea" src/ | grep -v "className"
```

### Replace with Mobile Components

```javascript
// OLD
<input 
  type="text" 
  placeholder="Username"
/>

// NEW
import { MobileInput } from '@/components/ui/mobile-form';

<MobileInput 
  label="Username"
  placeholder="Username"
  value={username}
  onChange={e => setUsername(e.target.value)}
  error={errors.username}
/>
```

### Form Component Reference

```javascript
import {
  MobileInput,
  MobileSelect,
  MobileCheckbox,
  MobileRadio,
  MobileTextarea,
} from '@/components/ui/mobile-form';

// Text input with label
<MobileInput 
  label="Email"
  type="email"
  placeholder="your@email.com"
  error={formErrors.email}
/>

// Select dropdown
<MobileSelect 
  label="Category"
  options={[
    { value: 'fish', label: 'Fish Species' },
    { value: 'spot', label: 'Fishing Spot' },
  ]}
  value={selectedCategory}
  onChange={e => setSelectedCategory(e.target.value)}
/>

// Checkbox with label
<MobileCheckbox 
  label="Accept terms and conditions"
  checked={accepted}
  onChange={e => setAccepted(e.target.checked)}
/>

// Radio button
<MobileRadio 
  label="Public profile"
  name="privacy"
  value="public"
  checked={privacy === 'public'}
  onChange={e => setPrivacy(e.target.value)}
/>

// Textarea
<MobileTextarea 
  label="Description"
  placeholder="Enter detailed description..."
  value={description}
  onChange={e => setDescription(e.target.value)}
  error={formErrors.description}
/>
```

## Phase 4: Touch Targets and Accessibility

### Minimum Touch Target Size

All interactive elements must be at least 44x44 logical pixels.

```javascript
// Enforcing in component
<button 
  className="min-h-[44px] min-w-[44px] px-4 py-2"
>
  Touch target button
</button>

// Or use predefined utilities
import { minTouchTarget } from '@/utils/touchInteractions';

<button className={minTouchTarget.icon}>
  Icon button (44x44)
</button>
```

### ARIA Labels for Icon Buttons

```jsx
// Icon button MUST have aria-label
<button 
  className="icon"
  aria-label="Open menu"
>
  <MenuIcon />
</button>

// Icon button MUST NOT have aria-label (has text)
<button>
  <MenuIcon />
  Open Menu
</button>
```

### Form Input Accessibility

```jsx
// Every input needs an associated label
<label htmlFor="username" className="block mb-2">
  Username
</label>
<input 
  id="username"
  type="text"
  className="min-h-[44px]"
/>

// Or use MobileInput which handles this
<MobileInput 
  label="Username"
/>
```

## Phase 5: Testing

### Screen Reader Testing

**Android (TalkBack)**
1. Go to Settings > Accessibility > TalkBack
2. Enable TalkBack
3. Swipe right to navigate
4. Double-tap to activate
5. Verify all buttons are announced
6. Verify all form labels are read

**iOS (VoiceOver)**
1. Go to Settings > Accessibility > VoiceOver
2. Enable VoiceOver
3. Swipe right to navigate
4. Double-tap to activate
5. Verify all buttons are announced
6. Verify all form labels are read

### Touch Performance

Run in DevTools console:
```javascript
// Load the audit script
import { runMobileAudit } from '@/lib/auditScript';
runMobileAudit();
```

This checks:
- Touch target sizes (44px+)
- Hover-only classes
- Native form elements
- Missing aria-labels
- Focus ring visibility

### Device Testing

**Low-end Android (Recommended)**
- Moto G series (budget device)
- Chrome DevTools mobile emulation (low-end preset)
- Check 60fps on scroll and interactions

**iOS Testing**
- iPhone SE (older model)
- Safari mobile
- Check 60fps animations

## Phase 6: Common Issues and Solutions

### Issue: Button not responding to taps

**Solution:** Ensure minimum 44px size
```javascript
// Wrong - too small
<button className="w-6 h-6" />

// Correct
<button className="w-11 h-11 min-w-[44px] min-h-[44px]" />
```

### Issue: Form inputs not mobile-friendly

**Solution:** Use MobileForm components
```javascript
// Wrong
<input type="email" />

// Correct
<MobileInput type="email" label="Email" />
```

### Issue: No visual feedback on touch

**Solution:** Add active states
```javascript
// Wrong - only hover
<button className="hover:bg-blue-500" />

// Correct
<button className="active:bg-blue-500 active:scale-95" />
```

### Issue: Screen reader can't find button

**Solution:** Add aria-label to icon buttons
```javascript
// Wrong
<button><SearchIcon /></button>

// Correct
<button aria-label="Search">
  <SearchIcon />
</button>
```

### Issue: Back button behavior unpredictable

**Solution:** Use mobileStack instead of history
```javascript
// Wrong - browser history
window.history.back();

// Correct
import { mobileStack } from '@/lib/MobileStackManager';
mobileStack.pop();
```

## Phase 7: Verification Checklist

Before considering migration complete:

- [ ] All buttons have `active:scale-95` or similar touch feedback
- [ ] All buttons have `focus:ring-*` for keyboard navigation
- [ ] All interactive elements are 44px+ (minimum touch target)
- [ ] All icon buttons have `aria-label`
- [ ] All form inputs use MobileForm components
- [ ] No native `<input />`, `<select>`, or `<textarea>` elements
- [ ] NavigationTracker uses `mobileStack`
- [ ] Android back-button tested with `mobileStack.handleAndroidBack()`
- [ ] TalkBack screen reader tested
- [ ] VoiceOver screen reader tested (iOS)
- [ ] Keyboard navigation tested (Tab through all elements)
- [ ] 60fps performance verified on low-end Android
- [ ] No `hover:` classes without `active:` equivalent

## Rollout Timeline

**Week 1-2: Navigation**
- Migrate NavigationTracker
- Test Android back-button
- Deploy to staging

**Week 3-4: Touch Interactions**
- Remove hover-only effects
- Add focus rings
- Update Header component
- Deploy to staging

**Week 5-6: Form Elements**
- Audit and replace form elements
- Implement MobileForm components
- Deploy to staging

**Week 7-8: Testing and Polish**
- Screen reader testing
- Performance testing
- Bug fixes
- Production deployment

## Support and Questions

For issues or questions:
1. Check MOBILE_AUDIT.md for detailed audit requirements
2. Run `runMobileAudit()` in DevTools console
3. Review examples in MIGRATION_NATIVE_MOBILE.md
4. Check mobile-form.jsx for component usage