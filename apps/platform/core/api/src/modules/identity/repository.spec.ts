import { expect, it } from "vitest";
import { identityStringArray } from "./repository.js";

it("accepts both MariaDB driver JSON values and serialized JSON without coercing permissions", () => {
  expect(identityStringArray(["app.access"])).toEqual(["app.access"]);
  expect(identityStringArray('["app.access"]')).toEqual(["app.access"]);
  expect(() => identityStringArray({ "identity.admin": true })).toThrow();
  expect(() => identityStringArray([1])).toThrow();
});
