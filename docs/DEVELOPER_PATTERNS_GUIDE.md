Standardized Patterns Reference Guide

Quick Links
- Optimistic Mutations: hooks/useOptimisticMutation.js
- ARIA Labels: lib/ariaLabels.js
- Accessible Icons: components/ui/AccessibleIconButton.jsx
- Bite Detector Sub-components: components/ai/Bite*

1. Using Optimistic Mutations

Basic Update Pattern:
```javascript
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { base44 } from '@/api/base44Client';

function SpotEditor({ spot }) {
  const { mutate, isPending } = useOptimisticMutation({
    mutationFn: (data) => base44.entities.Spot.update(spot.id, data),
    queryKey: ['spots', spot.id],
    onOptimisticUpdate: (updates, previous) => ({
      ...previous,
      ...updates
    }),
    successMessage: 'Spot updated successfully',
    errorMessage: 'Failed to update spot'
  });

  return (
    <button onClick={() => mutate({ name: 'New Name' })} disabled={isPending}>
      {isPending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

Array Operations (Create/Update/Delete):
```javascript
import { useOptimisticArrayMutation } from '@/hooks/useOptimisticMutation';

function CatchList({ catches }) {
  const { mutate: createCatch } = useOptimisticArrayMutation({
    mutationFn: (data) => base44.entities.Catch.create(data),
    queryKey: ['catches'],
    operation: 'create',
    successMessage: 'Catch logged'
  });

  const { mutate: deleteCatch } = useOptimisticArrayMutation({
    mutationFn: (data) => base44.entities.Catch.delete(data.id),
    queryKey: ['catches'],
    operation: 'delete',
    idField: 'id'
  });

  return (
    <>
      <button onClick={() => createCatch({ species: 'Pike' })}>
        Log Catch
      </button>
      {catches.map(c => (
        <button key={c.id} onClick={() => deleteCatch(c)}>
          Delete
        </button>
      ))}
    </>
  );
}
```

2. Using Accessible Icon Buttons

Basic Icon Button:
```javascript
import { AccessibleIconButton } from '@/components/ui/AccessibleIconButton';
import { X, Edit2, Download } from 'lucide-react';

function ToolBar() {
  return (
    <>
      <AccessibleIconButton
        icon={X}
        label="Close dialog"
        onClick={handleClose}
      />
      
      <AccessibleIconButton
        icon={Edit2}
        label="Edit this item"
        variant="outline"
        onClick={handleEdit}
      />
      
      <AccessibleIconButton
        icon={Download}
        label="Download file"
        onClick={handleDownload}
        disabled={isLoading}
      />
    </>
  );
}
```

Icon Button with State:
```javascript
<AccessibleIconButton
  icon={Heart}
  label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  ariaPressed={isFavorite}
  onClick={toggleFavorite}
/>
```

Icon Button with Menu:
```javascript
<AccessibleIconButton
  icon={MoreVertical}
  label="More options"
  ariaHasPopup={true}
  ariaExpanded={isOpen}
  onClick={toggleMenu}
/>
```

Button Groups:
```javascript
import { AccessibleButtonGroup } from '@/components/ui/AccessibleIconButton';

<AccessibleButtonGroup ariaLabel="Text formatting options">
  <AccessibleIconButton icon={Bold} label="Bold" onClick={toggleBold} />
  <AccessibleIconButton icon={Italic} label="Italic" onClick={toggleItalic} />
  <AccessibleIconButton icon={Underline} label="Underline" onClick={toggleUnderline} />
</AccessibleButtonGroup>
```

3. Using MobileSelect

Basic Usage:
```javascript
import { MobileSelect } from '@/components/ui/mobile-select';

function FilterComponent() {
  const [waterType, setWaterType] = useState('');

  const waterOptions = [
    { value: 'fluss', label: 'Fluss' },
    { value: 'see', label: 'See' },
    { value: 'teich', label: 'Teich' },
    { value: 'kanal', label: 'Kanal' }
  ];

  return (
    <MobileSelect
      value={waterType}
      onValueChange={setWaterType}
      placeholder="Select water type"
      label="Water Type"
      options={waterOptions}
    />
  );
}
```

Comparison: MobileSelect vs Radix Select
```javascript
// Mobile-first approach - Use MobileSelect
<MobileSelect
  options={items}
  value={selected}
  onValueChange={setSelected}
  label="Choose option"
/>

