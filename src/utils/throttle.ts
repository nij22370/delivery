// Leading-edge throttle: the first call in each interval runs immediately;
// subsequent calls inside the window are dropped (GPS ping cadence).
export function createThrottle(intervalMs: number): (fn: () => void) => void {
  let lastRunAt = 0;

  return (fn: () => void) => {
    const now = Date.now();
    if (now - lastRunAt >= intervalMs) {
      lastRunAt = now;
      fn();
    }
  };
}
