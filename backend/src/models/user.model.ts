export type UserRole = "ADMIN" | "VOTER";

export interface User {
  id: string;
  email: string;
  walletAddress: string | null;
  publicKey: string | null;
  role: UserRole;
  createdAt: Date;
}

