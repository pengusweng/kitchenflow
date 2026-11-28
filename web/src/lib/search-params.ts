/**
 * Replaces URL query parameters in-place without triggering a Next.js navigation cycle,
 * keeping browser history and bookmarkable filter links synchronized.
 */
export function replaceSearchParams(current: URLSearchParams, mutate: (params: URLSearchParams) => void) {
  const next = new URLSearchParams(current.toString());
  mutate(next);
  const qs = next.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}
