MapController Optimistic Mutation Refactor

Refactoring Summary
All spot-related write operations (create, update, delete) in MapController and related components now use the useOptimisticMutation hook for immediate UI feedback before backend responses.

Changes Made

1. MapController.jsx
   - Replaced manual state management (setSpots) with react-query
   - Changed from useState for spots/clubs to useQuery with queryKey 'mapSpots' and 'mapClubs'
   - Removed loadAllData() function - now handled by query invalidation
   - Created three mutations:
     * addSpotMutation: Creates new spot with optimistic add
     * updateSpotMutation: Updates spot with optimistic update
     * deleteSpotMutation: Deletes spot with optimistic removal
   - Removed manual loading state (query handles this)
   - handleSpotAdded() now only closes modal without reloading data

2. AddSpotModal.jsx
   - Replaced useMutation with useOptimisticMutation
   - Uses queryKey 'mapSpots' to sync with MapController
   - Moved form reset to onSuccess callback (runs after optimistic update)
   - Maintains error handling and haptic/sound feedback
   - Immediate optimistic update with temporary ID

3. SportSelectorModal.jsx
   - Added useOptimisticMutation for sport updates
   - Uses queryKey 'mapSpots' to sync with MapController
   - Added haptic feedback integration
   - Replaced loading state with updateSportsMutation.isPending

Behavior

Optimistic Updates:
- Create: Adds spot to list immediately with tmp ID before server confirmation
- Update: Modifies spot in list immediately before server confirmation
- Delete: Removes spot from list immediately before server confirmation

Error Handling:
- All mutations automatically rollback on error
- Toast notifications show success/error states
- Haptic feedback confirms user actions

Data Sync:
- useOptimisticMutation automatically cancels in-flight queries
- Snapshots previous data for rollback on error
- Invalidates query on settle to ensure consistency
- All components reading 'mapSpots' or 'mapClubs' stay synchronized

No Breaking Changes:
- Map interaction logic unchanged
- All callbacks and props preserved
- Error handling and notifications maintained
- User experience improved with instant feedback

Usage in Other Components
If other components need to add/update/delete spots, they should:
1. Import useOptimisticMutation
2. Use queryKey 'mapSpots' for spot mutations
3. Define optimisticUpdate function for their specific operation
4. Call mutation.mutate(data) to trigger

Example:
const mutation = useOptimisticMutation({
  queryKey: 'mapSpots',
  mutationFn: (id) => Spot.delete(id),
  optimisticUpdate: (oldSpots = [], id) => 
    oldSpots.filter(spot => spot.id !== id),
  onSuccess: () => toast.success('Deleted!'),
  onError: () => toast.error('Failed!')
});