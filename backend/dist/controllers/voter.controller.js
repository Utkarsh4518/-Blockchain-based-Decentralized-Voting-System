"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.castVote = exports.getElection = exports.getElections = void 0;
const blockchain_service_1 = require("../services/blockchain.service");
const election_repository_1 = require("../repositories/election.repository");
const vote_repository_1 = require("../repositories/vote.repository");
const getElections = async (req, res, next) => {
    try {
        const activeElections = await election_repository_1.electionRepository.findActiveElections();
        return res.status(200).json(activeElections);
    }
    catch (err) {
        next(err);
    }
};
exports.getElections = getElections;
const getElection = async (req, res, next) => {
    try {
        const onchainElectionId = Number(req.params.id);
        if (Number.isNaN(onchainElectionId)) {
            return res.status(400).json({ error: "INVALID_ELECTION_ID" });
        }
        const election = await blockchain_service_1.blockchainService.getElection(onchainElectionId);
        return res.status(200).json(election);
    }
    catch (err) {
        next(err);
    }
};
exports.getElection = getElection;
const castVote = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "UNAUTHENTICATED" });
        }
        // Ensure the wallet bound to the authenticated user matches
        // the wallet used in blockchainService for voting.
        const voterWalletAddress = blockchain_service_1.blockchainService.getVoterAddress();
        if (!user.walletAddress ||
            user.walletAddress.toLowerCase() !== voterWalletAddress.toLowerCase()) {
            return res.status(403).json({
                error: "WALLET_MISMATCH",
                message: "Authenticated user wallet does not match the configured voter wallet.",
            });
        }
        const onchainElectionId = Number(req.params.id);
        const { candidateId } = req.body;
        if (Number.isNaN(onchainElectionId) || typeof candidateId !== "number") {
            return res.status(400).json({ error: "INVALID_PAYLOAD" });
        }
        const election = await election_repository_1.electionRepository.findByOnchainId(onchainElectionId);
        if (!election) {
            return res.status(404).json({ error: "ELECTION_NOT_FOUND" });
        }
        const alreadyVoted = await vote_repository_1.voteRepository.hasUserVoted(election.id, user.id);
        if (alreadyVoted) {
            return res.status(403).json({ error: "ALREADY_VOTED" });
        }
        const { txHash, blockNumber } = await blockchain_service_1.blockchainService.vote(onchainElectionId, candidateId);
        await vote_repository_1.voteRepository.insertVote({
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
    }
    catch (err) {
        next(err);
    }
};
exports.castVote = castVote;
