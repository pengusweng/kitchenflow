import { describe, expect, test } from "vitest";
import { nextSort } from "./table-sort";

describe("nextSort", () => {
  test("cycles ascending, descending, then the default order", () => {
    const first = nextSort(null, "name");
    const second = nextSort(first, "name");
    const third = nextSort(second, "name");

    expect(first).toEqual({ by: "name", order: "asc" });
    expect(second).toEqual({ by: "name", order: "desc" });
    expect(third).toBeNull();
  });

  test("starts ascending again when a different column is clicked", () => {
    const descending = nextSort({ by: "name", order: "desc" }, "date");

    expect(descending).toEqual({ by: "date", order: "asc" });
  });
});
