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
  const { values, errors, touched, isValid, handleChange, handleBlur, handleSubmit } =
    useForm({
      schema,
      initialValues: { email: "", password: "", age: undefined },
      onSubmit: (values) => api.signup(values), // `values` is fully typed
    });

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={values.email} onChange={handleChange} onBlur={handleBlur} />
      {touched.email && errors.email && <span>{errors.email}</span>}
      <button disabled={!isValid}>Sign up</button>
    </form>
  );
}
```

## Why

- **Inference** — `values` and `errors` types are derived from your schema; rename a field and TypeScript catches every usage.
- **Composable validators** — `v.string().min(3).max(20).pattern(/^[a-z]+$/)`, `v.number().refine(fn, msg)`, `.optional()`.
- **Batteries-included hook** — `handleChange` / `handleBlur` / `handleSubmit`, `touched`, `isValid`, `submitting`, `reset`, `setFieldValue`.
- **Tiny** — no dependencies beyond React; ~2KB.

## API

| Validator | Modifiers |
|-----------|-----------|
| `v.string()` | `.min` `.max` `.email` `.pattern` `.refine` `.optional` |
| `v.number()` | `.min` `.max` `.refine` `.optional` |
| `v.boolean()` | `.refine` `.optional` |

`validate(schema, values)` is also exported for use outside React.

## Development

```bash
npm install
npm test    # 11 tests (vitest + @testing-library/react)
npm run build
```

## License

MIT
