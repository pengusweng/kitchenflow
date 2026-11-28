import { useSyncExternalStore } from "react";
import { todayInManila } from "@/src/features/audit-history/utils/audit";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  clearTimeout(timer);
  const nextMidnight = new Date(`${todayInManila()}T00:00:00+08:00`);
  nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  timer = setTimeout(schedule, Math.max(1, nextMidnight.getTime() - Date.now()));
  listeners.forEach((notify) => notify());
}

function subscribe(onDayChange: () => void) {
  listeners.add(onDayChange);
  if (listeners.size === 1) {
    schedule();
    window.addEventListener("focus", schedule);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", schedule);
  }
  return () => {
    listeners.delete(onDayChange);
    if (listeners.size === 0) {
      clearTimeout(timer);
      window.removeEventListener("focus", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", schedule);
    }
  };
}

/**
 * Today's Asia/Manila date as YYYY-MM-DD, read only in the browser. Reading the
 * clock during render would break prerendering, so the server snapshot is
 * undefined (no upper bound yet) and the real date arrives on hydration.
 */
export function useTodayInManila(): string | undefined {
  return useSyncExternalStore(subscribe, todayInManila, () => undefined);
}
