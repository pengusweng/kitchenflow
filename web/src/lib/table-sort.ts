/** The column a table is sorted by; null means the list's default order. */
export type TableSort<F extends string> = { by: F; order: "asc" | "desc" } | null;

// Clicking a header cycles that column: ascending, descending, then back to the default.
export function nextSort<F extends string>(current: TableSort<F>, by: F): TableSort<F> {
  if (current?.by !== by) return { by, order: "asc" };
  return current.order === "asc" ? { by, order: "desc" } : null;
}
