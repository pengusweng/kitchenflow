import { describe, expect, it } from "vitest";
import {
  emptyUnitForm,
  groupUnits,
  SEEDED_UNITS,
  toCreateUnitPayload,
  validateUnitForm,
  type UnitFormValues,
} from "./units";

const existing = new Set(SEEDED_UNITS.map((unit) => unit.code.toLowerCase()));
const cup: UnitFormValues = { code: " cup ", name: " Cup ", dimension: "VOLUME", toBase: "240" };

describe("groupUnits", () => {
  it("groups by what the unit measures, in a fixed order, leaving out empty groups", () => {
    const groups = groupUnits([
      { code: "pc", name: "Piece", dimension: "COUNT" },
      { code: "g", name: "Gram", dimension: "MASS" },
      { code: "kg", name: "Kilogram", dimension: "MASS" },
    ]);
    expect(groups.map((g) => [g.label, g.units.map((u) => u.code)])).toEqual([
      ["Weight", ["g", "kg"]],
      ["Count", ["pc"]],
    ]);
  });
});

describe("validateUnitForm", () => {
  it("passes a complete unit", () => {
    expect(validateUnitForm(cup, existing)).toEqual({});
  });

  it("names every missing field", () => {
    expect(validateUnitForm(emptyUnitForm(), existing)).toEqual({
      code: "Enter a code, like cup.",
      name: "Enter a name, like Cup.",
      toBase: "Enter how much one unit is.",
    });
  });

  it("rejects codes the picker already has, ignoring case, and codes with spaces", () => {
    expect(validateUnitForm({ ...cup, code: "TBSP" }, existing).code).toBe("There's already a unit with this code.");
    expect(validateUnitForm({ ...cup, code: "fl oz" }, existing).code).toBe("Leave out spaces, like fl-oz.");
  });

  it("follows the API's limits on the conversion", () => {
    expect(validateUnitForm({ ...cup, toBase: "0" }, existing).toBase).toBe("Must be more than 0.");
    expect(validateUnitForm({ ...cup, toBase: "0.1234567" }, existing).toBase).toBe("Use at most 6 decimal places.");
    expect(validateUnitForm({ ...cup, toBase: "1000000000000" }, existing).toBase).toBe("That amount is too large.");
    expect(validateUnitForm({ ...cup, toBase: "28.349523" }, existing)).toEqual({});
  });
});

describe("toCreateUnitPayload", () => {
  it("builds the CreateUnitDTO body, trimmed, with a numeric conversion", () => {
    expect(toCreateUnitPayload(cup)).toEqual({ code: "cup", name: "Cup", dimension: "VOLUME", to_base: 240 });
  });
});
