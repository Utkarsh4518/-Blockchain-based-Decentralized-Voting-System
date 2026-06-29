import { Request, Response, NextFunction } from "express";
import { blockchainService } from "../services/blockchain.service";
import { electionRepository } from "../repositories/election.repository";
import { voteRepository } from "../repositories/vote.repository";

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

    const election = await blockchainService.getElection(onchainElectionId);
    return res.status(200).json(election);
  } catch (err) {
    next(err);
  }
};

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

    // Ensure the wallet bound to the authenticated user matches
    // the wallet used in blockchainService for voting.
    const voterWalletAddress = blockchainService.getVoterAddress();
    if (
      !user.walletAddress ||
      user.walletAddress.toLowerCase() !== voterWalletAddress.toLowerCase()
    ) {
      return res.status(403).json({
        error: "WALLET_MISMATCH",
        message:
          "Authenticated user wallet does not match the configured voter wallet.",
      });
    }

    const onchainElectionId = Number(req.params.id);
    const { candidateId } = req.body;

    if (Number.isNaN(onchainElectionId) || typeof candidateId !== "number") {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    const election = await electionRepository.findByOnchainId(
      onchainElectionId
    );
    if (!election) {
      return res.status(404).json({ error: "ELECTION_NOT_FOUND" });
    }

    const alreadyVoted = await voteRepository.hasUserVoted(
      election.id,
      user.id
    );
    if (alreadyVoted) {
      return res.status(403).json({ error: "ALREADY_VOTED" });
    }

    const { txHash, blockNumber } = await blockchainService.vote(
      onchainElectionId,
      candidateId
    );

    await voteRepository.insertVote({
      electionId: election.id,
      userId: user.id,
      walletAddress: user.walletAddress,
      candidateId,
      txHash,
      blockNumber,
    });

    return res
      .status(202)
      .json({ electionId: onchainElectionId, candidateId, txHash });
  } catch (err) {
    next(err);
  }
};


