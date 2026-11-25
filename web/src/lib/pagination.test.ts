import { describe, expect, test } from "vitest";
import { pageItems } from "./pagination";

describe("pageItems", () => {
  test("lists every page when there are seven or fewer", () => {
    expect(pageItems(2, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("keeps the first, last and current neighbours near the start", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, "gap-end", 10]);
    expect(pageItems(5, 10)).toEqual([1, "gap-start", 4, 5, 6, "gap-end", 10]);
  });

  test("keeps the first and last five near the end", () => {
    expect(pageItems(9, 10)).toEqual([1, "gap-start", 6, 7, 8, 9, 10]);
    expect(pageItems(10, 10)).toEqual([1, "gap-start", 6, 7, 8, 9, 10]);
  });
});
