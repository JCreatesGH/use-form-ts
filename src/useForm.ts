import { useCallback, useMemo, useState } from "react";
import { Schema, Errors, validate } from "./validators";

export interface UseFormOptions<S extends Schema> {
  schema: S;
  initialValues: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => void | Promise<void>;
}

export function useForm<S extends Schema>(options: UseFormOptions<S>) {
  const { schema, initialValues, onSubmit } = options;
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const errors: Errors<S> = useMemo(() => validate(schema, values), [schema, values]);
  const isValid = Object.keys(errors).length === 0;

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleChange = useCallback((e: { target: { name: string; value: any; type?: string; checked?: boolean } }) => {
    const { name, value, type, checked } = e.target;
    setFieldValue(name, type === "checkbox" ? !!checked : value);
  }, [setFieldValue]);

  const handleBlur = useCallback((e: { target: { name: string } }) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }, []);

  const handleSubmit = useCallback(async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    setTouched(Object.keys(schema).reduce((a, k) => ((a[k] = true), a), {} as Record<string, boolean>));
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

  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, isValid, submitting,
           handleChange, handleBlur, handleSubmit, setFieldValue, reset };
}
