export type BlockchainTxStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  type: string;
  electionId: string | null;
  userId: string | null;
  status: BlockchainTxStatus;
  errorMessage: string | null;
  blockNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
}

