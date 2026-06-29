# Blockchain-Based Decentralized Voting System

A complete decentralized voting system designed to enforce the "one vote per address" rule on-chain while providing a Web2-like user experience off-chain. This project features a Solidity smart contract, a Node.js/Express backend with PostgreSQL, and a React frontend.

---

## Technical Features Implemented

### 1. Database Table Auto-Initialization
- When the backend starts, it automatically connects to PostgreSQL and verifies/creates all necessary tables (`users`, `elections`, `candidates`, `voter_participations`, `votes`, `otp_tokens`, `blockchain_transactions`, `event_checkpoints`).
- If no admin exists, it seeds a default administrator user (`admin@example.com`) and derives their address from the configured `ADMIN_PRIVATE_KEY`.

### 2. Wallet Generation on Registration
- During registration, a unique Ethereum wallet is dynamically generated for the voter using `ethers.Wallet.createRandom()`.
- The user is saved off-chain using only their email and user ID. To ensure **absolute voter anonymity**, the voter's private key and wallet address are **never** stored in the database.
- Instead, the private key and address are returned to the user's browser, which stores them securely in `localStorage`.

### 3. Payment & Gas-Funding Mechanism
- When a user registers, the backend executes an on-chain transaction sending `1.0 ETH` from the admin wallet (which is funded by default in Ganache) to the voter's new wallet address.
- This funds the voter's wallet with enough gas to submit their vote directly, fulfilling the payment mechanism requirement.

### 4. 100% Voter Anonymity & Double-Vote Prevention
- To decouple the voter's identity from their vote choice, the database tracks votes in two separate tables:
  1. `voter_participations` (records only that `user_id` has voted in `election_id` to prevent double voting).
  2. `votes` (records only the anonymized transaction details and candidate counts, containing no reference to `user_id` or `wallet_address`).
- Similarly, the smart contract's events are decoupled:
  - `VoterVoted(uint256 indexed electionId, address indexed voter)` (omits candidate ID).
  - `VoteCast(uint256 indexed electionId, uint256 indexed candidateId)` (omits voter address).
- This ensures that neither the database nor the blockchain links a voter's identity to their candidate choice.

---

## Project Structure

```text
TopicA/
├── contracts/          # Hardhat project with Solidity contracts and deployment scripts
├── backend/            # Express API, PostgreSQL integration, Event Listener, JWT Auth
├── frontend/           # React Admin and Voter UI components
└── docker-compose.dev.yml # Local development orchestration (Postgres, Ganache, Backend)
```

---

## Setup and Running (Local Development)

### Prerequisites
- Node.js (v18+)
- Ganache CLI (`npm install -g ganache`)
- Hardhat (`npm install -g hardhat`)

---

### Step 1: Start Ganache (Private Blockchain)

Start a local Ganache node and pre-fund the default administrator and voter accounts:

```bash
npx ganache --server.port 8545 --wallet.accounts 0x249f947bdfe9d5d1e063d9b5f29277a8f81618087ee554732c81db6dd2100efd,1000000000000000000000 0x65ecdf42cbf966992adfc3c85d9a026eb08b6b8ce77014c2a7c4aa438ae12e1c,1000000000000000000000
```

---

### Step 2: Deploy the Smart Contract

From the `contracts/` directory:

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network ganache
```

This compiles and deploys the contract to the local Ganache node. It generates the ABI and contract metadata into `contracts/deployments/ganache.json` which the backend reads.

---

### Step 3: Start the Backend

From the `backend/` directory:

```bash
cd backend
npm install
npm run dev
```

On startup, the backend will:
1. Initialize the PostgreSQL schema automatically.
2. Seed the default admin user (`admin@example.com`).
3. **Print a valid Admin JWT login token** to the console.
4. Start listening to smart contract events.

*(Make sure your local PostgreSQL database is running and credentials in `backend/.env` align with your local setup).*

---

### Step 4: Start the Frontend

From the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` to access the application.

---

## Usage Guide

### Admin Portal
1. Open the UI, select **Admin Portal**.
2. **Login**: Copy the generated **Admin JWT Token** printed in the backend console logs and paste it into the JWT token textarea.
3. **Create Election**: Set up an election with a name, start/end dates, and add candidates.
4. **Start Election**: Click the "Start Last Election" button to active it on the blockchain.
5. **Results Panel**: Input the election ID to view real-time candidate percentages and voting statistics.

### Voter Portal
1. Open the UI, select **Voter Portal**.
2. **Register**: Click "Register & Get Wallet" and enter your email address. The backend will generate a new wallet, fund it with gas, and save it in your browser.
3. **Login**: Request an OTP code. Retrieve it from the backend console logs and submit to authenticate.
4. **Vote**: View active elections, select your candidate of choice, and submit your vote. The transaction is signed and broadcast securely with your local wallet key.
