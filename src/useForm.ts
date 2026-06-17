import { useCallback, useMemo, useState } from "react";
import { Schema, Errors, Values, validate } from "./validators";

export interface UseFormOptions<S extends Schema> {
  schema: S;
  initialValues: Values<S>;
  onSubmit?: (values: Values<S>) => void | Promise<void>;
}

/** Minimal shape of a change event we care about — works with React's synthetic events. */
interface ChangeLike {
  target: { name: string; value: any; type?: string; checked?: boolean };
}

export function useForm<S extends Schema>(options: UseFormOptions<S>) {
  const { schema, initialValues, onSubmit } = options;
  type V = Values<S>;

  const [values, setValues] = useState<V>(initialValues);
  // The clean baseline `isDirty` is measured against; `reset(next)` moves it.
  const [baseline, setBaseline] = useState<V>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof S, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const errors: Errors<S> = useMemo(() => validate(schema, values), [schema, values]);
  const isValid = Object.keys(errors).length === 0;
  const isDirty = useMemo(
    () => (Object.keys(schema) as (keyof V)[]).some((k) => values[k] !== baseline[k]),
    [schema, values, baseline],
  );

  const setFieldValue = useCallback(<K extends keyof V>(name: K, value: V[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setFieldTouched = useCallback((name: keyof S, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  }, []);

  const handleChange = useCallback((e: ChangeLike) => {
    const { name, value, type, checked } = e.target;
    // Coerce by input type so `v.number()`/checkbox schemas validate against real DOM inputs.
    const next =
      type === "checkbox" ? !!checked
      : type === "number" || type === "range" ? (value === "" ? "" : Number(value))
      : value;
    setValues((prev) => ({ ...prev, [name]: next }));
  }, []);

  const handleBlur = useCallback((e: { target: { name: string } }) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }, []);

  /** Spread onto an input: `<input {...getFieldProps("email")} />` (text/number/select). */
  const getFieldProps = useCallback(<K extends keyof S & string>(name: K) => ({
    name,
    value: (values[name as keyof V] ?? "") as V[keyof V],
    onChange: handleChange,
    onBlur: handleBlur,
  }), [values, handleChange, handleBlur]);

  const handleSubmit = useCallback(async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    setTouched(
      Object.keys(schema).reduce(
        (a, k) => ((a[k as keyof S] = true), a),
        {} as Partial<Record<keyof S, boolean>>,
      ),
    );
    const current = validate(schema, values);
    if (Object.keys(current).length > 0) return false;
    setSubmitting(true);
    try {
      await onSubmit?.(values);
      return true;
    } finally {
      setSubmitting(false);
    }
  }, [schema, values, onSubmit]);

  const reset = useCallback((next?: V) => {
    setValues(next ?? baseline);
    if (next) setBaseline(next);   // reset(next) makes `next` the new clean baseline
    setTouched({});
    setSubmitting(false);
  }, [baseline]);

  return {
    values, errors, touched, isValid, isDirty, submitting,
    handleChange, handleBlur, handleSubmit,
    setFieldValue, setFieldTouched, getFieldProps, reset,
  };
}
