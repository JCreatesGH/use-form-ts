import { useCallback, useMemo, useState } from "react";
import { Schema, Errors, Values, validate } from "./validators";

export interface UseFormOptions<S extends Schema> {
  schema: S;
  initialValues: Values<S>;
  onSubmit?: (values: Values<S>) => void | Promise<void>;
  /** Cross-field validation: return `{ field: message }` for errors the per-field
   *  schema can't express (password confirmation, date ranges, "at least one of"). */
  validate?: (values: Values<S>) => Partial<Record<keyof S, string | undefined>>;
}

/** Minimal shape of a change event we care about — works with React's synthetic events. */
interface ChangeLike {
  target: { name: string; value: any; type?: string; checked?: boolean };
}

function stripEmpty<S extends Schema>(e: Partial<Record<keyof S, string | undefined>>): Errors<S> {
  const out: Errors<S> = {};
  for (const k in e) {
    const msg = e[k];
    if (msg) out[k as keyof S] = msg;
  }
  return out;
}

export function useForm<S extends Schema>(options: UseFormOptions<S>) {
  const { schema, initialValues, onSubmit } = options;
  const formValidate = options.validate;
  type V = Values<S>;

  const [values, setValues] = useState<V>(initialValues);
  // The clean baseline `isDirty` is measured against; `reset(next)` moves it.
  const [baseline, setBaseline] = useState<V>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof S, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  // Manually-set errors (e.g. from the server). Merged over computed errors and
  // cleared for a field as soon as the user edits it.
  const [manualErrors, setManualErrors] = useState<Errors<S>>({});

  // One place that runs schema validation + optional cross-field validation.
  const runValidation = useCallback((vals: V): Errors<S> => {
    const base = validate(schema, vals);
    if (!formValidate) return base;
    return { ...base, ...stripEmpty<S>(formValidate(vals)) };
  }, [schema, formValidate]);

  const computedErrors = useMemo(() => runValidation(values), [runValidation, values]);
  const errors: Errors<S> = useMemo(
    () => ({ ...computedErrors, ...manualErrors }),
    [computedErrors, manualErrors],
  );
  const isValid = Object.keys(errors).length === 0;
  const isDirty = useMemo(
    () => (Object.keys(schema) as (keyof V)[]).some((k) => values[k] !== baseline[k]),
    [schema, values, baseline],
  );

  // Drop a manual error for a field once its value changes again.
  const clearManual = useCallback((name: keyof S) => {
    setManualErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setFieldValue = useCallback(<K extends keyof V>(name: K, value: V[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    clearManual(name as unknown as keyof S);
  }, [clearManual]);

  const setFieldTouched = useCallback((name: keyof S, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  }, []);

  /** Set a manual error (e.g. a server validation message). Falsy message clears it. */
  const setFieldError = useCallback((name: keyof S, message?: string) => {
    setManualErrors((prev) => {
      const next = { ...prev };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  }, []);

  /** Replace all manual errors at once (e.g. a server's per-field error map). */
  const setErrors = useCallback((next: Partial<Record<keyof S, string | undefined>>) => {
    setManualErrors(stripEmpty<S>(next));
  }, []);

  const handleChange = useCallback((e: ChangeLike) => {
    const { name, value, type, checked } = e.target;
    // Coerce by input type so `v.number()`/checkbox schemas validate against real DOM inputs.
    const next =
      type === "checkbox" ? !!checked
      : type === "number" || type === "range" ? (value === "" ? "" : Number(value))
      : value;
    setValues((prev) => ({ ...prev, [name]: next }));
    clearManual(name as keyof S);
  }, [clearManual]);

  const handleBlur = useCallback((e: { target: { name: string } }) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }, []);

  /** The error to display for a field: only once it's been touched or a submit attempted. */
  const getFieldError = useCallback((name: keyof S): string | undefined => {
    return touched[name] || submitCount > 0 ? errors[name] : undefined;
  }, [touched, submitCount, errors]);

  /** Spread onto an input: `<input {...getFieldProps("email")} />` (text/number/select). */
  const getFieldProps = useCallback(<K extends keyof S & string>(name: K) => ({
    name,
    value: (values[name as keyof V] ?? "") as V[keyof V],
    onChange: handleChange,
    onBlur: handleBlur,
    "aria-invalid": (touched[name] || submitCount > 0) && errors[name] ? true : undefined,
  }), [values, handleChange, handleBlur, touched, submitCount, errors]);

  const handleSubmit = useCallback(async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    setSubmitCount((c) => c + 1);
    setTouched(
      Object.keys(schema).reduce(
        (a, k) => ((a[k as keyof S] = true), a),
        {} as Partial<Record<keyof S, boolean>>,
      ),
    );
    const current = { ...runValidation(values), ...manualErrors };
    if (Object.keys(current).length > 0) return false;
    setSubmitting(true);
    try {
      await onSubmit?.(values);
      return true;
    } finally {
      setSubmitting(false);
    }
  }, [schema, values, onSubmit, runValidation, manualErrors]);

  const reset = useCallback((next?: V) => {
    setValues(next ?? baseline);
    if (next) setBaseline(next);   // reset(next) makes `next` the new clean baseline
    setTouched({});
    setSubmitting(false);
    setSubmitCount(0);
    setManualErrors({});
  }, [baseline]);

  return {
    values, errors, touched, isValid, isDirty, submitting, submitCount,
    handleChange, handleBlur, handleSubmit,
    setFieldValue, setFieldTouched, setFieldError, setErrors,
    getFieldProps, getFieldError, reset,
  };
}
