import { describe, it, expect } from "vitest";
import { v, validate } from "./validators";

describe("validators", () => {
  it("string requires a value", () => {
    expect(v.string().parse("")).toBe("Required");
    expect(v.string().parse("hi")).toBeUndefined();
  });

  it("min / max on strings", () => {
    expect(v.string().min(3).parse("ab")).toBe("Must be at least 3");
    expect(v.string().max(2).parse("abc")).toBe("Must be at most 2");
    expect(v.string().min(2).max(4).parse("abc")).toBeUndefined();
  });

  it("email", () => {
    expect(v.string().email().parse("nope")).toBe("Must be a valid email");
    expect(v.string().email().parse("a@b.co")).toBeUndefined();
  });

  it("number", () => {
    expect(v.number().parse("5" as unknown)).toBe("Must be a number");
    expect(v.number().parse(5)).toBeUndefined();
  });

  it("optional skips empty", () => {
    expect(v.string().min(3).optional().parse("")).toBeUndefined();
    expect(v.string().min(3).optional().parse("ab")).toBe("Must be at least 3");
  });

  it("refine with custom message", () => {
    const even = v.number().refine((n) => n % 2 === 0, "Must be even");
    expect(even.parse(3)).toBe("Must be even");
    expect(even.parse(4)).toBeUndefined();
  });

  it("validate collects per-field errors", () => {
    const schema = { name: v.string(), age: v.number().min(18, "18+") };
    const errors = validate(schema, { name: "", age: 10 });
    expect(errors).toEqual({ name: "Required", age: "18+" });
    expect(validate(schema, { name: "Jo", age: 21 })).toEqual({});
  });

  it("oneOf restricts to allowed values", () => {
    const role = v.oneOf(["admin", "user"] as const);
    expect(role.parse("guest")).toMatch(/Must be one of/);
    expect(role.parse("admin")).toBeUndefined();
    expect(v.oneOf([1, 2, 3], "pick 1-3").parse(9)).toBe("pick 1-3");
  });

  it("pattern enforces a regex", () => {
    const slug = v.string().pattern(/^[a-z-]+$/, "lowercase-only");
    expect(slug.parse("Hello")).toBe("lowercase-only");
    expect(slug.parse("a-slug")).toBeUndefined();
  });
});
