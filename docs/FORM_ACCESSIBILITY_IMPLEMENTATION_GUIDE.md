Form Accessibility & Optimistic Mutations Implementation Guide
Date: 2026-03-18
Status: PRODUCTION READY

QUICK REFERENCE

Touch Targets (44px):
- Utility class: .touch-target
- Global enforcement via globals.css
- All buttons, links, inputs: 44x44px minimum

Form Labels (ARIA-Accessible):
```jsx
<div className="space-y-2">
  <Label htmlFor="input-id" className="text-white">Label Text</Label>
  <Input id="input-id" {...props} />
</div>
```

Optimistic Mutations:
```jsx
const mutation = useOptimisticMutation({
  queryKey: 'catches',
  mutationFn: (data) => base44.entities.Catch.create(data),
  optimisticUpdate: (old = [], newData) => [
    { id: `tmp-${Date.now()}`, ...newData },
    ...old,
  ],
  onSuccess: () => toast.success('Saved'),
});

mutation.mutate(formData);
```

---

SECTION 1: TOUCH TARGETS (44px Minimum)

Global Implementation:

A. CSS-Based Enforcement (globals.css)

All interactive elements get 44px minimum:
```css
button, 
a, 
[role="button"],
[role="tab"],
input[type="button"],
input[type="checkbox"],
input[type="radio"],
input[type="submit"],
[tabindex]:not([tabindex="-1"]) {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

B. Utility Class (Optional)

For explicit 44px targets:
```jsx
<button className="touch-target">Click me</button>
```

Expands to:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

C. Tailwind Classes (Recommended)

Use min-h-[44px] min-w-[44px] directly:
```jsx
<button className="min-h-[44px] min-w-[44px]">Click me</button>
```

D. Verification

Check all interactive elements:
- Buttons: min-h-[44px] or .touch-target
- Links: automatically global
- Inputs: automatically global
- Icon buttons: min-h-[44px] min-w-[44px]
- Checkboxes: automatically global
- Radio buttons: automatically global

---

SECTION 2: FORM LABEL ACCESSIBILITY

Semantic HTML Pattern:

A. Basic Form Field

```jsx
<div className="space-y-2">
  <Label htmlFor="species-input" className="text-white">
    Fischart *
  </Label>
  <Input
    id="species-input"
    value={species}
    onChange={(e) => setSpecies(e.target.value)}
    placeholder="z.B. Hecht, Zander..."
    className="bg-gray-800/50 border-gray-700 text-white"
    required
  />
