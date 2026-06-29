import { ethers } from "ethers";
import dotenv from "dotenv";
import { loadContractConfig } from "../config/contract";

dotenv.config();

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private adminWallet: ethers.Wallet;
  private voterWallet: ethers.Wallet;
  private contract: ethers.Contract;

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

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.adminWallet = new ethers.Wallet(adminPk, this.provider);
    this.voterWallet = new ethers.Wallet(voterPk, this.provider);

    const { address, abi } = loadContractConfig();
    this.contract = new ethers.Contract(address, abi, this.provider);
  }

  getVoterAddress(): string {
    return this.voterWallet.address;
  }

  async getElection(electionId: number) {
    try {
      const [
        name,
        startTime,
        endTime,
        state,
        totalVotes,
        candidateIds,
      ] = await this.contract.getElection(electionId);

      return {
        id: electionId,
        name,
        startTime: Number(startTime),
        endTime: Number(endTime),
        state,
        totalVotes: Number(totalVotes),
        candidateIds: candidateIds.map((c: bigint) => Number(c)),
      };
    } catch (err: any) {
      this.handleEthersError(err);
    }
  }

  async createElection(
    name: string,
    startTime: number,
    endTime: number,
    candidateIds: number[]
  ): Promise<number> {
    try {
      const signer: any = this.contract.connect(this.adminWallet);
      const tx = await signer.createElection(
        name,
        BigInt(startTime),
        BigInt(endTime),
        candidateIds
      );
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw new Error("No receipt returned");
      }

      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed && parsed.name === "ElectionCreated");

      if (!event) {
        throw new Error("ElectionCreated event not found in receipt");
      }

      const electionId: bigint = event.args.electionId;
      return Number(electionId);
    } catch (err: any) {
      this.handleEthersError(err);
    }
  }

  async startElection(electionId: number): Promise<void> {
    try {
      const signer: any = this.contract.connect(this.adminWallet);
      const tx = await signer.startElection(electionId);
      await tx.wait(1);
    } catch (err: any) {
      this.handleEthersError(err);
    }
  }

  async vote(
    electionId: number,
    candidateId: number
  ): Promise<{ txHash: string; blockNumber: number }> {
    try {
      const signer: any = this.contract.connect(this.voterWallet);
      const tx = await signer.vote(electionId, candidateId);
      const receipt = await tx.wait(1);
      if (!receipt) {
        throw new Error("No receipt returned");
      }
      const blockNumber = Number(receipt.blockNumber ?? 0n);
      return { txHash: tx.hash, blockNumber };
    } catch (err: any) {
      this.handleEthersError(err);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private handleEthersError(err: any): never {
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

export const blockchainService = new BlockchainService();


