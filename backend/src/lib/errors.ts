// Error shape. Source: specs/00-foundation/api-conventions.md
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function toErrorBody(err: AppError) {
  return { error: { code: err.code, message: err.message } };
}

// validateProductInput (lib/products.ts) throws plain Error, not AppError —
// it has no business knowing it's running inside an HTTP request. Routes
// that call it wrap the result with this before passing to next(), so a
// bad-input error becomes a 400 instead of falling through to
// errorHandler's generic 500.
export function asValidationError(err: unknown): unknown {
  return err instanceof Error && !(err instanceof AppError) ? new AppError(400, 'INVALID_PRODUCT', err.message) : err;
}
