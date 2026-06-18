// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "./useForm";
import { v } from "./validators";

const schema = { email: v.string().email(), pass: v.string().min(8) };

describe("useForm", () => {
  it("computes validity from schema", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.email).toBe("Required");
  });

  it("updates values via handleChange and becomes valid", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    act(() => {
      result.current.handleChange({ target: { name: "email", value: "a@b.co" } });
    });
    act(() => {
      result.current.handleChange({ target: { name: "pass", value: "longpassword" } });
    });
    expect(result.current.isValid).toBe(true);
  });

  it("blocks submit when invalid and calls onSubmit when valid", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "bad", pass: "x" }, onSubmit }));
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.touched.email).toBe(true);

    act(() => result.current.setFieldValue("email", "a@b.co"));
    act(() => result.current.setFieldValue("pass", "longpassword"));
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co", pass: "longpassword" });
  });

  it("reset restores initial values", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    act(() => result.current.setFieldValue("email", "x"));
    act(() => result.current.reset());
    expect(result.current.values.email).toBe("");
  });

  it("getFieldProps wires name, value, and handlers", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "a@b.co", pass: "" } }));
    const props = result.current.getFieldProps("email");
    expect(props.name).toBe("email");
    expect(props.value).toBe("a@b.co");
    expect(props.onChange).toBe(result.current.handleChange);
    expect(props.onBlur).toBe(result.current.handleBlur);
  });

  it("tracks isDirty against initial values", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.setFieldValue("email", "x"));
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isDirty).toBe(false);
  });

  it("coerces number inputs so v.number() validates", () => {
    const numSchema = { age: v.number().min(18, "18+") };
    const { result } = renderHook(() =>
      useForm({ schema: numSchema, initialValues: { age: 0 } }));
    act(() => result.current.handleChange({ target: { name: "age", value: "25", type: "number" } }));
    expect(result.current.values.age).toBe(25);
    expect(result.current.errors.age).toBeUndefined();
    act(() => result.current.handleChange({ target: { name: "age", value: "10", type: "number" } }));
    expect(result.current.errors.age).toBe("18+");
  });

  it("reset(next) installs a new baseline", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    act(() => result.current.reset({ email: "seed@x.co", pass: "longpassword" }));
    expect(result.current.values.email).toBe("seed@x.co");
    expect(result.current.isDirty).toBe(false);
  });

  const pwSchema = { pass: v.string().min(8), confirm: v.string() };
  const crossField = (vals: { pass: string; confirm: string }) =>
    vals.pass !== vals.confirm ? { confirm: "Passwords must match" } : {};

  it("runs cross-field validation and blocks submit on mismatch", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useForm({
      schema: pwSchema, validate: crossField, onSubmit,
      initialValues: { pass: "longpassword", confirm: "different" },
    }));
    expect(result.current.errors.confirm).toBe("Passwords must match");
    expect(result.current.isValid).toBe(false);
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).not.toHaveBeenCalled();

    act(() => result.current.setFieldValue("confirm", "longpassword"));
    expect(result.current.errors.confirm).toBeUndefined();
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("setFieldError sets a server error that blocks submit, cleared on edit", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "a@b.co", pass: "longpassword" }, onSubmit }));
    act(() => result.current.setFieldError("email", "Email already taken"));
    expect(result.current.errors.email).toBe("Email already taken");
    expect(result.current.isValid).toBe(false);
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).not.toHaveBeenCalled();

    // editing the field clears the manual error
    act(() => result.current.setFieldValue("email", "new@b.co"));
    expect(result.current.errors.email).toBeUndefined();
  });

  it("setErrors replaces the manual error map", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "a@b.co", pass: "longpassword" } }));
    act(() => result.current.setErrors({ email: "bad", pass: undefined }));
    expect(result.current.errors.email).toBe("bad");
    expect(result.current.errors.pass).toBeUndefined();
  });

  it("getFieldError hides errors until touched or submitted", async () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    expect(result.current.errors.email).toBe("Required");      // computed immediately
    expect(result.current.getFieldError("email")).toBeUndefined(); // but not shown yet
    act(() => result.current.handleBlur({ target: { name: "email" } }));
    expect(result.current.getFieldError("email")).toBe("Required");
  });

  it("getFieldError surfaces all errors after a submit attempt", async () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.submitCount).toBe(1);
    expect(result.current.getFieldError("pass")).toBe("Required");
  });

  it("getFieldProps sets aria-invalid only for a visible error", () => {
    const { result } = renderHook(() =>
      useForm({ schema, initialValues: { email: "", pass: "" } }));
    expect(result.current.getFieldProps("email")["aria-invalid"]).toBeUndefined();
    act(() => result.current.handleBlur({ target: { name: "email" } }));
    expect(result.current.getFieldProps("email")["aria-invalid"]).toBe(true);
  });
});
