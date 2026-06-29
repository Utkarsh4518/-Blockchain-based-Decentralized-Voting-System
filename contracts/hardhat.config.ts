import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const GANACHE_RPC_URL =
  process.env.GANACHE_RPC_URL || "http://127.0.0.1:8545";
const GCP_RPC_URL = process.env.GCP_RPC_URL || "https://your-gcp-node-url";

const accounts =
  PRIVATE_KEY !== ""
    ? [PRIVATE_KEY]
    : {
      mnemonic:
        "test test test test test test test test test test test junk",
    };

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ganache: {
      url: GANACHE_RPC_URL,
      accounts: Array.isArray(accounts) ? (accounts as string[]) : accounts,
    },
    gcp: {
      url: GCP_RPC_URL,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

