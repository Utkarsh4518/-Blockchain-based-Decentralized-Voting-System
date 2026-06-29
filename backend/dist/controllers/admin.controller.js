"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startElection = exports.createElection = void 0;
const election_repository_1 = require("../repositories/election.repository");
const candidate_repository_1 = require("../repositories/candidate.repository");
const blockchain_service_1 = require("../services/blockchain.service");
const createElection = async (req, res, next) => {
    try {
        const { name, startTime, endTime, candidates } = req.body;
        if (typeof name !== "string" ||
            !Array.isArray(candidates) ||
            typeof startTime !== "number" ||
            typeof endTime !== "number") {
            return res.status(400).json({ error: "INVALID_PAYLOAD" });
        }
        const start = new Date(startTime * 1000);
        const end = new Date(endTime * 1000);
        // 1) Store election off-chain
        const election = await election_repository_1.electionRepository.createElection(name, start, end);
        // 2) Store candidates off-chain
        const candidateIds = candidates.map((c) => c.id);
        await candidate_repository_1.candidateRepository.bulkInsert(election.id, candidates.map((c) => ({
            candidateId: c.id,
            name: c.name,
            description: c.description,
        })));
        // 3) Create on-chain election
        const onchainId = await blockchain_service_1.blockchainService.createElection(name, startTime, endTime, candidateIds);
        // 4) Link DB to on-chain election
        await election_repository_1.electionRepository.linkOnchainElection(election.id, onchainId);
        return res
            .status(201)
            .json({ id: election.id, onchainElectionId: onchainId });
    }
    catch (err) {
        next(err);
    }
};
exports.createElection = createElection;
const startElection = async (req, res, next) => {
    try {
        const onchainElectionId = Number(req.params.id);
        if (Number.isNaN(onchainElectionId)) {
            return res.status(400).json({ error: "INVALID_ELECTION_ID" });
        }
        await blockchain_service_1.blockchainService.startElection(onchainElectionId);
        return res
            .status(200)
            .json({ onchainElectionId, status: "started" });
    }
    catch (err) {
        next(err);
    }
};
exports.startElection = startElection;
