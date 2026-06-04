// @vitest-environment jsdom
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
});
