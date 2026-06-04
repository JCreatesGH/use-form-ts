// Tiny, type-safe schema validators with full type inference.
export type ValidationResult = string | undefined; // error message or undefined

export interface Validator<T> {
  parse: (value: unknown) => ValidationResult;
  _type?: T; // phantom type for inference
  min: (n: number, msg?: string) => Validator<T>;
  max: (n: number, msg?: string) => Validator<T>;
  email: (msg?: string) => Validator<T>;
  pattern: (re: RegExp, msg?: string) => Validator<T>;
  refine: (fn: (v: T) => boolean, msg: string) => Validator<T>;
  optional: () => Validator<T | undefined>;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function build<T>(checks: Array<(v: any) => ValidationResult>): Validator<T> {
  const self: Validator<T> = {
    parse(value: unknown) {
      for (const check of checks) {
        const err = check(value);
        if (err) return err;
      }
      return undefined;
    },
    min(n, msg) {
      return build<T>([...checks, (v) =>
        (typeof v === "string" ? v.length < n : v < n)
          ? msg ?? `Must be at least ${n}` : undefined]);
    },
    max(n, msg) {
      return build<T>([...checks, (v) =>
        (typeof v === "string" ? v.length > n : v > n)
          ? msg ?? `Must be at most ${n}` : undefined]);
    },
    email(msg) {
      return build<T>([...checks, (v) =>
        typeof v === "string" && !EMAIL_RE.test(v)
          ? msg ?? "Must be a valid email" : undefined]);
    },
    pattern(re, msg) {
      return build<T>([...checks, (v) =>
        typeof v === "string" && !re.test(v)
          ? msg ?? "Invalid format" : undefined]);
    },
    refine(fn, msg) {
      return build<T>([...checks, (v) => (!fn(v) ? msg : undefined)]);
    },
    optional() {
      return build<T | undefined>([(v) =>
        v === undefined || v === "" ? undefined : self.parse(v)]);
    },
  };
  return self;
}

export const v = {
  string(msg = "Required") {
    return build<string>([(val) =>
      typeof val !== "string" || val.length === 0 ? msg : undefined]);
  },
  number(msg = "Must be a number") {
    return build<number>([(val) =>
      typeof val !== "number" || Number.isNaN(val) ? msg : undefined]);
  },
  boolean() {
    return build<boolean>([(val) =>
      typeof val !== "boolean" ? "Must be true or false" : undefined]);
  },
};

export type Schema = Record<string, Validator<any>>;
export type Values<S extends Schema> = { [K in keyof S]: S[K]["_type"] };
export type Errors<S extends Schema> = Partial<Record<keyof S, string>>;

export function validate<S extends Schema>(schema: S, values: Record<string, unknown>): Errors<S> {
  const errors: Errors<S> = {};
  for (const key in schema) {
    const err = schema[key].parse(values[key]);
    if (err) errors[key] = err;
  }
  return errors;
}
