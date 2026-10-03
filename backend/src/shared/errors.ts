export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = (message = "Sign in to continue") =>
  new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message: string) => new AppError(403, "FORBIDDEN", message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
