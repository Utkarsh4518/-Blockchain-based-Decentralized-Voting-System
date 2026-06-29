export type ElectionStatus = "CREATED" | "ACTIVE" | "ENDED" | "CANCELLED";

export interface Election {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  status: ElectionStatus;
  onchainElectionId: number | null;
  createdAt: Date;
  isQuadratic: boolean;
  voterBudget: number;
}

