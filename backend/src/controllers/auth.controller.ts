import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/user.repository";
import { otpRepository } from "../repositories/otp.repository";
import { signToken } from "../utils/jwt";

const OTP_EXP_MINUTES = 5;

export const requestOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || email.length === 0) {
      return res.status(400).json({ error: "INVALID_EMAIL" });
    }

    const user = await userRepository.findByEmail(email);
    if (!user || user.role !== "VOTER") {
      // Do not leak which emails exist
      return res.json({ message: "OTP generated if user exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    await otpRepository.createToken(user.id, codeHash, expiresAt);

    // For now, log OTP to console
    // eslint-disable-next-line no-console
    console.log(`[OTP] For user ${email}: ${otp}`);

    return res.json({ message: "OTP generated if user exists" });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;
    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      otp.length === 0
    ) {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    const user = await userRepository.findByEmail(email);
    if (!user || user.role !== "VOTER") {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const tokenRecord = await otpRepository.findActiveTokenByUser(user.id);
    if (!tokenRecord) {
      return res.status(401).json({ error: "OTP_INVALID_OR_EXPIRED" });
    }

    const match = await bcrypt.compare(otp, tokenRecord.codeHash);
    if (!match) {
      return res.status(401).json({ error: "OTP_INVALID_OR_EXPIRED" });
    }

    await otpRepository.markUsed(tokenRecord.id);

    const jwt = signToken({ sub: user.id, role: user.role });

    return res.json({
      accessToken: jwt,
      tokenType: "Bearer",
      expiresIn: Number(process.env.JWT_EXPIRES_IN || 3600),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

