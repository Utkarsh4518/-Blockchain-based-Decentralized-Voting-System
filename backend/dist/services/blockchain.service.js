"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainService = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const contract_1 = require("../config/contract");
dotenv_1.default.config();
class BlockchainService {
    constructor() {
        const rpcUrl = process.env.ETH_RPC_URL || "http://127.0.0.1:8545";
        const adminPk = process.env.ADMIN_PRIVATE_KEY;
        const voterPk = process.env.VOTER_PRIVATE_KEY;
        if (!adminPk) {
            throw new Error("ADMIN_PRIVATE_KEY is not set");
        }
        if (!voterPk) {
            throw new Error("VOTER_PRIVATE_KEY is not set");
        }
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.adminWallet = new ethers_1.ethers.Wallet(adminPk, this.provider);
        this.voterWallet = new ethers_1.ethers.Wallet(voterPk, this.provider);
        const { address, abi } = (0, contract_1.loadContractConfig)();
        this.contract = new ethers_1.ethers.Contract(address, abi, this.provider);
    }
    getVoterAddress() {
        return this.voterWallet.address;
    }
    async getElection(electionId) {
        try {
            const [name, startTime, endTime, state, totalVotes, candidateIds,] = await this.contract.getElection(electionId);
            return {
                id: electionId,
                name,
                startTime: Number(startTime),
                endTime: Number(endTime),
                state,
                totalVotes: Number(totalVotes),
                candidateIds: candidateIds.map((c) => Number(c)),
            };
        }
        catch (err) {
            this.handleEthersError(err);
        }
    }
    async createElection(name, startTime, endTime, candidateIds) {
        try {
            const signer = this.contract.connect(this.adminWallet);
            const tx = await signer.createElection(name, BigInt(startTime), BigInt(endTime), candidateIds);
            const receipt = await tx.wait(1);
            if (!receipt) {
                throw new Error("No receipt returned");
            }
            const event = receipt.logs
                .map((log) => {
                try {
                    return this.contract.interface.parseLog(log);
                }
                catch {
                    return null;
                }
            })
                .find((parsed) => parsed && parsed.name === "ElectionCreated");
            if (!event) {
                throw new Error("ElectionCreated event not found in receipt");
            }
            const electionId = event.args.electionId;
            return Number(electionId);
        }
        catch (err) {
            this.handleEthersError(err);
        }
    }
    async startElection(electionId) {
        try {
            const signer = this.contract.connect(this.adminWallet);
            const tx = await signer.startElection(electionId);
            await tx.wait(1);
        }
        catch (err) {
            this.handleEthersError(err);
        }
    }
    async vote(electionId, candidateId) {
        try {
            const signer = this.contract.connect(this.voterWallet);
            const tx = await signer.vote(electionId, candidateId);
            const receipt = await tx.wait(1);
            if (!receipt) {
                throw new Error("No receipt returned");
            }
            const blockNumber = Number(receipt.blockNumber ?? 0n);
            return { txHash: tx.hash, blockNumber };
        }
        catch (err) {
            this.handleEthersError(err);
        }
    }
    // eslint-disable-next-line class-methods-use-this
    handleEthersError(err) {
        if (err?.error?.message) {
            throw new Error(err.error.message);
        }
        if (err?.reason) {
            throw new Error(err.reason);
        }
        if (err?.message) {
            throw new Error(err.message);
        }
        throw err;
    }
}
exports.blockchainService = new BlockchainService();
