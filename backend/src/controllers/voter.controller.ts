import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { blockchainService } from "../services/blockchain.service";
import { loadContractConfig } from "../config/contract";
import { electionRepository } from "../repositories/election.repository";
import { candidateRepository } from "../repositories/candidate.repository";
import { voteRepository } from "../repositories/vote.repository";

/**
 * Retrieves all active elections.
 */
export const getElections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const activeElections = await electionRepository.findActiveElections();
    return res.status(200).json(activeElections);
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves full election details by merging database candidate details (names/descriptions)
 * with on-chain candidate vote counts.
 */
export const getElection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const onchainElectionId = Number(req.params.id);
    if (Number.isNaN(onchainElectionId)) {
      return res.status(400).json({ error: "INVALID_ELECTION_ID" });
    }

    const onchainElection = await blockchainService.getElection(onchainElectionId);
    if (!onchainElection) {
      return res.status(404).json({ error: "ELECTION_NOT_FOUND" });
    }

    // Load candidate details off-chain from DB
    const dbElection = await electionRepository.findByOnchainId(onchainElectionId);
    let candidatesList: { id: number; name: string; voteCount: number }[] = [];

    if (dbElection) {
      const dbCandidates = await candidateRepository.findByElectionId(dbElection.id);
      
      // Fetch on-chain vote count for each candidate
      for (const cand of dbCandidates) {
        const voteCount = await blockchainService.getCandidateVoteCount(
          onchainElectionId,
          cand.candidateId
        );
        candidatesList.push({
          id: cand.candidateId,
          name: cand.name,
          voteCount,
        });
      }
    } else {
      // Fallback: If DB election not found, populate dummy names for on-chain candidate IDs
      for (const cid of onchainElection.candidateIds) {
        const voteCount = await blockchainService.getCandidateVoteCount(
          onchainElectionId,
          cid
        );
        candidatesList.push({
          id: cid,
          name: `Candidate ${cid}`,
          voteCount,
        });
      }
    }

    const { address: contractAddress } = loadContractConfig();

    return res.status(200).json({
      id: onchainElection.id,
      name: onchainElection.name,
      startTime: onchainElection.startTime,
      endTime: onchainElection.endTime,
      state: Number(onchainElection.state),
      candidates: candidatesList,
      contractAddress,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Casts a vote on-chain using ECDSA meta-transactions (gasless voting).
 * Signs the transaction off-chain on the client and passes the signature.
 * Returns a secure cryptographic receipt for vote verification (E2E-V).
 */
export const castVote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "UNAUTHENTICATED" });
    }

    const onchainElectionId = Number(req.params.id);
    const { candidateId, signature } = req.body;

    if (
      Number.isNaN(onchainElectionId) ||
      typeof candidateId !== "number" ||
      typeof signature !== "string" ||
      signature.length === 0
    ) {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    const election = await electionRepository.findByOnchainId(onchainElectionId);
    if (!election) {
      return res.status(404).json({ error: "ELECTION_NOT_FOUND" });
    }

    // 1) Verify off-chain that the voter hasn't already participated in this election
    const alreadyVoted = await voteRepository.hasUserVoted(election.id, user.id);
    if (alreadyVoted) {
      return res.status(403).json({ error: "ALREADY_VOTED" });
    }

    // 2) Record the voter participation off-chain (no link to candidate ID)
    await voteRepository.recordUserParticipation(election.id, user.id);

    // 3) Broadcast the vote on-chain using the relayer (adminWallet sponsors gas!)
    const { txHash, blockNumber } = await blockchainService.voteWithSignature(
      onchainElectionId,
      candidateId,
      signature
    );

    // 4) Insert the anonymized vote transaction into the DB
    await voteRepository.insertVote({
      electionId: election.id,
      candidateId,
      txHash,
      blockNumber,
    });

    // 5) Generate a secure cryptographic receipt key for E2E verification
    const receiptKey = crypto
      .createHash("sha256")
      .update(`${user.id}-${candidateId}-${txHash}`)
      .digest("hex");

    return res.status(202).json({
      electionId: onchainElectionId,
      candidateId,
      txHash,
      receiptKey,
    });
  } catch (err) {
    next(err);
  }
};
