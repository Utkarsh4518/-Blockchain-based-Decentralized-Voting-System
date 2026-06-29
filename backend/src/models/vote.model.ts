export interface Vote {
  id: string;
  electionId: string;
  userId: string | null;
  walletAddress: string;
  candidateId: number | null;
  txHash: string;
  blockNumber: number;
  createdAt: Date;
}

