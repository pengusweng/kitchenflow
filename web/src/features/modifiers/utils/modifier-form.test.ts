import { describe, expect, test } from "vitest";
import { hasFormChanges, LIMITS, toFormValues, toPayload, validateModifierForm } from "./modifier-form";
import type { Modifier } from "./modifiers";

const RICE: Modifier = {
  id: "mod-extra-rice",
  code: "EXTRA-RICE",
  name: "Extra rice",
  description: null,
  active: true,
  createdAt: "2026-06-02T00:00:00.000Z",
  modifiedAt: "2026-06-02T00:00:00.000Z",
  useCount: 0,
};

describe("validateModifierForm", () => {
  test("a name and a code are enough", () => {
    expect(
      validateModifierForm({
        name: "Fried egg",
        code: "FRIED-EGG",
        description: "",
      }),
    ).toEqual({});
  });

  test("names and codes are required", () => {
    const errors = validateModifierForm({
      name: "  ",
      code: "",
      description: "",
    });
    expect(errors.name).toBeDefined();
    expect(errors.code).toBeDefined();
  });

  test("keeps to the API's limits", () => {
    const errors = validateModifierForm({
      name: "n".repeat(LIMITS.name + 1),
      code: "C".repeat(LIMITS.code + 1),
      description: "d".repeat(LIMITS.description + 1),
    });
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

test("toPayload trims, uppercases the code, and sends a blank description as null", () => {
  expect(
    toPayload({
      name: " Extra java rice ",
      code: "java-rice",
      description: "  ",
    }),
  ).toEqual({
    name: "Extra java rice",
    code: "JAVA-RICE",
    description: null,
  });
});
