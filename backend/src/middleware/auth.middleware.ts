import { Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories/user.repository";
import { User } from "../models/user.model";
import { verifyToken } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const requireUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("authorization") || req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "UNAUTHENTICATED" });
    }
    const token = authHeader.substring("Bearer ".length).trim();

    const payload = verifyToken(token);
    const user = await userRepository.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "USER_NOT_FOUND" });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await requireUser(req, res, async (err?: any) => {
    if (err) return next(err);
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN_ADMIN_ONLY" });
    }
    return next();
  });
};

export const requireVoter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await requireUser(req, res, async (err?: any) => {
    if (err) return next(err);
    if (!req.user || req.user.role !== "VOTER") {
      return res.status(403).json({ error: "FORBIDDEN_VOTER_ONLY" });
    }
    return next();
  });
};


