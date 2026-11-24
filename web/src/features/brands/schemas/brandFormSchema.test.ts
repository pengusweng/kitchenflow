import { expect, test } from "vitest";
import { brandFormSchema } from "./brandFormSchema";

test("trims the brand name and code before submission", () => {
  expect(brandFormSchema.parse({ name: " Sample Kitchen ", code: " SK " })).toEqual({
    name: "Sample Kitchen",
    code: "SK",
  });
});

test.each([" ", "ABCDE"])("rejects the invalid brand code %j", (code) => {
  expect(brandFormSchema.safeParse({ name: "Sample Kitchen", code }).success).toBe(false);
});
