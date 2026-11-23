import { describe, expect, test } from "vitest";
import {
  applyModifierEdit,
  hasFormChanges,
  LIMITS,
  newModifier,
  toFormValues,
  validateModifierForm,
} from "./modifier-form";
import type { Modifier } from "./modifiers";

const NOW = "2026-11-23T00:00:00.000Z";

const RICE: Modifier = {
  id: "mod-extra-rice",
  code: "EXTRA-RICE",
  name: "Extra rice",
  description: null,
  active: true,
  createdAt: "2026-06-02T00:00:00.000Z",
  modifiedAt: "2026-06-02T00:00:00.000Z",
  uses: [],
};

describe("validateModifierForm", () => {
  test("a name and an unused code are enough", () => {
    expect(validateModifierForm({ name: "Fried egg", code: "FRIED-EGG", description: "" }, new Set(["EXTRA-RICE"]))).toEqual({});
  });

  test("names and codes are required", () => {
    const errors = validateModifierForm({ name: "  ", code: "", description: "" }, new Set());
    expect(errors.name).toBeDefined();
    expect(errors.code).toBeDefined();
  });

  test("codes must be unique, whatever the case", () => {
    expect(validateModifierForm({ name: "Rice", code: "extra-rice", description: "" }, new Set(["EXTRA-RICE"])).code).toBe(
      "Another modifier already uses this code.",
    );
  });

  test("keeps to the API's limits", () => {
    const errors = validateModifierForm(
      { name: "n".repeat(LIMITS.name + 1), code: "C".repeat(LIMITS.code + 1), description: "d".repeat(LIMITS.description + 1) },
      new Set(),
    );
    expect(Object.keys(errors).sort()).toEqual(["code", "description", "name"]);
  });
});

describe("hasFormChanges", () => {
  test("the saved values are no change, and neither is case or whitespace in the code", () => {
    expect(hasFormChanges(RICE, toFormValues(RICE))).toBe(false);
    expect(hasFormChanges(RICE, { ...toFormValues(RICE), code: " extra-rice " })).toBe(false);
  });

  test("a new description is a change", () => {
    expect(hasFormChanges(RICE, { ...toFormValues(RICE), description: "One cup." })).toBe(true);
  });
});

describe("applyModifierEdit and newModifier", () => {
  test("trims, uppercases the code, and empties a blank description", () => {
    const saved = applyModifierEdit(RICE, { name: " Extra java rice ", code: "java-rice", description: "  " }, NOW);
    expect(saved).toMatchObject({ name: "Extra java rice", code: "JAVA-RICE", description: null, modifiedAt: NOW });
    expect(saved.createdAt).toBe(RICE.createdAt);
  });

  test("new modifiers start active and on no items", () => {
    const created = newModifier("new-1", { name: "No onions", code: "NO-ONIONS", description: "" }, NOW);
    expect(created).toMatchObject({ id: "new-1", active: true, uses: [], createdAt: NOW, modifiedAt: NOW });
  });
});
