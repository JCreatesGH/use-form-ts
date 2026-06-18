# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0]

### Added
- **Cross-field validation.** A new `validate(values)` option returns a `{ field: message }`
  map for rules the per-field schema can't express (password confirmation, date ranges).
  Its errors merge over the schema results and feed `isValid` and submit blocking.
- **Manual / server errors.** `setFieldError(name, msg?)` and `setErrors(map)` surface
  server-side validation messages inline. A manual error clears automatically as soon as the
  user edits that field.
- **`getFieldError(name)`** returns the error to display — only once the field is touched or
  a submit has been attempted — so you don't hand-write `touched[x] && errors[x]`.
- **`submitCount`** tracks attempted submits (and is reset by `reset()`); after the first
  attempt all field errors become visible.
- **`aria-invalid`** is now part of `getFieldProps`, set only when a field has a visible error.

### Changed
- `errors` now reflects schema + cross-field + manual errors, in that precedence.

## [0.1.0]

- Initial release: type-safe schema validators (`v.string/number/boolean/oneOf` with
  `min/max/email/pattern/refine/optional`) and a `useForm` hook with inferred `values`/`errors`,
  `getFieldProps`, `handleChange/Blur/Submit`, `touched`, `isValid`, `isDirty`, `submitting`,
  number/checkbox coercion, and baseline-aware `reset(next?)`.
