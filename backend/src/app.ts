import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRouter from "./routes/admin.routes";
import voterRouter from "./routes/voter.routes";
import authRouter from "./routes/auth.routes";
import { errorMiddleware } from "./middleware/error.middleware";

dotenv.config();

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);
  app.use("/voter", voterRouter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(errorMiddleware);

  return app;
};



