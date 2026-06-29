import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
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
 * Creates a unique on-chain wallet for the voter, funds it with 1.0 ETH,
 * and inserts the user record in the DB anonymously (excluding the private key and wallet address).
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || email.length === 0) {
      return res.status(400).json({ error: "INVALID_EMAIL" });
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "EMAIL_ALREADY_REGISTERED" });
    }

    // 1) Generate a new random Ethereum wallet for the voter
    const wallet = ethers.Wallet.createRandom();

    // 2) Fund this new wallet on-chain from the admin wallet (which starts with 1000 ETH in Ganache)
    // This serves as the payment/gas funding mechanism.
    const fundingTxHash = await blockchainService.fundVoterWallet(wallet.address, "1.0");

    // 3) Create user in database. Note that we DO NOT store their private key or wallet address off-chain
    // to preserve 100% database anonymity and prevent mapping emails to on-chain addresses.
    const user = await userRepository.createUser(email, null, "VOTER");

    // 4) Return the generated wallet's privateKey and address back to the user
    // so they can store it in their frontend local storage.
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
      fundingTxHash,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Requests an OTP token via email.
 * Rejects the request if the voter has already voted in all currently active elections.
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
      // Do not leak which emails exist
      return res.json({ message: "OTP generated if user exists" });
    }

    // Enforce double voting check on login request
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

    // For now, log OTP to console
    // eslint-disable-next-line no-console
    console.log(`[OTP] For user ${email}: ${otp}`);

    return res.json({ message: "OTP generated if user exists" });
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies OTP and returns a JWT access token.
 * Rejects if the voter has already voted in the active election.
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

    // Enforce double voting check on OTP verification
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
