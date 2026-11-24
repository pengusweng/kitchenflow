import { expect, test } from "vitest";
import { createStaffSchema } from "./createStaffSchema";

const staff = {
  first_name: " Jamie ",
  last_name: " Cruz ",
  username: " jamie ",
  role: "SUPERVISOR",
  password: "qa-password",
};

test("trims staff names and username before account creation", () => {
  expect(createStaffSchema.parse(staff)).toEqual({
    ...staff,
    first_name: "Jamie",
    last_name: "Cruz",
    username: "jamie",
  });
});

test("rejects assigning the superadmin role through staff creation", () => {
  expect(createStaffSchema.safeParse({ ...staff, role: "SUPERADMIN" }).success).toBe(false);
});

test("rejects passwords shorter than eight characters", () => {
  expect(createStaffSchema.safeParse({ ...staff, password: "short" }).success).toBe(false);
});
