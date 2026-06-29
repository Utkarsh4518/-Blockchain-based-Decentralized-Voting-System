import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);
  const balance = await deployer.provider!.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(deployer.address);
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log("Voting deployed to:", address);

  const net = await deployer.provider!.getNetwork();
  const chainId = Number(net.chainId);
  console.log("Network:", network.name, "Chain ID:", chainId);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let fileName = "local.json";
  if (network.name === "ganache" || chainId === 1337) {
    fileName = "ganache.json";
  } else if (network.name === "gcp") {
    fileName = "gcp.json";
  } else if (network.name === "localhost" || chainId === 31337) {
    fileName = "local.json";
  }

  const outPath = path.join(deploymentsDir, fileName);

  const artifact = await artifacts.readArtifact("Voting");

  const data = {
    address,
    chainId,
    abi: artifact.abi,
  };

  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), {
    encoding: "utf8",
  });

  console.log(`Deployment info written to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

