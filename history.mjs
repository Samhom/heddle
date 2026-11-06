export const HISTORY_LIMIT = 40;

export function recordChange(past, future, current, next) {
  const kept = past.length >= HISTORY_LIMIT ? past.slice(past.length - (HISTORY_LIMIT - 1)) : past.slice();
  kept.push(current);
  return {past: kept, future: [], current: next};
}

export function undoChange(past, future, current) {
  if (past.length === 0) return null;
  return {
    past: past.slice(0, -1),
    future: [current, ...future],
    current: past[past.length - 1]
  };
}

export function redoChange(past, future, current) {
  if (future.length === 0) return null;
  return {
    past: [...past, current],
    future: future.slice(1),
    current: future[0]
  };
}
