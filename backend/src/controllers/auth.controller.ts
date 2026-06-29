import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ethers } from "ethers";
import { userRepository } from "../repositories/user.repository";
import { otpRepository } from "../repositories/otp.repository";
import { electionRepository } from "../repositories/election.repository";
import { voteRepository } from "../repositories/vote.repository";
import { blockchainService } from "../services/blockchain.service";
import { signToken } from "../utils/jwt";

const OTP_EXP_MINUTES = 5;

/**
 * Handles voter registration.
 * Creates a unique on-chain wallet for the voter (authorized on contract),
 * and inserts the user record in the DB anonymously, including public_key for passkeys.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, publicKey } = req.body;
    if (typeof email !== "string" || email.length === 0) {
      return res.status(400).json({ error: "INVALID_EMAIL" });
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "EMAIL_ALREADY_REGISTERED" });
    }

    // 1) Generate a new random Ethereum wallet for the voter
    const wallet = ethers.Wallet.createRandom();

    // 2) Register this new wallet address as an eligible voter on-chain.
    // The transaction is sent and sponsored by the Admin wallet.
    const registerTxHash = await blockchainService.registerVoter(wallet.address);

    // 3) Create user in database. Storing publicKey if provided (for Passkeys).
    const user = await userRepository.createUser(
      email,
      null,
      "VOTER",
      publicKey || null
    );

    // 4) Return the generated wallet's privateKey and address back to the user
    return res.status(201).json({
      message: "Voter registered successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      wallet: {
        address: wallet.address,
        privateKey: wallet.privateKey,
      },
      registerTxHash,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Requests an OTP token via email.
 */
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
      return res.json({ message: "OTP generated if user exists" });
    }

    // Enforce double voting check
    const activeElections = await electionRepository.findActiveElections();
    if (activeElections.length > 0) {
      let alreadyVotedAllActive = true;
      for (const election of activeElections) {
        const hasVoted = await voteRepository.hasUserVoted(election.id, user.id);
        if (!hasVoted) {
          alreadyVotedAllActive = false;
          break;
        }
      }
      if (alreadyVotedAllActive) {
        return res.status(403).json({ error: "ALREADY_VOTED", message: "You have already voted in the active election." });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    await otpRepository.createToken(user.id, codeHash, expiresAt);

    // eslint-disable-next-line no-console
    console.log(`[OTP] For user ${email}: ${otp}`);

    return res.json({ message: "OTP generated if user exists" });
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies OTP and returns a JWT access token.
 */
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

    const activeElections = await electionRepository.findActiveElections();
    if (activeElections.length > 0) {
      let alreadyVotedAllActive = true;
      for (const election of activeElections) {
        const hasVoted = await voteRepository.hasUserVoted(election.id, user.id);
        if (!hasVoted) {
          alreadyVotedAllActive = false;
          break;
        }
      }
      if (alreadyVotedAllActive) {
        return res.status(403).json({ error: "ALREADY_VOTED", message: "You have already voted in the active election." });
      }
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

/**
 * Generates a Web Crypto challenge.
 */
export const requestChallenge = async (
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
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (!user.publicKey) {
      return res.status(400).json({ error: "PASSKEY_NOT_REGISTERED" });
    }

    // Double voting checks
    const activeElections = await electionRepository.findActiveElections();
    if (activeElections.length > 0) {
      let alreadyVotedAllActive = true;
      for (const election of activeElections) {
        const hasVoted = await voteRepository.hasUserVoted(election.id, user.id);
        if (!hasVoted) {
          alreadyVotedAllActive = false;
          break;
        }
      }
      if (alreadyVotedAllActive) {
        return res.status(403).json({ error: "ALREADY_VOTED", message: "You have already voted in the active election." });
      }
    }

    const challenge = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    // Save the plaintext challenge in the database
    await otpRepository.createToken(user.id, challenge, expiresAt);

    return res.json({ challenge });
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies Web Crypto challenge signature.
 */
export const verifyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, signature } = req.body;
    if (
      typeof email !== "string" ||
      typeof signature !== "string" ||
      signature.length === 0
    ) {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.publicKey) {
      return res.status(401).json({ error: "PASSKEY_NOT_REGISTERED" });
    }

    const tokenRecord = await otpRepository.findActiveTokenByUser(user.id);
    if (!tokenRecord) {
      return res.status(401).json({ error: "CHALLENGE_INVALID_OR_EXPIRED" });
    }

    // Cryptographic verification
    try {
      const publicKeyObj = crypto.createPublicKey({
        key: JSON.parse(user.publicKey),
        format: "jwk",
      });

      const isVerified = crypto.verify(
        "sha256",
        Buffer.from(tokenRecord.codeHash),
        publicKeyObj,
        Buffer.from(signature, "hex")
      );

      if (!isVerified) {
        return res.status(401).json({ error: "PASSKEY_VERIFICATION_FAILED" });
      }
    } catch (err) {
      return res.status(400).json({ error: "INVALID_SIGNATURE_FORMAT" });
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
