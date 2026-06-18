# use-form-ts

[![CI](https://github.com/JCreatesGH/use-form-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/JCreatesGH/use-form-ts/actions)
[![TypeScript](https://img.shields.io/badge/types-included-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A tiny, **type-safe** form state + validation hook for React. Define a schema, get fully-inferred `values` and `errors`, no `any`. Zero runtime dependencies — a lightweight alternative to heavier form libraries when you just need validation done right.

![screenshot](assets/screenshot.png)

## Install

```bash
npm install use-form-ts
```

## Usage

```tsx
import { useForm, v } from "use-form-ts";

const schema = {
  email: v.string().email(),
  password: v.string().min(8, "At least 8 characters"),
  age: v.number().min(18).optional(),
};

function SignupForm() {
  const { getFieldProps, errors, touched, isValid, isDirty, handleSubmit } =
    useForm({
      schema,
      initialValues: { email: "", password: "", age: undefined },
      onSubmit: (values) => api.signup(values), // `values` is fully typed
    });

  return (
    <form onSubmit={handleSubmit}>
      {/* getFieldProps spreads name + value + onChange + onBlur + aria-invalid */}
      <input {...getFieldProps("email")} />
      {touched.email && errors.email && <span>{errors.email}</span>}
      <button disabled={!isValid || !isDirty}>Sign up</button>
    </form>
  );
}
```

### Cross-field validation & server errors

The per-field schema can't express rules that span fields (password confirmation, date
ranges) — pass a `validate` callback for those. And when the server rejects a submit,
`setFieldError` / `setErrors` surface that message inline; it clears automatically as soon
as the user edits the field.

```tsx
const form = useForm({
  schema: { password: v.string().min(8), confirm: v.string() },
  initialValues: { password: "", confirm: "" },
  validate: (vals) =>
    vals.password !== vals.confirm ? { confirm: "Passwords must match" } : {},
  onSubmit: async (vals) => {
    const res = await api.signup(vals);
    if (res.error === "email_taken") form.setFieldError("email", "Email already taken");
  },
});

// Show an error only once the field is touched or a submit was attempted:
<span>{form.getFieldError("confirm")}</span>
```

`values`, `errors`, `setFieldValue`, and `getFieldProps` are all inferred from `schema` — rename
a field and TypeScript flags every stale usage, and passing the wrong value type
(`setFieldValue("age", "x")`) is a compile error.

## Why

- **Real inference** — the schema drives the types of `values`, `errors`, and every setter; no `any` leaks through the hook.
- **Composable validators** — `v.string().min(3).max(20).pattern(/^[a-z]+$/)`, `v.number().refine(fn, msg)`, `v.oneOf(["a","b"])`, `.optional()`.
- **Cross-field & server errors** — a form-level `validate` for rules spanning fields, plus `setFieldError`/`setErrors` for server messages that clear themselves on edit.
- **Batteries-included hook** — `getFieldProps`, `getFieldError`, `handleChange` / `handleBlur` / `handleSubmit`, `touched`, `isValid`, `isDirty`, `submitting`, `submitCount`, `reset(next?)`, `setFieldValue`, `setFieldTouched`.
- **Real-input aware** — `handleChange` coerces `type="number"`/`"range"` to numbers and checkboxes to booleans, so `v.number()` schemas validate against actual DOM inputs.
- **Tiny** — no dependencies beyond React; ~2KB.

## API

### Validators

| Validator | Modifiers |
|-----------|-----------|
| `v.string()` | `.min` `.max` `.email` `.pattern` `.refine` `.optional` |
| `v.number()` | `.min` `.max` `.refine` `.optional` |
| `v.boolean()` | `.refine` `.optional` |
| `v.oneOf([...])` | `.refine` `.optional` |

`validate(schema, values)` is also exported for validation outside React.

### Hook return value

| Key | Type | Notes |
|-----|------|-------|
| `values` | `Values<S>` | inferred from schema |
| `errors` | `Errors<S>` | per-field messages (schema + cross-field + manual), recomputed on change |
| `touched` | `Partial<Record<keyof S, boolean>>` | set on blur / submit |
| `isValid` / `isDirty` | `boolean` | valid against schema / changed from baseline |
| `submitting` | `boolean` | true while `onSubmit` is awaiting |
| `submitCount` | `number` | how many times submit was attempted (reset by `reset()`) |
| `getFieldProps(name)` | `{ name, value, onChange, onBlur, aria-invalid }` | spread onto an input |
| `getFieldError(name)` | `string \| undefined` | the error to display — only once touched or submitted |
| `setFieldValue(name, value)` | — | type-checked against the field |
| `setFieldTouched(name, b?)` | — | mark a field touched / untouched |
| `setFieldError(name, msg?)` | — | set/clear a manual (e.g. server) error; clears on next edit |
| `setErrors(map)` | — | replace all manual errors at once (server error map) |
| `reset(next?)` | — | restore baseline, or adopt `next` as the new clean baseline |

The optional `validate(values)` option returns a `{ field: message }` map for cross-field
rules; its errors merge over the per-field schema results.

## Development

```bash
npm install
npm test    # 23 tests (vitest + @testing-library/react)
npm run build
```

## License

MIT
