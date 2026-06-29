import { Request, Response, NextFunction } from "express";
import pool from "../config/db";
import { electionRepository } from "../repositories/election.repository";
import { candidateRepository } from "../repositories/candidate.repository";
import { blockchainService } from "../services/blockchain.service";

export const createElection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, startTime, endTime, candidates, isQuadratic, voterBudget } = req.body;

    if (
      typeof name !== "string" ||
      !Array.isArray(candidates) ||
      typeof startTime !== "number" ||
      typeof endTime !== "number"
    ) {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    const start = new Date(startTime * 1000);
    const end = new Date(endTime * 1000);

    const isQuad = !!isQuadratic;
    const budget = typeof voterBudget === "number" ? voterBudget : 16;

    // 1) Store election off-chain
    const election = await electionRepository.createElection(name, start, end, isQuad, budget);

    // 2) Store candidates off-chain
    const candidateIds = candidates.map((c: any) => c.id as number);
    await candidateRepository.bulkInsert(
      election.id,
      candidates.map((c: any) => ({
        candidateId: c.id,
        name: c.name,
        description: c.description,
      }))
    );

    // 3) Create on-chain election
    const onchainId = await blockchainService.createElection(
      name,
      startTime,
      endTime,
      candidateIds,
      isQuad,
      budget
    );

    // 4) Link DB to on-chain election
    await electionRepository.linkOnchainElection(election.id, onchainId);

    return res
      .status(201)
      .json({ id: election.id, onchainElectionId: onchainId });
  } catch (err) {
    next(err);
  }
};

export const startElection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const onchainElectionId = Number(req.params.id);
    if (Number.isNaN(onchainElectionId)) {
      return res.status(400).json({ error: "INVALID_ELECTION_ID" });
    }

    await blockchainService.startElection(onchainElectionId);
    return res
      .status(200)
      .json({ onchainElectionId, status: "started" });
  } catch (err) {
    next(err);
  }
};

export const endElection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const onchainElectionId = Number(req.params.id);
    if (Number.isNaN(onchainElectionId)) {
      return res.status(400).json({ error: "INVALID_ELECTION_ID" });
    }

    await blockchainService.endElection(onchainElectionId);
    return res
      .status(200)
      .json({ onchainElectionId, status: "ended" });
  } catch (err) {
    next(err);
  }
};

export const getAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await pool.query(
      `
      SELECT tx_hash as "txHash", block_number as "blockNumber", event_name as "eventName", event_data as "eventData", created_at as "createdAt"
      FROM blockchain_transactions
      ORDER BY block_number DESC, created_at DESC
      LIMIT 100
      `
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};


