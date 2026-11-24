import { useSyncExternalStore } from "react";

// One shared one-second clock for every timer on the page, so they all tick together.
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      now = 0;
    }
  };
}

function getSnapshot() {
  if (!now) now = Date.now();
  return now;
}

/**
 * The current time in ms, updated every second. Reading the clock during render
 * would break prerendering, so it's undefined on the server and arrives on hydration.
 */
export function useNow(): number | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}
