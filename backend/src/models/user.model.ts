export type UserRole = "ADMIN" | "VOTER";

export interface User {
  id: string;
  email: string;
  walletAddress: string;
  role: UserRole;
  createdAt: Date;
}