</div>
```

Key Requirements:
1. Label has htmlFor="species-input"
2. Input has id="species-input"
3. htmlFor and id MUST match exactly
4. Label uses semantic <label> element
5. Placeholder is supplement, not replacement

B. Select Field

```jsx
<div className="space-y-2">
  <Label htmlFor="spot-select" className="text-white">
    Angelspot
  </Label>
  <Select value={spotId} onValueChange={setSpotId}>
    <SelectTrigger id="spot-select" className="...">
      <SelectValue placeholder="Spot auswählen (optional)" />
    </SelectTrigger>
    <SelectContent className="...">
      <SelectItem value={null}>Kein Spot</SelectItem>
      {spots.map((spot) => (
        <SelectItem key={spot.id} value={spot.id}>
          {spot.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Key Requirements:
1. Label has htmlFor="spot-select"
2. SelectTrigger has id="spot-select"
3. htmlFor and id MUST match
4. Use SelectTrigger for semantic connection

C. Textarea Field

```jsx
<div className="space-y-2">
  <Label htmlFor="notes-textarea" className="text-white">
    Notizen
  </Label>
  <Textarea
    id="notes-textarea"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Wetter, Bedingungen..."
    className="bg-gray-800/50 border-gray-700 text-white min-h-[100px]"
  />
</div>
```

Key Requirements:
1. Label has htmlFor="notes-textarea"
2. Textarea has id="notes-textarea"
3. htmlFor and id MUST match
4. Use semantic <textarea> element

D. Checkbox Field

```jsx
<div className="flex items-center gap-3">
  <Checkbox
    id="share-checkbox"
    checked={shareInCommunity}
    onCheckedChange={setShareInCommunity}
  />
  <Label htmlFor="share-checkbox" className="text-white cursor-pointer">
    In Community teilen
  </Label>
</div>
```

Key Requirements:
1. Checkbox has id="share-checkbox"
2. Label has htmlFor="share-checkbox"
3. htmlFor and id MUST match
4. Label should be cursor-pointer for UX

E. Radio Button Field

```jsx
<div className="space-y-2">
  <Label className="text-white">Wasserzustand *</Label>
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="clear" id="water-clear" />
      <Label htmlFor="water-clear" className="font-normal cursor-pointer">
        Klar
      </Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="murky" id="water-murky" />
      <Label htmlFor="water-murky" className="font-normal cursor-pointer">
        Trüb
      </Label>
    </div>
  </div>
</div>
```

Key Requirements:
1. Each RadioGroupItem has unique id
2. Each Label has matching htmlFor
3. Group label (parent) doesn't need id
4. cursor-pointer on labels for UX

---

SECTION 3: OPTIMISTIC MUTATIONS

Pattern Implementation:

A. Single Create Operation

```jsx
const createMutation = useOptimisticMutation({
  queryKey: 'catches',
  mutationFn: (data) => base44.entities.Catch.create(data),
  optimisticUpdate: (old = [], newData) => [
    {
      id: `tmp-${Date.now()}`,
      ...newData,
      created_date: new Date().toISOString(),
      created_by: 'temp',
    },
    ...old,
  ],
  onSuccess: () => {
    toast.success('Fang gespeichert!');
  },
  onError: () => {
    toast.error('Fehler beim Speichern');
  },
});

const handleSubmit = async (e) => {
  e.preventDefault();
  createMutation.mutate(formData);
};
```

Key Patterns:
1. tmp-{Date.now()} for temporary IDs
2. Prepend to list for UI feedback
3. onSuccess/onError for user feedback
4. Automatic rollback on error

B. Single Update Operation

```jsx
const updateMutation = useOptimisticMutation({
  queryKey: 'catches',
  mutationFn: ({ id, data }) => base44.entities.Catch.update(id, data),
  optimisticUpdate: (old = [], { id, data }) =>
    old.map((item) => (item.id === id ? { ...item, ...data } : item)),
  onSuccess: () => {
    toast.success('Fang aktualisiert!');
  },
  onError: () => {
    toast.error('Fehler beim Aktualisieren');
  },
});

const handleUpdate = (id, updatedData) => {
  updateMutation.mutate({ id, data: updatedData });
};
```

Key Patterns:
1. Map old list, replace matching ID
2. Merge new data with existing item
3. Immediate UI update
4. Automatic rollback on error

C. Single Delete Operation

```jsx
const deleteMutation = useOptimisticMutation({
  queryKey: 'catches',
  mutationFn: (id) => base44.entities.Catch.delete(id),
  optimisticUpdate: (old = [], id) => old.filter((item) => item.id !== id),
  onSuccess: () => {
    toast.success('Fang gelöscht!');
  },
  onError: () => {
    toast.error('Fehler beim Löschen');
  },
});

const handleDelete = (id) => {
  if (!confirm('Wirklich löschen?')) return;
  deleteMutation.mutate(id);
};
```

Key Patterns:
1. Filter out deleted item
2. Immediate removal from UI
3. Confirmation before delete
4. Error recovery on failure

D. Multiple Query Keys

```jsx
const mutation = useOptimisticMutation({
  queryKey: ['catches', 'leaderboard'], // Update multiple queries
  mutationFn: (data) => base44.entities.Catch.create(data),
  optimisticUpdate: (old = [], newData) => [
    { id: `tmp-${Date.now()}`, ...newData },
    ...old,
  ],
  onSuccess: () => toast.success('Saved'),
});
```

Key Patterns:
1. queryKey accepts string or array
2. Updates all provided queries
3. Useful for catches affecting leaderboard, stats, etc.

---

SECTION 4: NATIVE SELECT vs MOBILE SELECT

Mobile Optimized Pattern:

A. Responsive Select (Recommended)

```jsx
<div className="space-y-2">
  <Label htmlFor="spot-select" className="text-white">
    Angelspot
  </Label>
  
  {/* Mobile: MobileSelect */}
  <div className="md:hidden">
    <MobileSelect
      value={spotId}
      onValueChange={setSpotId}
      placeholder="Spot auswählen (optional)"
      label="Angelspot"
      options={[
        { value: "", label: "Kein Spot" },
        ...spots.map(s => ({ value: s.id, label: s.name }))
      ]}
      className="bg-gray-800/50 border-gray-700 text-white"
    />
  </div>
  
  {/* Desktop: Radix UI Select */}
  <div className="hidden md:block">
    <Select value={spotId} onValueChange={setSpotId}>
      <SelectTrigger id="spot-select" className="bg-gray-800/50 border-gray-700 text-white">
        <SelectValue placeholder="Spot auswählen (optional)" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700 text-white">
        <SelectItem value={null}>Kein Spot</SelectItem>
        {spots.map((spot) => (
          <SelectItem key={spot.id} value={spot.id}>
            {spot.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

Rationale:
- Mobile: MobileSelect for touch-optimized UX (full-screen drawer)
- Desktop: Radix UI Select for customization and accessibility
- Each platform gets native-like experience

B. MobileSelect Props

```jsx
<MobileSelect
  value={value}           // Current selected value
  onValueChange={fn}      // (newValue) => void
  label="Field Label"     // Display label
  placeholder="Select..." // Placeholder text
  options={[
    { value: "id1", label: "Option 1" },
    { value: "id2", label: "Option 2" },
  ]}
  className="..."         // CSS classes
  disabled={false}        // Disabled state
/>
```

---

SECTION 5: ARIA ATTRIBUTES REFERENCE

Common ARIA Patterns Used:

A. Form Validation

```jsx
<Input
  id="species"
  aria-required="true"
  aria-invalid={!species.trim()}
  aria-describedby="species-error"
/>
{!species.trim() && (
  <p id="species-error" className="text-red-500 text-sm">
    Bitte Fischart angeben
  </p>
)}
```

B. Loading States

```jsx
<Button
  disabled={isSaving}
  aria-busy={isSaving}
  aria-label={isSaving ? "Wird gespeichert..." : "Speichern"}
>
  {isSaving ? "Wird gespeichert..." : "Speichern"}
</Button>
```

C. Tab Navigation

```jsx
<Link
  to={path}
  role="tab"
  aria-selected={isActive}
  aria-current={isActive ? "page" : undefined}
>
  {tabName}
</Link>
```

D. Dialog/Modal

```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent role="alertdialog" aria-labelledby="dialog-title">
    <DialogHeader>
      <DialogTitle id="dialog-title">Bestätigung</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

---

SECTION 6: CHECKLIST FOR NEW FORMS

When creating new forms, verify:

Form Field Accessibility:
- [ ] Each input has unique id
- [ ] Each label has matching htmlFor
- [ ] Labels use semantic <Label> component
- [ ] Required fields marked with *
- [ ] aria-required="true" on required inputs
- [ ] aria-invalid on error states
- [ ] aria-describedby links to error messages

Touch Targets:
- [ ] All buttons: min-h-[44px] min-w-[44px] or .touch-target
- [ ] All form inputs: 44px minimum height
- [ ] All checkboxes: 44px tap area (with label)
- [ ] All radio buttons: 44px tap area (with label)

Optimistic Mutations:
- [ ] Create operations use optimistic update
- [ ] Update operations use optimistic update
- [ ] Delete operations use optimistic update
- [ ] All mutations show success/error toasts
- [ ] Error states roll back correctly

Mobile Optimization:
- [ ] Selects use responsive pattern (Mobile/Desktop)
- [ ] Bottom-docked elements have pb-safe padding
- [ ] Safe-area insets applied to notch areas
- [ ] Touch targets tested on actual devices

---

PRODUCTION CHECKLIST

All Forms:
- [x] Labels properly linked (htmlFor/id)
- [x] Touch targets 44px minimum
- [x] ARIA attributes present
- [x] Keyboard navigation supported
- [x] Screen reader compatible

Optimistic Mutations:
- [x] Create/update/delete operations optimistic
- [x] Error recovery and rollback working
- [x] Success/error feedback displayed
- [x] Query invalidation on settle

Mobile Experience:
- [x] Safe-area insets applied
- [x] Overscroll behavior disabled
- [x] Native-like touch feedback
- [x] MobileSelect on mobile platforms

READY FOR PRODUCTION