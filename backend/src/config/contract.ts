import * as fs from "fs";
import * as path from "path";

export interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

let cachedConfig: ContractConfig | null = null;

export const loadContractConfig = (): ContractConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const network =
    process.env.CONTRACT_NETWORK && process.env.CONTRACT_NETWORK.length > 0
      ? process.env.CONTRACT_NETWORK
      : "local";

  const filename = `${network}.json`;

  const deploymentsPath = path.join(
    __dirname,
    "..",
    "..",
    "contracts",
    "deployments",
    filename
  );

  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(
      `Contract deployment file not found for network "${network}". Expected at: ${deploymentsPath}. ` +
        `Please deploy the contract with Hardhat and ensure deployments/${filename} exists.`
    );
  }

  const raw = fs.readFileSync(deploymentsPath, "utf-8");
  const data = JSON.parse(raw);

  if (!data.address || !data.abi) {
    throw new Error(
      `Invalid deployment file format for network "${network}" at ${deploymentsPath}.`
    );
  }

  cachedConfig = {
    address: data.address,
    abi: data.abi,
    chainId: data.chainId,
  };

  return cachedConfig;
};