// Complex desktop table - Use Radix Select
<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger>
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    {items.map(item => (
      <SelectItem key={item.value} value={item.value}>
        {item.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

4. Using Centralized ARIA Labels

Getting Labels:
```javascript
import { ariaLabels, getAriaLabel } from '@/lib/ariaLabels';

// Direct access
console.log(ariaLabels.Home); // 'Startseite'
console.log(ariaLabels.Plus); // 'Hinzufuegen'

// Safe fallback
const label = getAriaLabel('UnknownIcon', 'default label');
```

Common ARIA Labels:
```javascript
// Navigation
ariaLabels.Home        // 'Startseite'
ariaLabels.ArrowLeft   // 'Zurueck'
ariaLabels.Menu        // 'Menue oeffnen'

// Actions
ariaLabels.Plus        // 'Hinzufuegen'
ariaLabels.Trash2      // 'Loeschen'
ariaLabels.Edit2       // 'Bearbeiten'
ariaLabels.Download    // 'Herunterladen'

// Status
ariaLabels.Check       // 'Bestaetigt'
ariaLabels.AlertCircle // 'Warnung'

// Fishing
ariaLabels.Activity    // 'Bissanzeiger'
ariaLabels.MapPin      // 'Standort'
```

Using with Icons:
```javascript
import { ArrowLeft } from 'lucide-react';
import { getAriaLabel } from '@/lib/ariaLabels';

<button aria-label={getAriaLabel('ArrowLeft')}>
  <ArrowLeft size={20} />
</button>
```

5. Form Control ARIA Patterns

Range Input:
```javascript
<label htmlFor="sensitivity">Sensitivity</label>
<input
  id="sensitivity"
  type="range"
  min="1"
  max="10"
  step="0.5"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  aria-valuemin={1}
  aria-valuemax={10}
  aria-valuenow={value}
  aria-label="Adjust sensitivity (1 to 10)"
/>
```

Progress Bar:
```javascript
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Loading progress"
>
  <div style={{ width: `${progress}%` }} />
</div>
```

Live Region:
```javascript
<div
  role="region"
  aria-label="Real-time metrics"
  aria-live="polite"
  aria-atomic="true"
>
  Current value: {value}
</div>
```

6. Performance Optimization Patterns

Tab Visibility Check (for background processing):
```javascript
// In video/animation processing code
if (document.hidden) {
  // Skip expensive operations when tab not visible
  return;
}
```

Hardware Acceleration:
```javascript
<canvas
  style={{
    willChange: 'transform',
    WebkitAccelerated: 'true'
  }}
/>
```

Frame Rate Control:
```javascript
const FRAME_TIME = 1000 / 30; // 30fps

const scheduleFrame = () => {
  if (document.hidden) return; // Stop if background
  
  const startTime = performance.now();
  doExpensiveWork();
  const elapsed = performance.now() - startTime;
  
  const nextDelay = Math.max(0, FRAME_TIME - elapsed);
  setTimeout(
    () => requestAnimationFrame(scheduleFrame),
    nextDelay
  );
};
```

7. Best Practices Checklist

When Adding New Data Operations:
- [ ] Use useOptimisticMutation or useOptimisticArrayMutation
- [ ] Set appropriate successMessage and errorMessage
- [ ] Handle onSuccess and onError callbacks if needed
- [ ] Test offline scenario (network errors)
- [ ] Verify optimistic update matches server response shape

When Adding New Buttons/Icons:
- [ ] Use AccessibleIconButton for icon-only buttons
- [ ] Ensure aria-label is descriptive
- [ ] Check if label exists in ariaLabels registry
- [ ] Verify minimum 44x44px size
- [ ] Test with keyboard (Tab, Enter/Space)
- [ ] Test with screen reader

When Adding New Form Controls:
- [ ] Use MobileSelect for dropdowns on mobile
- [ ] Add aria-label to inputs
- [ ] Link labels with htmlFor
- [ ] Add aria-valuemin/max/now for sliders
- [ ] Test keyboard navigation
- [ ] Test with mobile/touch devices

When Optimizing Performance:
- [ ] Check if processing stops when tab hidden
- [ ] Use willChange CSS for animated elements
- [ ] Profile frame rate with DevTools
- [ ] Test battery usage with DevTools
- [ ] Measure memory consumption

Common Mistakes to Avoid

1. Forgetting aria-label on icon buttons:
   BAD:  <button><Plus /></button>
   GOOD: <AccessibleIconButton icon={Plus} label="Add new" />

2. Using color as only visual indicator:
   BAD:  <div style={{ color: error ? 'red' : 'green' }}>Status</div>
   GOOD: <div role="status" aria-label={error ? 'Error' : 'Success'}>
           {error ? 'Error' : 'Success'}
         </div>

3. Not handling optimistic update shape:
   BAD:  onOptimisticUpdate: (data) => data // Wrong shape!
   GOOD: onOptimisticUpdate: (data, prev) => ({ ...prev, ...data })

4. Blocking expensive operations when backgrounded:
   BAD:  requestAnimationFrame(expensiveWork) // Runs in background
   GOOD: if (!document.hidden) expensiveWork()

5. Not testing keyboard navigation:
   Always test: Tab, Shift+Tab, Enter, Space, Arrow keys

Questions? Check the refactor audit document for detailed explanations.