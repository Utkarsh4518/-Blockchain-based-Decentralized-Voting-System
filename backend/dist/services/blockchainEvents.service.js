"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainEventListener = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const contract_1 = require("../config/contract");
const election_repository_1 = require("../repositories/election.repository");
const vote_repository_1 = require("../repositories/vote.repository");
const blockchainTx_repository_1 = require("../repositories/blockchainTx.repository");
const eventCheckpoint_repository_1 = require("../repositories/eventCheckpoint.repository");
dotenv_1.default.config();
class BlockchainEventListener {
    constructor() {
        this.started = false;
        const rpcUrl = process.env.ETH_RPC_URL || "http://127.0.0.1:8545";
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const { address, abi } = (0, contract_1.loadContractConfig)();
        this.contract = new ethers_1.ethers.Contract(address, abi, this.provider);
    }
    async start() {
        if (this.started)
            return;
        this.started = true;
        // eslint-disable-next-line no-console
        console.log("[Events] Starting blockchain event listener...");
        await this.replayPastEvents();
        this.subscribeToLiveEvents();
    }
    async replayPastEvents() {
        const lastProcessed = await eventCheckpoint_repository_1.eventCheckpointRepository.getLastProcessedBlock();
        const latestBlock = Number(await this.provider.getBlockNumber());
        if (latestBlock <= lastProcessed) {
            // eslint-disable-next-line no-console
            console.log(`[Events] No past events to replay. lastProcessed=${lastProcessed}, latest=${latestBlock}`);
            return;
        }
        const fromBlock = lastProcessed === 0 ? 0 : lastProcessed + 1;
        // eslint-disable-next-line no-console
        console.log(`[Events] Replaying events from block ${fromBlock} to ${latestBlock}...`);
        const filters = [
            this.contract.filters.ElectionCreated(),
            this.contract.filters.ElectionStarted(),
            this.contract.filters.ElectionEnded(),
            this.contract.filters.VoteCast(),
        ];
        for (const filter of filters) {
            const logs = await this.contract.queryFilter(filter, fromBlock, latestBlock);
            // eslint-disable-next-line no-console
            console.log(`[Events] Replaying ${logs.length} ${filter.eventName} events`);
            // eslint-disable-next-line no-await-in-loop
            for (const log of logs) {
                const parsed = this.contract.interface.parseLog(log);
                if (!parsed)
                    continue;
                const blockNumber = Number(log.blockNumber);
                const txHash = log.transactionHash;
                // eslint-disable-next-line no-await-in-loop
                await this.handleEvent(parsed.name, parsed.args, txHash, blockNumber);
                // update checkpoint conservatively as we move forward
                // eslint-disable-next-line no-await-in-loop
                await eventCheckpoint_repository_1.eventCheckpointRepository.setLastProcessedBlock(blockNumber);
            }
        }
        // eslint-disable-next-line no-console
        console.log("[Events] Replay completed.");
    }
    subscribeToLiveEvents() {
        // eslint-disable-next-line no-console
        console.log("[Events] Subscribing to live contract events...");
        this.contract.on("ElectionCreated", async (electionId, name, startTime, endTime, candidateIds, event) => {
            const blockNumber = Number(event.log.blockNumber);
            const txHash = event.log.transactionHash;
            await this.handleEvent("ElectionCreated", { electionId, name, startTime, endTime, candidateIds }, txHash, blockNumber);
            await eventCheckpoint_repository_1.eventCheckpointRepository.setLastProcessedBlock(blockNumber);
        });
        this.contract.on("ElectionStarted", async (electionId, event) => {
            const blockNumber = Number(event.log.blockNumber);
            const txHash = event.log.transactionHash;
            await this.handleEvent("ElectionStarted", { electionId }, txHash, blockNumber);
            await eventCheckpoint_repository_1.eventCheckpointRepository.setLastProcessedBlock(blockNumber);
        });
        this.contract.on("ElectionEnded", async (electionId, event) => {
            const blockNumber = Number(event.log.blockNumber);
            const txHash = event.log.transactionHash;
            await this.handleEvent("ElectionEnded", { electionId }, txHash, blockNumber);
            await eventCheckpoint_repository_1.eventCheckpointRepository.setLastProcessedBlock(blockNumber);
        });
        this.contract.on("VoteCast", async (electionId, candidateId, voter, event) => {
            const blockNumber = Number(event.log.blockNumber);
            const txHash = event.log.transactionHash;
            await this.handleEvent("VoteCast", { electionId, candidateId, voter }, txHash, blockNumber);
            await eventCheckpoint_repository_1.eventCheckpointRepository.setLastProcessedBlock(blockNumber);
        });
    }
    async handleEvent(eventName, args, txHash, blockNumber) {
        // eslint-disable-next-line no-console
        console.log(`[Events] Handling ${eventName} @ block ${blockNumber} tx ${txHash}`);
        try {
            switch (eventName) {
                case "ElectionCreated":
                    await this.handleElectionCreated(args, txHash);
                    break;
                case "ElectionStarted":
                    await this.handleElectionStarted(args);
                    break;
                case "ElectionEnded":
                    await this.handleElectionEnded(args);
                    break;
                case "VoteCast":
                    await this.handleVoteCast(args, txHash, blockNumber);
                    break;
                default:
                    // eslint-disable-next-line no-console
                    console.warn(`[Events] Unknown event: ${eventName}`);
            }
            // mark tx as confirmed if we track it
            await blockchainTx_repository_1.blockchainTxRepository.updateStatus(txHash, "CONFIRMED", null, blockNumber);
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error(`[Events] Error handling ${eventName} @ block ${blockNumber} tx ${txHash}:`, err);
        }
    }
    async handleElectionCreated(args, _txHash) {
        const electionId = Number(args.electionId);
        const name = args.name;
        const startTime = Number(args.startTime);
        const endTime = Number(args.endTime);
        const existing = await election_repository_1.electionRepository.findByOnchainId(electionId);
        if (existing) {
            // eslint-disable-next-line no-console
            console.log(`[Events] ElectionCreated for existing onchainId=${electionId}, skipping create`);
            return;
        }
        const start = new Date(startTime * 1000);
        const end = new Date(endTime * 1000);
        const created = await election_repository_1.electionRepository.createElection(name, start, end);
        await election_repository_1.electionRepository.linkOnchainElection(created.id, electionId);
        // eslint-disable-next-line no-console
        console.log(`[Events] Created mirrored election id=${created.id} onchainId=${electionId}`);
    }
    async handleElectionStarted(args) {
        const electionId = Number(args.electionId);
        const existing = await election_repository_1.electionRepository.findByOnchainId(electionId);
        if (!existing) {
            // eslint-disable-next-line no-console
            console.warn(`[Events] ElectionStarted for unknown onchainId=${electionId}`);
            return;
        }
        await election_repository_1.electionRepository.updateStatus(existing.id, "ACTIVE");
    }
    async handleElectionEnded(args) {
        const electionId = Number(args.electionId);
        const existing = await election_repository_1.electionRepository.findByOnchainId(electionId);
        if (!existing) {
            // eslint-disable-next-line no-console
            console.warn(`[Events] ElectionEnded for unknown onchainId=${electionId}`);
            return;
        }
        await election_repository_1.electionRepository.updateStatus(existing.id, "ENDED");
    }
    async handleVoteCast(args, txHash, blockNumber) {
        const electionId = Number(args.electionId);
        const candidateId = Number(args.candidateId);
        const voter = args.voter;
        const existingVote = await vote_repository_1.voteRepository.findByTxHash(txHash);
        if (existingVote) {
            // eslint-disable-next-line no-console
            console.log(`[Events] VoteCast already recorded for tx=${txHash}, skipping`);
            return;
        }
        const election = await election_repository_1.electionRepository.findByOnchainId(electionId);
        if (!election) {
            // eslint-disable-next-line no-console
            console.warn(`[Events] VoteCast for unknown election onchainId=${electionId}`);
            return;
        }
        await vote_repository_1.voteRepository.insertVote({
            electionId: election.id,
            userId: null,
            walletAddress: voter,
            candidateId,
            txHash,
            blockNumber,
        });
    }
}
exports.blockchainEventListener = new BlockchainEventListener();
