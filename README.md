# Blockchain-Based Decentralized Voting System

A complete decentralized voting system designed to enforce the "one vote per address" rule on-chain while providing a Web2-like user experience off-chain. This project features a Solidity smart contract, a Node.js/Express backend with PostgreSQL, and a React frontend, all containerized for easy deployment.

## System Architecture

The project consists of three main components:

1. **Smart Contract (`/contracts`)**: 
   - A Solidty contract (`Voting.sol`) that acts as the ultimate source of truth.
   - Manages multiple elections, candidates, and enforces single voting.
   - Emits events on all state changes (`ElectionCreated`, `VoteCast`, etc.).
2. **Backend (`/backend`)**:
   - Node.js + Express with TypeScript.
   - PostgreSQL database acting as a fast projection layer for the blockchain data.
   - Event-driven listener that synchronizes the database with blockchain events using block checkpoints.
   - Handles voter OTP (One-Time Password) issuance and verification, issuing JWTs.
   - Enforces wallet-binding to ensure the authenticated user matches the voting wallet.
3. **Frontend (`/frontend`)**:
   - React + Vite + TypeScript.
   - Separate portals for **Admins** (create/start elections, view live off-chain aggregated percentage results) and **Voters** (OTP login, view active elections, cast votes).
   - Minimal and clean UI without requiring MetaMask for the end-user.

## Project Structure

```text
TopicA/
├── contracts/          # Hardhat project with Solidity contracts and deployment scripts
├── backend/            # Express API, PostgreSQL integration, Event Listener, JWT Auth
├── frontend/           # React Admin and Voter UI components
└── docker-compose.dev.yml # Local development orchestration (Postgres, Ganache, Backend)
```

## Features Implemented

- **Smart Contract Governance**: Only the deployer (Admin) can create and start elections.
- **Voter Authentication**: OTP via email -> JWT verification.
- **Eventual Consistency**: The backend listens to Ethereum events and updates a relational database so the frontend can query rich data quickly without hitting the RPC node.
- **Off-chain Aggregation**: Complex queries (like vote percentages) are calculated in the frontend based on fast PostgreSQL reads.
- **Wallet Binding**: Transactions are signed securely by the backend using a wallet bound to the voter's identity, preventing hijackers from forging votes.
- **Double-Vote Prevention**: Enforced at the smart contract level using a `mapping(uint256 => mapping(address => bool)) _hasVoted`.

## Setup and Running (Local Development)

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- Hardhat (`npm install -g hardhat`)

### 1. Start Infrastructure (Ganache & PostgreSQL)

The provided Docker Compose file sets up a local Ganache node and a PostgreSQL instance.

```bash
docker compose -f docker-compose.dev.yml up -d postgres ganache
```

### 2. Deploy Smart Contract

From the `contracts/` directory:

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network ganache
```

This compiles the contract and deploys it to the Ganache container. It automatically extracts the ABI and Contract Address into `contracts/deployments/ganache.json`, which the backend will read.

### 3. Start the Backend

The backend will automatically synchronize past events and start listening to the Ganache node. Make sure your `.env` is setup in `/backend` (an `.env.example` is typically provided) with connection strings aligning with the docker network if running fully inside docker, or localhost if running `dev` locally. 

**Running backend locally (connecting to dockerized Ganache/Postgres):**
```bash
cd backend
npm install
npm run dev
```

### 4. Start the Frontend

From the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` to access the application.

## Usage Guide

### Admin Flow
1. Open the UI and select "Admin Portal".
2. Create a new Election by providing a name, start/end times, and candidates.
3. Once created, click "Start Last Election" to make it `ACTIVE` on the blockchain.
4. Using the **Results Panel**, enter the newly created Election ID to monitor live calculated percentages.

### Voter Flow
1. Open the UI and select "Voter Portal".
2. Enter your pre-seeded email to request an OTP. (Check the backend console for the printout).
3. Verify the OTP to log in.
4. The dashboard will display all Active elections. Select one to view candidate details.
5. Choose a candidate and cast your vote. You will receive a transaction hash upon success.
