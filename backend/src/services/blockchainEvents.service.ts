import { ethers } from "ethers";
import dotenv from "dotenv";
import { loadContractConfig } from "../config/contract";
import { electionRepository } from "../repositories/election.repository";
import { voteRepository } from "../repositories/vote.repository";
import { blockchainTxRepository } from "../repositories/blockchainTx.repository";
import { eventCheckpointRepository } from "../repositories/eventCheckpoint.repository";

dotenv.config();

class BlockchainEventListener {
  private provider: ethers.JsonRpcProvider;

  private contract: ethers.Contract;

  private started = false;

  constructor() {
    const rpcUrl = process.env.ETH_RPC_URL || "http://127.0.0.1:8545";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const { address, abi } = loadContractConfig();
    this.contract = new ethers.Contract(address, abi, this.provider);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    // eslint-disable-next-line no-console
    console.log("[Events] Starting blockchain event listener...");

    await this.replayPastEvents();
    this.subscribeToLiveEvents();
  }

  private async replayPastEvents(): Promise<void> {
    const lastProcessed = await eventCheckpointRepository.getLastProcessedBlock();
    const latestBlock = Number(await this.provider.getBlockNumber());

    if (latestBlock <= lastProcessed) {
      // eslint-disable-next-line no-console
      console.log(
        `[Events] No past events to replay. lastProcessed=${lastProcessed}, latest=${latestBlock}`
      );
      return;
    }

    const fromBlock = lastProcessed === 0 ? 0 : lastProcessed + 1;

    // eslint-disable-next-line no-console
    console.log(
      `[Events] Replaying events from block ${fromBlock} to ${latestBlock}...`
    );

    const filters = [
      this.contract.filters.ElectionCreated(),
      this.contract.filters.ElectionStarted(),
      this.contract.filters.ElectionEnded(),
      this.contract.filters.VoteCast(),
    ];

    for (const filter of filters) {
      const logs = await this.contract.queryFilter(
        filter,
        fromBlock,
        latestBlock
      );
      // eslint-disable-next-line no-console
      console.log(
        `[Events] Replaying ${logs.length} events for filter`
      );
      // eslint-disable-next-line no-await-in-loop
      for (const log of logs) {
        const parsed = this.contract.interface.parseLog(log);
        if (!parsed) continue;
        const blockNumber = Number(log.blockNumber);
        const txHash = log.transactionHash;
        // eslint-disable-next-line no-await-in-loop
        await this.handleEvent(parsed.name, parsed.args, txHash, blockNumber);
        // update checkpoint conservatively as we move forward
        // eslint-disable-next-line no-await-in-loop
        await eventCheckpointRepository.setLastProcessedBlock(blockNumber);
      }
    }

    // eslint-disable-next-line no-console
    console.log("[Events] Replay completed.");
  }

  private subscribeToLiveEvents(): void {
    // eslint-disable-next-line no-console
    console.log("[Events] Subscribing to live contract events...");

    this.contract.on(
      "ElectionCreated",
      async (
        electionId: bigint,
        name: string,
        startTime: bigint,
        endTime: bigint,
        candidateIds: bigint[],
        event: any
      ) => {
        const blockNumber = Number(event.log.blockNumber);
        const txHash = event.log.transactionHash;
        await this.handleEvent(
          "ElectionCreated",
          { electionId, name, startTime, endTime, candidateIds },
          txHash,
          blockNumber
        );
        await eventCheckpointRepository.setLastProcessedBlock(blockNumber);
      }
    );

    this.contract.on(
      "ElectionStarted",
      async (electionId: bigint, event: any) => {
        const blockNumber = Number(event.log.blockNumber);
        const txHash = event.log.transactionHash;
        await this.handleEvent(
          "ElectionStarted",
          { electionId },
          txHash,
          blockNumber
        );
        await eventCheckpointRepository.setLastProcessedBlock(blockNumber);
      }
    );

    this.contract.on(
      "ElectionEnded",
      async (electionId: bigint, event: any) => {
        const blockNumber = Number(event.log.blockNumber);
        const txHash = event.log.transactionHash;
        await this.handleEvent(
          "ElectionEnded",
          { electionId },
          txHash,
          blockNumber
        );
        await eventCheckpointRepository.setLastProcessedBlock(blockNumber);
      }
    );

    this.contract.on(
      "VoteCast",
      async (
        electionId: bigint,
        candidateId: bigint,
        event
      ) => {
        const blockNumber = Number(event.log.blockNumber);
        const txHash = event.log.transactionHash;
        await this.handleEvent(
          "VoteCast",
          { electionId, candidateId },
          txHash,
          blockNumber
        );
        await eventCheckpointRepository.setLastProcessedBlock(blockNumber);
      }
    );
  }

  private async handleEvent(
    eventName: string,
    args: any,
    txHash: string,
    blockNumber: number
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[Events] Handling ${eventName} @ block ${blockNumber} tx ${txHash}`
    );

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
      await blockchainTxRepository.updateStatus(
        txHash,
        "CONFIRMED",
        null,
        blockNumber
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[Events] Error handling ${eventName} @ block ${blockNumber} tx ${txHash}:`,
        err
      );
    }
  }

  private async handleElectionCreated(args: any, _txHash: string) {
    const electionId = Number(args.electionId as bigint);
    const name = args.name as string;
    const startTime = Number(args.startTime as bigint);
    const endTime = Number(args.endTime as bigint);

    const existing = await electionRepository.findByOnchainId(electionId);
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(
        `[Events] ElectionCreated for existing onchainId=${electionId}, skipping create`
      );
      return;
    }

    const start = new Date(startTime * 1000);
    const end = new Date(endTime * 1000);
    const created = await electionRepository.createElection(name, start, end);
    await electionRepository.linkOnchainElection(created.id, electionId);

    // eslint-disable-next-line no-console
    console.log(
      `[Events] Created mirrored election id=${created.id} onchainId=${electionId}`
    );
  }

  private async handleElectionStarted(args: any) {
    const electionId = Number(args.electionId as bigint);
    const existing = await electionRepository.findByOnchainId(electionId);
    if (!existing) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Events] ElectionStarted for unknown onchainId=${electionId}`
      );
      return;
    }
    await electionRepository.updateStatus(existing.id, "ACTIVE");
  }

  private async handleElectionEnded(args: any) {
    const electionId = Number(args.electionId as bigint);
    const existing = await electionRepository.findByOnchainId(electionId);
    if (!existing) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Events] ElectionEnded for unknown onchainId=${electionId}`
      );
      return;
    }
    await electionRepository.updateStatus(existing.id, "ENDED");
  }

  private async handleVoteCast(
    args: any,
    txHash: string,
    blockNumber: number
  ) {
    const electionId = Number(args.electionId as bigint);
    const candidateId = Number(args.candidateId as bigint);

    const txExists = await voteRepository.hasVoteTxBeenRecorded(txHash);
    if (txExists) {
      // eslint-disable-next-line no-console
      console.log(
        `[Events] VoteCast already recorded for tx=${txHash}, skipping`
      );
      return;
    }

    const election = await electionRepository.findByOnchainId(electionId);
    if (!election) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Events] VoteCast for unknown election onchainId=${electionId}`
      );
      return;
    }

    await voteRepository.insertVote({
      electionId: election.id,
      candidateId,
      txHash,
      blockNumber,
    });
  }
}

export const blockchainEventListener = new BlockchainEventListener();

