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
