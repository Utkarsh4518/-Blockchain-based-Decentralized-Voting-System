import { Request, Response, NextFunction } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Basic error logging
  // eslint-disable-next-line no-console
  console.error(err);

  const status = 400;
  const message =
    typeof err?.message === "string" ? err.message : "Unexpected error";

  res.status(status).json({
    error: "BAD_REQUEST",
    message,
  });
};

