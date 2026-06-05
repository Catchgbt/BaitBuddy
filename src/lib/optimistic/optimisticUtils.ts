export const createOptimisticUpdate = <T extends { id: string }>(
  list: T[],
  newItem: T,
  predicate: (item: T) => boolean = item => item.id === newItem.id
): T[] => {
  const index = list.findIndex(predicate);
  if (index >= 0) {
    return [...list.slice(0, index), newItem, ...list.slice(index + 1)];
  }
  return [newItem, ...list];
};

export const createOptimisticDelete = <T extends { id: string }>(
  list: T[],
  itemId: string
): T[] => {
  return list.filter(item => item.id !== itemId);
};

export const createOptimisticCreate = <T extends { id?: string }>(
  list: T[],
  newItem: T
): T[] => {
  return [
    { ...newItem, id: newItem.id || `temp-${Date.now()}` } as T,
    ...list,
  ];
};

export const rollbackOptimisticUpdate = <T extends { id: string }>(
  list: T[],
  previousList: T[],
  affectedItemId: string
): T[] => {
  const affectedItem = previousList.find(item => item.id === affectedItemId);
  if (!affectedItem) {
    return list.filter(item => item.id !== affectedItemId);
  }
  const index = list.findIndex(item => item.id === affectedItemId);
  if (index >= 0) {
    return [...list.slice(0, index), affectedItem, ...list.slice(index + 1)];
  }
  return list;
};

export const batchOptimisticUpdates = <T extends { id: string }>(
  list: T[],
  updates: T[]
): T[] => {
  const itemMap = new Map(list.map(item => [item.id, item]));
  updates.forEach(update => itemMap.set(update.id, update));
  return Array.from(itemMap.values());
};