"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorMiddleware = (err, _req, res, _next) => {
    // Basic error logging
    // eslint-disable-next-line no-console
    console.error(err);
    const status = 400;
    const message = typeof err?.message === "string" ? err.message : "Unexpected error";
    res.status(status).json({
        error: "BAD_REQUEST",
        message,
    });
};
exports.errorMiddleware = errorMiddleware;
